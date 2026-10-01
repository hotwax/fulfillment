/**
 * Class A domain: the open-orders bucket for every facility in the master list.
 *
 * A bounded snapshot, like accxui's shopifyPendingFulfillment domain: each pass re-reads the
 * bucket, prunes the open rows the server no longer returns and writes only rows that changed.
 * The bucket service has no updated-since filter, so there is no cursor to keep.
 */

import type { BaseDB } from "@common/db/baseDb";
import { diffStaleKeys, isUnkeyableFetch, projectRows } from "@common/db/projection";
import { registerSyncDomain } from "@common/db/sync/syncRegistry";
import { pageAll } from "@common/db/sync/workerFetch";
import type { DbRow, SyncContext } from "@common/db/types";
import { ORDER_STAGE, orderProjection } from "../fulfillmentDb";
import { changedRows } from "./rowSync";

export const OPEN_ORDERS_DOMAIN = "ordersOpen";

// Store pickup and POS-completed orders are fulfilled in other apps; the Open page has always excluded them.
const EXCLUDED_SHIPMENT_METHODS = "STOREPICKUP,POS_COMPLETED";

function fetchOpenOrders(ctx: SyncContext, filters: Record<string, unknown>): Promise<any[]> {
  return pageAll({
    ctx,
    url: "oms/orders/salesOrders/open",
    collectionKey: "orders",
    params: {
      ...filters,
      shipmentMethodTypeId: EXCLUDED_SHIPMENT_METHODS,
      shipmentMethodTypeId_op: "in",
      shipmentMethodTypeId_not: "Y",
      orderByField: "orderDate"
    },
    batchSize: 250,
    keyOf: (record) => orderProjection.buildKey?.(record)
  });
}

async function masterFacilityIds(db: BaseDB): Promise<string[]> {
  return (await db.table("userFacilities").toCollection().primaryKeys()).map(String);
}

/**
 * Make the open rows that match `inScope` equal the fetched set: delete the ones the server no
 * longer returns (with their items) and write only the rows that are new or changed.
 */
async function replaceOpenRows(db: BaseDB, rawRows: any[], now: number, inScope: (row: DbRow) => boolean): Promise<void> {
  if(rawRows.length && isUnkeyableFetch(rawRows, orderProjection)) {
    console.warn(`[db] ${OPEN_ORDERS_DOMAIN}: fetched ${rawRows.length} orders but none could be keyed. Leaving the table unchanged.`);

    return;
  }
  const fresh = projectRows(rawRows.map((raw) => ({ ...raw, stage: ORDER_STAGE.OPEN })), orderProjection, now);

  await db.transaction("rw", ["orders", "orderItems"], async () => {
    const existing = await db.table<DbRow, string>("orders").where("stage").equals(ORDER_STAGE.OPEN).filter(inScope).toArray();
    const existingByKey = new Map(existing.map((row) => [String(row.orderKey), row]));

    const staleKeys = diffStaleKeys([...existingByKey.keys()], fresh.map((row) => String(row.orderKey)));
    if(staleKeys.length) {
      await db.table("orders").bulkDelete(staleKeys);
      await db.table("orderItems").where("orderKey").anyOf(staleKeys).delete();
    }

    const changed = changedRows(fresh, existingByKey, "orderKey");
    if(changed.length) {await db.table("orders").bulkPut(changed);}
  });
}

export function registerOpenOrdersDomain(getDb: (omsInstance: string) => BaseDB): void {
  registerSyncDomain({
    name: OPEN_ORDERS_DOMAIN,

    async sync(ctx: SyncContext) {
      const db = getDb(ctx.omsInstance);
      const facilityIds = await masterFacilityIds(db);
      // Without a master list there is nothing to scope the prune by, so leave the table alone.
      if(!facilityIds.length) {return;}

      const rawRows = await fetchOpenOrders(ctx, { facilityId: facilityIds.join(","), facilityId_op: "in" });
      await replaceOpenRows(db, rawRows, ctx.now, () => true);
    },

    // After an action on one order: re-read just that order and settle its open rows.
    async refetchOne(pk: Record<string, unknown>, ctx: SyncContext) {
      const orderId = pk?.orderId ? String(pk.orderId) : "";
      if(!orderId) {return;}
      const db = getDb(ctx.omsInstance);
      const facilityIds = await masterFacilityIds(db);
      if(!facilityIds.length) {return;}

      const rawRows = await fetchOpenOrders(ctx, { orderId, facilityId: facilityIds.join(","), facilityId_op: "in" });
      await replaceOpenRows(db, rawRows, ctx.now, (row) => row.orderId === orderId);
    }
  });
}
