// Imported by the sync worker too: no DOM, Vue or Pinia imports, and only deep `@common/db/...` imports.

import { defineAppDb } from "@common/db/schema/defineAppDb";
import { defineEntity } from "@common/db/schema/defineEntity";
import { defineSchema, mergeSchemas } from "@common/db/schema/defineSchema";
import { commonSchema } from "@common/db/seed/seedSchema";
import type { BaseDB } from "@common/db/storage/baseDb";

export const ORDER_STAGE = {
  OPEN: "open"
} as const;

export const orderKeyOf = (orderId: unknown, shipGroupSeqId: unknown): string | undefined =>
  orderId && shipGroupSeqId ? `${orderId}-${shipGroupSeqId}` : undefined;

const fulfillmentSchema = defineSchema({
  userFacilities: defineEntity({
    primaryKey: "facilityId",
    fields: {
      facilityId: "text"
    }
  }),

  orders: defineEntity({
    primaryKey: "orderId,shipGroupSeqId",
    fields: {
      orderId: "text",
      shipGroupSeqId: "text",
      stage: "text",
      facilityId: "text",
      productStoreId: "text",
      shipmentMethodTypeId: "text",
      orderName: "text",
      orderDate: "date",
      firstName: "text",
      lastName: "text"
    },
    indexes: ["stage", "facilityId"]
  }),

  orderItems: defineEntity({
    // One order item can be allocated across several ship groups, so the ship group is part of the key.
    primaryKey: "orderId,shipGroupSeqId,orderItemSeqId",
    fields: {
      orderId: "text",
      orderItemSeqId: "text",
      shipGroupSeqId: "text",
      productId: "text",
      quantity: "count"
    },
    indexes: ["[orderId+shipGroupSeqId]"]
  }),

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
  version: 3,
  schema: mergeSchemas(commonSchema.pick(["shipmentMethodTypes"]), fulfillmentSchema)
});

export const getFulfillmentDb = (omsInstance: string): BaseDB => fulfillmentDb.get(omsInstance);
