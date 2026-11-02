// The facility's transfer orders, open (approved, with items still to fulfil) and completed (shipped). A transfer order can
// be in both lists, so a row is keyed by its stage as well as its id. The list APIs have no updated-since filter, so each
// pass re-reads both lists and prunes what the server no longer returns.

import { pageAll } from "@common/core/workerRemoteApi";
import { diffStaleKeys, entityKeyOf, projectRows } from "@common/db/storage/projection";
import { defineSyncDomain } from "@common/db/sync/defineSyncDomain";
import type { DbKey, DbRow, SyncContext } from "@common/db/types";
import { fulfillmentDb, getFulfillmentDb } from "../fulfillmentDb";
import { changedRows } from "./rowSync";

export const TRANSFER_ORDERS_DOMAIN = "transferOrders";

export const TRANSFER_ORDER_STAGE = {
  OPEN: "open",
  COMPLETED: "completed"
} as const;

const transferOrderEntity = fulfillmentDb.entities.transferOrders;
const BATCH_SIZE = 100;
// A facility with more than this many shipped transfer orders shows the newest of them.
const MAX_PAGES = 3;
const FIELDS = "orderId,orderName,orderExternalId,orderStatusId,orderStatusDesc,facilityId,orderFacilityId,orderDate";

interface TransferOrdersArgs {
  facilityId?: string;
}

async function fetchStage(ctx: SyncContext, facilityId: string, stage: string): Promise<{ orders: any[]; complete: boolean }> {
  const open = stage === TRANSFER_ORDER_STAGE.OPEN;
  const orders = await pageAll({
    ctx,
    url: open ? "oms/transferOrders/" : "poorti/transferShipments/orders/",
    collectionKey: "orders",
    params: {
      originFacilityId: facilityId,
      fieldsToSelect: FIELDS,
      ...(open ? { orderStatusId: "ORDER_APPROVED", itemStatusId: "ITEM_PENDING_FULFILL" } : { shipmentStatusId: "SHIPMENT_SHIPPED" })
    },
    batchSize: BATCH_SIZE,
    maxPages: MAX_PAGES,
    keyOf: (record) => record?.orderId,
    label: `${TRANSFER_ORDERS_DOMAIN}:${stage}`
  });

  return { orders, complete: orders.length < BATCH_SIZE * MAX_PAGES };
}

export function toTransferOrderRaw(order: any, stage: string, facilityId: string) {
  return {
    orderId: order.orderId,
    stage,
    facilityId,
    orderName: order.orderName,
    orderDate: order.orderDate,
    shippedDate: order.shipmentShippedDate,
    // The order as the API returned it, handed to the detail page as it was.
    order
  };
}

export const transferOrdersDomain = defineSyncDomain({
  name: TRANSFER_ORDERS_DOMAIN,
  label: "Transfer orders",
  syncClass: "A",
  table: "transferOrders",

  async sync(ctx: SyncContext, args: TransferOrdersArgs = {}) {
    if(!args.facilityId) {return 0;}
    const facilityId = args.facilityId;
    const db = getFulfillmentDb(ctx.omsInstance);
    const [open, completed] = await Promise.all([fetchStage(ctx, facilityId, TRANSFER_ORDER_STAGE.OPEN), fetchStage(ctx, facilityId, TRANSFER_ORDER_STAGE.COMPLETED)]);
    const fresh = projectRows([
      ...open.orders.map((order) => toTransferOrderRaw(order, TRANSFER_ORDER_STAGE.OPEN, facilityId)),
      ...completed.orders.map((order) => toTransferOrderRaw(order, TRANSFER_ORDER_STAGE.COMPLETED, facilityId))
    ], transferOrderEntity, Date.now());
    const keyOf = (row: DbRow) => entityKeyOf(row, transferOrderEntity) as DbKey;
    // A shipped list cut short must not prune the shipped transfer orders beyond the cut.
    const prunable = (row: DbRow) => row.stage === TRANSFER_ORDER_STAGE.OPEN || completed.complete;

    return db.transaction("rw", ["transferOrders"], async () => {
      const existing = await db.table<DbRow, DbKey>("transferOrders").where("facilityId").equals(facilityId).toArray();
      const staleKeys = diffStaleKeys(existing.filter(prunable).map(keyOf), fresh.map(keyOf));
      if(staleKeys.length) {await db.table("transferOrders").bulkDelete(staleKeys);}
      const changed = changedRows(fresh, existing, transferOrderEntity);
      if(changed.length) {await db.table("transferOrders").bulkPut(changed);}

      return changed.length;
    });
  }
});
