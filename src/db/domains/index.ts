import { commonDomains } from "@common/db/domain/commonDomains";
import type { ActiveDomain } from "@common/db/sync/syncRegistry";
import type { SyncDomain } from "@common/db/types";
import { OPEN_ORDERS_DOMAIN, openOrdersDomain } from "./openOrdersDomain";
import { ORDER_ITEMS_DOMAIN, orderItemsDomain } from "./orderItemsDomain";
import { PICKERS_DOMAIN, pickersDomain } from "./pickersDomain";
import { PICKLISTS_DOMAIN, picklistsDomain } from "./picklistsDomain";
import { PRODUCTS_DOMAIN, productsDomain } from "./productsDomain";
import { SHIPMENTS_DOMAIN, shipmentsDomain } from "./shipmentsDomain";
import { TRANSFER_ORDERS_DOMAIN, transferOrdersDomain } from "./transferOrdersDomain";

export { OPEN_ORDERS_DOMAIN, ORDER_ITEMS_DOMAIN, PICKERS_DOMAIN, PICKLISTS_DOMAIN, PRODUCTS_DOMAIN, SHIPMENTS_DOMAIN, TRANSFER_ORDERS_DOMAIN };
export { LIVE_ORDERS_CHANNEL } from "./productsDomain";

const LIVE_ORDERS_INTERVAL_MS = 15_000;
// Who can pick changes rarely.
const PICKERS_INTERVAL_MS = 5 * 60 * 1000;

export const FULFILLMENT_SYNC_DOMAINS: SyncDomain[] = [commonDomains.shipmentMethodType, openOrdersDomain, orderItemsDomain, shipmentsDomain, picklistsDomain, pickersDomain, transferOrdersDomain, productsDomain];

// In tick order: items follow orders, products follow items. The facility on screen gets a pass of its own for
// both first, so its cards are complete before the rest of the queue's items are fetched.
// The open orders pass reads the user's facilities from its args, since the worker can't read the store. The facility on
// screen also gets its in progress and packed shipments and their picklists, ahead of the products they reference.
export const liveOrderDomains = (facilityId?: string, facilityIds: string[] = [], productStoreId?: string): ActiveDomain[] => [
  { name: OPEN_ORDERS_DOMAIN, intervalMs: LIVE_ORDERS_INTERVAL_MS, args: { facilityIds } },
  ...(facilityId
    ? [
      { name: SHIPMENTS_DOMAIN, intervalMs: LIVE_ORDERS_INTERVAL_MS, args: { facilityId, productStoreId } },
      { name: PICKLISTS_DOMAIN, intervalMs: LIVE_ORDERS_INTERVAL_MS, args: { facilityId, productStoreId } },
      { name: TRANSFER_ORDERS_DOMAIN, intervalMs: LIVE_ORDERS_INTERVAL_MS, args: { facilityId } },
      { name: ORDER_ITEMS_DOMAIN, intervalMs: LIVE_ORDERS_INTERVAL_MS, args: { facilityId, only: true } },
      { name: PRODUCTS_DOMAIN, intervalMs: LIVE_ORDERS_INTERVAL_MS, args: { facilityId } }
    ]
    : []),
  { name: ORDER_ITEMS_DOMAIN, intervalMs: LIVE_ORDERS_INTERVAL_MS, args: { facilityId } },
  { name: PRODUCTS_DOMAIN, intervalMs: LIVE_ORDERS_INTERVAL_MS },
  { name: PICKERS_DOMAIN, intervalMs: PICKERS_INTERVAL_MS }
];
