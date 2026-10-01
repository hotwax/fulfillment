/**
 * Items for the order ship groups in the `orders` table.
 *
 * The bucket services return order rows without items, so items come from each order's items
 * endpoint. Only orders that are new, or whose row was rewritten after their items were stored,
 * are fetched; an unchanged queue makes no item requests at all.
 */

import { unwrapCollection, workerGet } from "@common/core/workerRemoteApi";
import type { BaseDB } from "@common/db/storage/baseDb";
import { canonicalKey, diffStaleKeys, entityKeyOf, projectRows } from "@common/db/storage/projection";
import { defineSyncDomain } from "@common/db/sync/defineSyncDomain";
import type { DbKey, DbRow, SyncContext } from "@common/db/types";
import { ORDER_STAGE, fulfillmentDb, getFulfillmentDb } from "../fulfillmentDb";
import { hydrationOrder, runWithConcurrency } from "./rowSync";

export const ORDER_ITEMS_DOMAIN = "orderItems";

const ITEM_FETCH_CONCURRENCY = 6;
// Orders fetched per pass. A large first sync fills in over several ticks, and products for each
// pass load in the same tick, instead of every card waiting for the whole queue.
const ORDERS_PER_PASS = 150;
// Only approved lines are open work. Completed and cancelled lines of the same ship group aren't picked.
const OPEN_ITEM_STATUS = "ITEM_APPROVED";

const itemEntity = fulfillmentDb.entities.orderItems;

const shipGroupOf = (row: DbRow): [string, string] => [String(row.orderId), String(row.shipGroupSeqId)];

// The order row version (its syncedAt) each ship group's items were last fetched for. Stops a ship
// group whose items come back empty from being fetched again on every tick.
const fetchedForVersion = new Map<string, number>();

async function syncItemsOf(db: BaseDB, ctx: SyncContext, order: DbRow): Promise<void> {
  const shipGroup = shipGroupOf(order);
  const response = await workerGet(ctx, `oms/orders/${encodeURIComponent(shipGroup[0])}/items`, { pageSize: 250 });
  const rawItems = unwrapCollection(response, null)
    .filter((item: any) => item?.shipGroupSeqId === order.shipGroupSeqId && item?.statusId === OPEN_ITEM_STATUS);
  const fresh = projectRows(rawItems, itemEntity, Date.now());

  await db.transaction("rw", ["orders", "orderItems"], async () => {
    // The order may have left the queue while its items were in flight; don't keep orphans.
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

  async sync(ctx: SyncContext) {
    const db = getFulfillmentDb(ctx.omsInstance);
    const orders = await db.table<DbRow, DbKey>("orders").where("stage").equals(ORDER_STAGE.OPEN).toArray();
    if(!orders.length) {return 0;}

    const newestItemSync = new Map<string, number>();
    await db.table<DbRow, DbKey>("orderItems").each((item) => {
      const key = canonicalKey(shipGroupOf(item));
      newestItemSync.set(key, Math.max(newestItemSync.get(key) ?? 0, Number(item.syncedAt) || 0));
    });

    // Due: no items stored yet, or the order row was rewritten after its items were.
    const due = orders.filter((order) => {
      const key = canonicalKey(shipGroupOf(order));
      const version = Number(order.syncedAt) || 0;

      return (newestItemSync.get(key) ?? -1) < version && fetchedForVersion.get(key) !== version;
    });

    const pass = hydrationOrder(due).slice(0, ORDERS_PER_PASS);
    await runWithConcurrency(pass, ITEM_FETCH_CONCURRENCY, (order) => syncItemsOf(db, ctx, order));

    return pass.length;
  }
});
