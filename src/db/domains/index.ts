import { commonDomains } from "@common/db/seed/seedDomains";
import type { ActiveDomain } from "@common/db/sync/syncRegistry";
import type { SyncDomain } from "@common/db/types";
import { OPEN_ORDERS_DOMAIN, openOrdersDomain } from "./openOrdersDomain";
import { ORDER_ITEMS_DOMAIN, forgetItemFetches, orderItemsDomain } from "./orderItemsDomain";
import { PRODUCTS_DOMAIN, forgetProductQueries, productsDomain } from "./productsDomain";

export { OPEN_ORDERS_DOMAIN, ORDER_ITEMS_DOMAIN, PRODUCTS_DOMAIN };

export const LIVE_ORDERS_INTERVAL_MS = 15_000;

export const FULFILLMENT_SYNC_DOMAINS: SyncDomain[] = [commonDomains.shipmentMethodType, openOrdersDomain, orderItemsDomain, productsDomain];

// In tick order: items follow orders, products follow items.
export const LIVE_ORDER_DOMAINS: ActiveDomain[] = [OPEN_ORDERS_DOMAIN, ORDER_ITEMS_DOMAIN, PRODUCTS_DOMAIN]
  .map((name) => ({ name, intervalMs: LIVE_ORDERS_INTERVAL_MS }));

// The tables are cleared when the sync stops, so the next login must not skip rows it no longer has.
export function resetLiveOrderDomains(): void {
  forgetItemFetches();
  forgetProductQueries();
}
