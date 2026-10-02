import { commonDomains } from "@common/db/seed/seedDomains";
import type { ActiveDomain } from "@common/db/sync/syncRegistry";
import type { SyncDomain } from "@common/db/types";
import { OPEN_ORDERS_DOMAIN, openOrdersDomain } from "./openOrdersDomain";
import { ORDER_ITEMS_DOMAIN, orderItemsDomain } from "./orderItemsDomain";
import { PRODUCTS_DOMAIN, productsDomain } from "./productsDomain";

export { OPEN_ORDERS_DOMAIN, ORDER_ITEMS_DOMAIN };

const LIVE_ORDERS_INTERVAL_MS = 15_000;

export const FULFILLMENT_SYNC_DOMAINS: SyncDomain[] = [commonDomains.shipmentMethodType, openOrdersDomain, orderItemsDomain, productsDomain];

// In tick order: items follow orders, products follow items. The facility on screen gets its items first.
export const liveOrderDomains = (facilityId?: string): ActiveDomain[] => [
  { name: OPEN_ORDERS_DOMAIN, intervalMs: LIVE_ORDERS_INTERVAL_MS },
  { name: ORDER_ITEMS_DOMAIN, intervalMs: LIVE_ORDERS_INTERVAL_MS, args: { facilityId } },
  { name: PRODUCTS_DOMAIN, intervalMs: LIVE_ORDERS_INTERVAL_MS }
];
