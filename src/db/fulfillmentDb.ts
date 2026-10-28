// Imported by the sync worker too: no DOM, Vue or Pinia imports, and only deep `@common/db/...` imports.

import { defineAppDb } from "@common/db/model/defineAppDb";
import { defineEntity } from "@common/db/model/defineEntity";
import { defineSchema, mergeSchemas } from "@common/db/model/defineSchema";
import { commonSchema } from "@common/db/schema/commonSchema";
import type { BaseDB } from "@common/db/storage/baseDb";

export const ORDER_STAGE = {
  OPEN: "open"
} as const;

// A shipment is in progress until it is packed, and completed until it ships.
export const SHIPMENT_STAGE = {
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed"
} as const;

export const orderKeyOf = (orderId: unknown, shipGroupSeqId: unknown): string | undefined =>
  orderId && shipGroupSeqId ? `${orderId}-${shipGroupSeqId}` : undefined;

const fulfillmentSchema = defineSchema({
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

  shipments: defineEntity({
    primaryKey: "shipmentId",
    fields: {
      shipmentId: "text",
      orderId: "text",
      stage: "text",
      facilityId: "text",
      picklistId: "text",
      statusId: "text",
      productStoreId: "text",
      orderDate: "date",
      // The shipment as the API returned it, with its items, packages and route segments. The pages build their cards from it.
      shipment: "structured"
    },
    indexes: ["stage", "facilityId", "picklistId"]
  }),

  transferOrders: defineEntity({
    // A transfer order is open and completed at once when it has shipped in part, so the stage is part of the key.
    primaryKey: "stage,orderId",
    fields: {
      stage: "text",
      orderId: "text",
      facilityId: "text",
      orderName: "text",
      orderDate: "date",
      shippedDate: "date",
      // The order as the API returned it.
      order: "structured"
    },
    indexes: ["facilityId", "stage"]
  }),

  pickers: defineEntity({
    primaryKey: "partyId",
    fields: {
      partyId: "text",
      firstName: "text",
      lastName: "text",
      groupName: "text",
      externalId: "text"
    }
  }),

  picklists: defineEntity({
    primaryKey: "picklistId",
    fields: {
      picklistId: "text",
      facilityId: "text",
      picklistDate: "date",
      // The picklist's pickers, as the API returned its roles.
      roles: "structured"
    },
    indexes: ["facilityId"]
  }),

  products: defineEntity({
    primaryKey: "productId",
    fields: {
      productId: "text",
      productName: "text",
      parentProductName: "text",
      internalName: "text",
      // The product identifier settings can pick these, so nothing reads them by name.
      groupId: "text",
      groupName: "text",
      title: "text",
      primaryProductCategoryName: "text",
      sku: "text",
      productTypeId: "text",
      mainImageUrl: "text",
      productFeatures: "structured",
      goodIdentifications: "structured",
      tags: "structured"
    }
  })
});

export const fulfillmentDb = defineAppDb({
  suffix: "FulfillmentDB",
  // 8: transferOrders table. 7: pickers table. 6: shipments and picklists tables for the In Progress and Completed pages (5: the userFacilities table went, the user's facilities are args).
  version: 8,
  schema: mergeSchemas(commonSchema.pick(["shipmentMethodTypes"]), fulfillmentSchema)
});

export const getFulfillmentDb = (omsInstance: string): BaseDB => fulfillmentDb.get(omsInstance);
