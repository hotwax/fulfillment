import { commonDomains } from "@common/db/seed/seedDomains";
import type { ActiveDomain } from "@common/db/sync/syncRegistry";
import type { SyncDomain } from "@common/db/types";
import { OPEN_ORDERS_DOMAIN, openOrdersDomain } from "./openOrdersDomain";
import { ORDER_ITEMS_DOMAIN, forgetItemFetches, orderItemsDomain } from "./orderItemsDomain";
import { PRODUCTS_DOMAIN, forgetProductQueries, productsDomain } from "./productsDomain";

export { OPEN_ORDERS_DOMAIN, ORDER_ITEMS_DOMAIN, PRODUCTS_DOMAIN };

/** The cadence of the live Open list. */
export const LIVE_ORDERS_INTERVAL_MS = 15_000;

/**
 * Every domain the fulfillment sync runs: the shared shipment method types the Open filters label
 * (class B, synced once per login) and the live order domains (class A).
 */
export const FULFILLMENT_SYNC_DOMAINS: SyncDomain[] = [commonDomains.shipmentMethodType, openOrdersDomain, orderItemsDomain, productsDomain];

/** The live order domains, as the activation the Open list needs, in tick order: items follow orders, products follow items. */
export const LIVE_ORDER_DOMAINS: ActiveDomain[] = [OPEN_ORDERS_DOMAIN, ORDER_ITEMS_DOMAIN, PRODUCTS_DOMAIN]
  .map((name) => ({ name, intervalMs: LIVE_ORDERS_INTERVAL_MS }));

/**
 * Clear what the domains remember between passes in this thread. Called when the sync stops: the
 * tables are cleared then, and a pass after the next login must not skip rows it no longer has.
 */
export function resetLiveOrderDomains(): void {
  forgetItemFetches();
  forgetProductQueries();
}
