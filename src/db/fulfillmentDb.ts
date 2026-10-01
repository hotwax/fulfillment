/**
 * Fulfillment local database.
 *
 * One Dexie database per OMS instance. It holds the shared accxui reference table the Open page
 * reads (shipmentMethodTypes) plus the entities the fulfillment pages read:
 *   - userFacilities: the master list of facilities this user fulfills from
 *   - orders: one row per order ship group, with the fulfillment `stage` it is in
 *   - orderItems: the items of each order ship group
 *   - products: the products those items reference
 *
 * Imported by both the sync worker and the main thread, so it must stay free of DOM, Vue and
 * Pinia imports. Import framework pieces from their `@common/db/...` modules, never `@common`.
 */

import { defineAppDb } from "@common/db/schema/defineAppDb";
import { defineEntity } from "@common/db/schema/defineEntity";
import { defineSchema, mergeSchemas } from "@common/db/schema/defineSchema";
import { commonSchema } from "@common/db/seed/seedSchema";
import type { BaseDB } from "@common/db/storage/baseDb";

export const ORDER_STAGE = {
  OPEN: "open"
} as const;

/** The key the Open view identifies an order ship group by. The table itself uses a compound key. */
export const orderKeyOf = (orderId: unknown, shipGroupSeqId: unknown): string | undefined =>
  orderId && shipGroupSeqId ? `${orderId}-${shipGroupSeqId}` : undefined;

const fulfillmentSchema = defineSchema({
  userFacilities: defineEntity({
    primaryKey: "facilityId",
    fields: {
      facilityId: "text",
      facilityName: "text",
      facilityTypeId: "text"
    }
  }),

  orders: defineEntity({
    primaryKey: "orderId,shipGroupSeqId",
    fields: {
      orderId: "text",
      shipGroupSeqId: "text",
      stage: "text",
      facilityId: "text",
      facilityName: "text",
      productStoreId: "text",
      shipmentMethodTypeId: "text",
      orderName: "text",
      orderDate: "date",
      itemCount: "count",
      billToPartyId: "text",
      firstName: "text",
      lastName: "text"
    },
    indexes: ["orderId", "stage", "facilityId", "[facilityId+stage]", "productStoreId", "orderDate"]
  }),

  orderItems: defineEntity({
    // One order item can be allocated across several ship groups, so the ship group is part of the key.
    primaryKey: "orderId,shipGroupSeqId,orderItemSeqId",
    fields: {
      orderId: "text",
      orderItemSeqId: "text",
      shipGroupSeqId: "text",
      productId: "text",
      quantity: "count",
      statusId: "text"
    },
    indexes: ["[orderId+shipGroupSeqId]", "productId"]
  }),

  // The fields the Open cards, search and filters read, and that the card helpers read from the
  // product cache: names and identifiers, image, features, kit type, tags and categories.
  products: defineEntity({
    primaryKey: "productId",
    fields: {
      productId: "text",
      productName: "text",
      parentProductName: "text",
      internalName: "text",
      sku: "text",
      productTypeId: "text",
      mainImageUrl: "text",
      productFeatures: "structured",
      goodIdentifications: "structured",
      tags: "structured",
      productCategories: "structured"
    }
  })
});

export const fulfillmentDb = defineAppDb({
  suffix: "FulfillmentDB",
  // v2: order items are keyed by their ship group too.
  version: 2,
  schema: mergeSchemas(commonSchema.pick(["shipmentMethodTypes"]), fulfillmentSchema)
});

/** The database for one OMS instance. Worker-safe: the instance is a parameter. */
export const getFulfillmentDb = (omsInstance: string): BaseDB => fulfillmentDb.get(omsInstance);
