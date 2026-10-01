import type { BaseDB } from "@common/db/baseDb";
import { OPEN_ORDERS_DOMAIN, registerOpenOrdersDomain } from "./openOrdersDomain";
import { ORDER_ITEMS_DOMAIN, registerOrderItemsDomain } from "./orderItemsDomain";
import { PRODUCTS_DOMAIN, registerProductsDomain } from "./productsDomain";

export { OPEN_ORDERS_DOMAIN, ORDER_ITEMS_DOMAIN, PRODUCTS_DOMAIN };

// Shared accxui reference domains the pages read. productStore runs first: productStoreShipmentMethod fans out over it.
const SHARED_SEED_DOMAINS = ["productStore", "shipmentMethodType", "productStoreShipmentMethod"];

/** Every domain the harness runs, in tick order: items follow orders, products follow items. */
export const FULFILLMENT_SYNC_DOMAINS = [...SHARED_SEED_DOMAINS, OPEN_ORDERS_DOMAIN, ORDER_ITEMS_DOMAIN, PRODUCTS_DOMAIN];

export function registerFulfillmentDomains(getDb: (omsInstance: string) => BaseDB): void {
  registerOpenOrdersDomain(getDb);
  registerOrderItemsDomain(getDb);
  registerProductsDomain(getDb);
}
