// The facility's in progress and packed shipments. The shipments API has no updated-since filter, so each pass re-reads both
// stages and prunes what the server no longer returns, as the open orders domain does.

import { pageAll } from "@common/core/workerRemoteApi";
import type { BaseDB } from "@common/db/storage/baseDb";
import { diffStaleKeys, entityKeyOf, isUnkeyableFetch, projectRows } from "@common/db/storage/projection";
import { defineSyncDomain } from "@common/db/sync/defineSyncDomain";
import type { DbKey, DbRow, SyncContext } from "@common/db/types";
import { SHIPMENT_STAGE, fulfillmentDb, getFulfillmentDb } from "../fulfillmentDb";
import { changedRows } from "./rowSync";

export const SHIPMENTS_DOMAIN = "shipments";

const shipmentEntity = fulfillmentDb.entities.shipments;
const SHIPMENT_BATCH_SIZE = 100;

interface ShipmentsArgs {
  facilityId?: string;
  productStoreId?: string;
}

// What each stage asks the API for: approved shipments of approved orders, and packed shipments.
const STAGE_FILTERS: Record<string, Record<string, unknown>> = {
  [SHIPMENT_STAGE.IN_PROGRESS]: { statusId: "SHIPMENT_APPROVED", orderStatusId: "ORDER_APPROVED" },
  [SHIPMENT_STAGE.COMPLETED]: { statusId: "SHIPMENT_PACKED" }
};

function fetchStage(ctx: SyncContext, args: ShipmentsArgs, stage: string): Promise<any[]> {
  return pageAll({
    ctx,
    url: "poorti/shipments",
    collectionKey: "shipments",
    params: {
      shipmentTypeId: "SALES_SHIPMENT",
      orderBy: "orderDate",
      originFacilityId: args.facilityId,
      ...(args.productStoreId ? { productStoreId: args.productStoreId } : {}),
      ...STAGE_FILTERS[stage]
    },
    batchSize: SHIPMENT_BATCH_SIZE,
    // A short read would prune shipments that are still there, so a truncated walk fails the pass instead.
    requireComplete: true,
    keyOf: (record) => record?.shipmentId,
    label: `${SHIPMENTS_DOMAIN}:${stage}`
  });
}

export function toShipmentRaw(shipment: any, stage: string, facilityId: string) {
  return {
    shipmentId: shipment.shipmentId,
    orderId: shipment.orderId,
    stage,
    facilityId: shipment.originFacilityId || facilityId,
    picklistId: shipment.picklistId,
    statusId: shipment.statusId,
    productStoreId: shipment.productStoreId,
    orderDate: shipment.orderDate,
    shipment
  };
}

function replaceFacilityRows(db: BaseDB, facilityId: string, rawRows: any[]): Promise<number> {
  if(isUnkeyableFetch(rawRows, shipmentEntity)) {
    console.warn(`[db] ${SHIPMENTS_DOMAIN}: fetched ${rawRows.length} shipments but none could be keyed. Leaving the table unchanged.`);

    return Promise.resolve(0);
  }
  const fresh = projectRows(rawRows, shipmentEntity, Date.now());
  const keyOf = (row: DbRow) => entityKeyOf(row, shipmentEntity) as DbKey;

  return db.transaction("rw", ["shipments"], async () => {
    const existing = await db.table<DbRow, DbKey>("shipments").where("facilityId").equals(facilityId).toArray();

    const staleKeys = diffStaleKeys(existing.map(keyOf), fresh.map(keyOf));
    if(staleKeys.length) {await db.table("shipments").bulkDelete(staleKeys);}

    const changed = changedRows(fresh, existing, shipmentEntity);
    if(changed.length) {await db.table("shipments").bulkPut(changed);}

    return changed.length;
  });
}

export const shipmentsDomain = defineSyncDomain({
  name: SHIPMENTS_DOMAIN,
  label: "Shipments",
  syncClass: "A",
  table: "shipments",

  async sync(ctx: SyncContext, args: ShipmentsArgs = {}) {
    // Without a facility there is nothing to scope the prune by, so leave the table alone.
    if(!args.facilityId) {return 0;}
    const db = getFulfillmentDb(ctx.omsInstance);
    const [inProgress, completed] = await Promise.all([
      fetchStage(ctx, args, SHIPMENT_STAGE.IN_PROGRESS),
      fetchStage(ctx, args, SHIPMENT_STAGE.COMPLETED)
    ]);
    const facilityId = args.facilityId;
    const rows = [
      ...inProgress.map((shipment) => toShipmentRaw(shipment, SHIPMENT_STAGE.IN_PROGRESS, facilityId)),
      ...completed.map((shipment) => toShipmentRaw(shipment, SHIPMENT_STAGE.COMPLETED, facilityId))
    ];

    return replaceFacilityRows(db, facilityId, rows);
  }
});
