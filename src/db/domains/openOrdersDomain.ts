// The open bucket has no updated-since filter, so each pass re-reads it and prunes what the server no longer returns.

import { pageAll } from "@common/core/workerRemoteApi";
import type { BaseDB } from "@common/db/storage/baseDb";
import { diffStaleKeys, entityKeyOf, isUnkeyableFetch, projectRows } from "@common/db/storage/projection";
import { defineSyncDomain } from "@common/db/sync/defineSyncDomain";
import type { DbKey, DbRow, SyncContext } from "@common/db/types";
import { ORDER_STAGE, fulfillmentDb, getFulfillmentDb, orderKeyOf } from "../fulfillmentDb";
import { changedRows } from "./rowSync";

export const OPEN_ORDERS_DOMAIN = "ordersOpen";

// Store pickup and POS-completed orders are fulfilled in other apps; the Open page has always excluded them.
const EXCLUDED_SHIPMENT_METHODS = "STOREPICKUP,POS_COMPLETED";

const orderEntity = fulfillmentDb.entities.orders;

function fetchOpenOrders(ctx: SyncContext, facilityIds: string[]): Promise<any[]> {
  return pageAll({
    ctx,
    url: "oms/orders/salesOrders/open",
    collectionKey: "orders",
    params: {
      facilityId: facilityIds.join(","),
      facilityId_op: "in",
      shipmentMethodTypeId: EXCLUDED_SHIPMENT_METHODS,
      shipmentMethodTypeId_op: "in",
      shipmentMethodTypeId_not: "Y",
      orderByField: "orderDate"
    },
    batchSize: 250,
    // A short read would prune orders that are still open, so a truncated walk fails the pass instead.
    requireComplete: true,
    keyOf: (record) => orderKeyOf(record?.orderId, record?.shipGroupSeqId),
    label: OPEN_ORDERS_DOMAIN
  });
}

async function masterFacilityIds(db: BaseDB): Promise<string[]> {
  return (await db.table("userFacilities").toCollection().primaryKeys()).map(String);
}

function replaceOpenRows(db: BaseDB, rawRows: any[]): Promise<number> {
  if(isUnkeyableFetch(rawRows, orderEntity)) {
    console.warn(`[db] ${OPEN_ORDERS_DOMAIN}: fetched ${rawRows.length} orders but none could be keyed. Leaving the table unchanged.`);

    return Promise.resolve(0);
  }
  const fresh = projectRows(rawRows.map((raw) => ({ ...raw, stage: ORDER_STAGE.OPEN })), orderEntity, Date.now());
  const keyOf = (row: DbRow) => entityKeyOf(row, orderEntity) as DbKey;

  return db.transaction("rw", ["orders", "orderItems"], async () => {
    const existing = await db.table<DbRow, DbKey>("orders").where("stage").equals(ORDER_STAGE.OPEN).toArray();

    const staleKeys = diffStaleKeys(existing.map(keyOf), fresh.map(keyOf));
    if(staleKeys.length) {
      await db.table("orders").bulkDelete(staleKeys);
      await db.table("orderItems").where("[orderId+shipGroupSeqId]").anyOf(staleKeys as any[]).delete();
    }

    const changed = changedRows(fresh, existing, orderEntity);
    if(changed.length) {await db.table("orders").bulkPut(changed);}

    return changed.length;
  });
}

export const openOrdersDomain = defineSyncDomain({
  name: OPEN_ORDERS_DOMAIN,
  label: "Open orders",
  syncClass: "A",
  table: "orders",

  async sync(ctx: SyncContext) {
    const db = getFulfillmentDb(ctx.omsInstance);
    const facilityIds = await masterFacilityIds(db);
    // Without a master list there is nothing to scope the prune by, so leave the table alone.
    if(!facilityIds.length) {return 0;}

    return replaceOpenRows(db, await fetchOpenOrders(ctx, facilityIds));
  }
});
