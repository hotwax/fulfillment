/**
 * Fulfillment local database.
 *
 * One Dexie database per OMS instance. It holds the shared accxui reference tables
 * (COMMON_DB_SCHEMA) plus the entities the fulfillment pages read:
 *   - userFacilities: the master list of facilities this user fulfills from
 *   - orders: one row per order ship group, with the fulfillment `stage` it is in
 *   - orderItems: the items of each order ship group
 *   - products: the products those items reference
 *
 * Imported by both the sync worker and the main thread, so it must stay free of DOM, Vue and
 * Pinia imports. Import framework pieces from their `@common/db/...` modules, never `@common`.
 */

import { BaseDB, defineDbEntity } from "@common/db/baseDb";
import { COMMON_DB_SCHEMA, shipmentMethodTypeProjection } from "@common/db/domains/commonSeedEntities";
import type { DbEntity, EntityProjection } from "@common/db/types";

export const ORDER_STAGE = {
  OPEN: "open"
} as const;

export const FULFILLMENT_DB_SCHEMA: Record<string, string> = {
  ...COMMON_DB_SCHEMA,
  userFacilities: "facilityId",
  orders: "orderKey, orderId, stage, facilityId, [facilityId+stage], productStoreId, orderDate",
  orderItems: "itemKey, orderKey, orderId, productId",
  products: "productId"
};

export const orderKeyOf = (orderId: unknown, shipGroupSeqId: unknown): string | undefined =>
  orderId && shipGroupSeqId ? `${orderId}-${shipGroupSeqId}` : undefined;

export const userFacilityProjection: EntityProjection = {
  keyField: "facilityId",
  fields: {
    facilityId: "text",
    facilityName: "text",
    facilityTypeId: "text"
  }
};

export const orderProjection: EntityProjection = {
  keyField: "orderKey",
  fields: {
    orderId: "text",
    shipGroupSeqId: "text",
    stage: "text",
    facilityId: "text",
    productStoreId: "text",
    shipmentMethodTypeId: "text",
    orderDate: "date",
    itemCount: "count"
  },
  buildKey: (raw) => orderKeyOf(raw?.orderId, raw?.shipGroupSeqId)
};

export const orderItemProjection: EntityProjection = {
  keyField: "itemKey",
  fields: {
    orderKey: "text",
    orderId: "text",
    orderItemSeqId: "text",
    shipGroupSeqId: "text",
    productId: "text",
    quantity: "count",
    statusId: "text"
  },
  buildKey: (raw) => raw?.orderId && raw?.orderItemSeqId ? `${raw.orderId}-${raw.orderItemSeqId}` : undefined
};

export const productProjection: EntityProjection = {
  keyField: "productId",
  fields: {
    productId: "text",
    productName: "text",
    productTypeId: "text"
  }
};

const databases = new Map<string, BaseDB>();

/** The database for one OMS instance. Rows from different OMS instances never share a database. */
export function getFulfillmentDb(omsInstance: string): BaseDB {
  const name = `${omsInstance || "default"}-FulfillmentDB`;
  let db = databases.get(name);
  if(!db) {
    db = new BaseDB(name, FULFILLMENT_DB_SCHEMA);
    databases.set(name, db);
  }

  return db;
}

export interface FulfillmentEntities {
  userFacilities: DbEntity;
  orders: DbEntity;
  orderItems: DbEntity;
  products: DbEntity;
  shipmentMethodTypes: DbEntity;
}

const entitiesByOms = new Map<string, FulfillmentEntities>();

export function getFulfillmentEntities(omsInstance: string): FulfillmentEntities {
  const cached = entitiesByOms.get(omsInstance);
  if(cached) {return cached;}

  const db = getFulfillmentDb(omsInstance);
  const entities: FulfillmentEntities = {
    userFacilities: defineDbEntity(db, "userFacilities", userFacilityProjection),
    orders: defineDbEntity(db, "orders", orderProjection),
    orderItems: defineDbEntity(db, "orderItems", orderItemProjection),
    products: defineDbEntity(db, "products", productProjection),
    shipmentMethodTypes: defineDbEntity(db, "shipmentMethodTypes", shipmentMethodTypeProjection)
  };
  entitiesByOms.set(omsInstance, entities);

  return entities;
}
