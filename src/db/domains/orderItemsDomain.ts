// The open bucket returns orders without items, so items come from each order's items endpoint,
// fetched only for orders that are new or whose row was rewritten after their items were stored.

import { unwrapCollection, workerGet } from "@common/core/workerRemoteApi";
import type { BaseDB } from "@common/db/storage/baseDb";
import { canonicalKey, diffStaleKeys, entityKeyOf, projectRows } from "@common/db/storage/projection";
import { defineSyncDomain } from "@common/db/sync/defineSyncDomain";
import type { DbKey, DbRow, SyncContext } from "@common/db/types";
import { ORDER_STAGE, fulfillmentDb, getFulfillmentDb } from "../fulfillmentDb";
import { hydrationOrder, runWithConcurrency } from "./rowSync";

export const ORDER_ITEMS_DOMAIN = "orderItems";

const ITEM_FETCH_CONCURRENCY = 6;
// A large first sync fills in over several ticks instead of every card waiting for the whole queue.
const ORDERS_PER_PASS = 150;
const OPEN_ITEM_STATUS = "ITEM_APPROVED";

const itemEntity = fulfillmentDb.entities.orderItems;

const shipGroupOf = (row: DbRow): [string, string] => [String(row.orderId), String(row.shipGroupSeqId)];

// The order row version each ship group's items were fetched for, so empty results aren't refetched every tick.
const fetchedForVersion = new Map<string, number>();

async function syncItemsOf(db: BaseDB, ctx: SyncContext, order: DbRow): Promise<void> {
  const shipGroup = shipGroupOf(order);
  const response = await workerGet(ctx, `oms/orders/${encodeURIComponent(shipGroup[0])}/items`, { pageSize: 250 });
  const rawItems = unwrapCollection(response, null)
    .filter((item: any) => item?.shipGroupSeqId === order.shipGroupSeqId && item?.statusId === OPEN_ITEM_STATUS);
  const fresh = projectRows(rawItems, itemEntity, Date.now());

  await db.transaction("rw", ["orders", "orderItems"], async () => {
    // The order may have left the queue while its items were in flight.
    if(!(await db.table("orders").get(shipGroup))) {return;}
    const existingKeys = await db.table<DbRow, DbKey>("orderItems").where("[orderId+shipGroupSeqId]").equals(shipGroup).primaryKeys();
    const staleKeys = diffStaleKeys(existingKeys, fresh.map((row) => entityKeyOf(row, itemEntity) as DbKey));
    if(staleKeys.length) {await db.table("orderItems").bulkDelete(staleKeys);}
    if(fresh.length) {await db.table("orderItems").bulkPut(fresh);}
  });
  fetchedForVersion.set(canonicalKey(shipGroup), Number(order.syncedAt) || 0);
}

export const orderItemsDomain = defineSyncDomain({
  name: ORDER_ITEMS_DOMAIN,
  label: "Order items",
  syncClass: "A",
  table: "orderItems",

  // With `only`, just the facility's own orders, uncapped, so its pass ends with every one of them done.
  async sync(ctx: SyncContext, args: { facilityId?: string; only?: boolean } = {}) {
    const db = getFulfillmentDb(ctx.omsInstance);
    const orders = await db.table<DbRow, DbKey>("orders").where("stage").equals(ORDER_STAGE.OPEN).toArray();
    if(!orders.length) {return 0;}

    const newestItemSync = new Map<string, number>();
    await db.table<DbRow, DbKey>("orderItems").each((item) => {
      const key = canonicalKey(shipGroupOf(item));
      newestItemSync.set(key, Math.max(newestItemSync.get(key) ?? 0, Number(item.syncedAt) || 0));
    });

    const due = orders.filter((order) => {
      if(args.only && order.facilityId !== args.facilityId) {return false;}
      const key = canonicalKey(shipGroupOf(order));
      const version = Number(order.syncedAt) || 0;

      return (newestItemSync.get(key) ?? -1) < version && fetchedForVersion.get(key) !== version;
    });

    const ordered = hydrationOrder(due, args.facilityId);
    const pass = args.only ? ordered : ordered.slice(0, ORDERS_PER_PASS);
    await runWithConcurrency(pass, ITEM_FETCH_CONCURRENCY, (order) => syncItemsOf(db, ctx, order));

    return pass.length;
  }
});
