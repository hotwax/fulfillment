// The picklists behind the facility's in progress shipments, with their pickers, for the filter chips on the In Progress page.

import { pageAll } from "@common/core/workerRemoteApi";
import type { BaseDB } from "@common/db/storage/baseDb";
import { diffStaleKeys, entityKeyOf, projectRows } from "@common/db/storage/projection";
import { defineSyncDomain } from "@common/db/sync/defineSyncDomain";
import type { DbKey, DbRow, SyncContext } from "@common/db/types";
import { fulfillmentDb, getFulfillmentDb } from "../fulfillmentDb";
import { changedRows } from "./rowSync";

export const PICKLISTS_DOMAIN = "picklists";

const picklistEntity = fulfillmentDb.entities.picklists;
const PICKLIST_BATCH_SIZE = 50;

interface PicklistsArgs {
  facilityId?: string;
  productStoreId?: string;
}

function fetchPicklistShipments(ctx: SyncContext, args: PicklistsArgs): Promise<any[]> {
  return pageAll({
    ctx,
    url: "poorti/shipmentPicklists",
    collectionKey: null,
    params: {
      originFacilityId: args.facilityId,
      statusId: "SHIPMENT_APPROVED",
      // Store pickup orders are picked in the BOPIS app.
      shipmentMethodTypeId: "STOREPICKUP",
      shipmentMethodTypeId_op: "equals",
      shipmentMethodTypeId_not: "Y"
    },
    batchSize: PICKLIST_BATCH_SIZE,
    requireComplete: true,
    keyOf: (record) => record?.shipmentId,
    label: PICKLISTS_DOMAIN
  });
}

// One picklist per id, from the shipments of approved orders in the product store.
export function picklistsOf(shipments: any[], facilityId: string, productStoreId?: string) {
  const picklists = new Map<string, any>();
  for(const shipment of shipments) {
    if(shipment?.order?.statusId !== "ORDER_APPROVED") {continue;}
    if(productStoreId && shipment?.order?.productStoreId !== productStoreId) {continue;}
    for(const picklistShipment of shipment?.picklistShipment ?? []) {
      if(!picklistShipment?.picklistId || picklists.has(picklistShipment.picklistId)) {continue;}
      picklists.set(picklistShipment.picklistId, {
        picklistId: picklistShipment.picklistId,
        facilityId,
        picklistDate: picklistShipment.picklist?.picklistDate,
        roles: picklistShipment.picklist?.roles ?? []
      });
    }
  }

  return [...picklists.values()];
}

function replaceFacilityRows(db: BaseDB, facilityId: string, rawRows: any[]): Promise<number> {
  const fresh = projectRows(rawRows, picklistEntity, Date.now());
  const keyOf = (row: DbRow) => entityKeyOf(row, picklistEntity) as DbKey;

  return db.transaction("rw", ["picklists"], async () => {
    const existing = await db.table<DbRow, DbKey>("picklists").where("facilityId").equals(facilityId).toArray();

    const staleKeys = diffStaleKeys(existing.map(keyOf), fresh.map(keyOf));
    if(staleKeys.length) {await db.table("picklists").bulkDelete(staleKeys);}

    const changed = changedRows(fresh, existing, picklistEntity);
    if(changed.length) {await db.table("picklists").bulkPut(changed);}

    return changed.length;
  });
}

export const picklistsDomain = defineSyncDomain({
  name: PICKLISTS_DOMAIN,
  label: "Picklists",
  syncClass: "A",
  table: "picklists",

  async sync(ctx: SyncContext, args: PicklistsArgs = {}) {
    if(!args.facilityId) {return 0;}
    const db = getFulfillmentDb(ctx.omsInstance);
    const shipments = await fetchPicklistShipments(ctx, args);

    return replaceFacilityRows(db, args.facilityId, picklistsOf(shipments, args.facilityId, args.productStoreId));
  }
});
