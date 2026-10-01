/**
 * Products referenced by the items in `orderItems`, read from Solr.
 *
 * Solr is the one source that returns a product's card data, identifiers, features, tags and
 * categories in a single record; REST spreads them across several product resources.
 */

import type { BaseDB } from "@common/db/baseDb";
import { projectRows } from "@common/db/projection";
import { registerSyncDomain } from "@common/db/sync/syncRegistry";
import { workerPost } from "@common/db/sync/workerFetch";
import type { DbRow, SyncContext } from "@common/db/types";
import { productProjection } from "../fulfillmentDb";
import { chunk } from "./rowSync";

export const PRODUCTS_DOMAIN = "products";

const PRODUCT_TTL_MS = 30 * 60 * 1000;
const PRODUCT_BATCH_SIZE = 50;
// Fields where every copy of a product contributes values instead of the fullest copy winning.
const UNIONED_FIELDS = ["tags", "productCategories"];

// When each product was last asked for, so a product Solr doesn't return isn't re-queried every tick.
const lastQueriedAt = new Map<string, number>();

const isEmpty = (value: unknown) => value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length);

/**
 * Collapse Solr's records into one per product.
 *
 * Solr can hold several records for one product, for example a stale copy beside a fresh one.
 * The record with the most filled fields is kept, its gaps are filled from the others, and tags
 * and categories are unioned, so a thin copy can neither replace nor hide the full one.
 */
export function mergeProductDocs(docs: any[]): any[] {
  const byId = new Map<string, any[]>();
  for(const doc of docs) {
    const productId = doc?.productId;
    if(!productId) {continue;}
    const copies = byId.get(productId) ?? [];
    copies.push(doc);
    byId.set(productId, copies);
  }

  return [...byId.values()].map((copies) => {
    const filled = (doc: any) => Object.values(doc).filter((value) => !isEmpty(value)).length;
    const [primary, ...others] = [...copies].sort((a, b) => filled(b) - filled(a));
    const merged = { ...primary };
    for(const other of others) {
      for(const [field, value] of Object.entries(other)) {
        if(isEmpty(merged[field])) {merged[field] = value;}
      }
    }
    for(const field of UNIONED_FIELDS) {
      const values = copies.flatMap((doc) => (Array.isArray(doc[field]) ? doc[field] : []));
      if(values.length) {merged[field] = [...new Set(values)];}
    }

    return merged;
  });
}

const quoted = (value: string) => `"${value.replace(/(["\\])/g, "\\$1")}"`;

function productQuery(productIds: string[]) {
  return {
    // Twice the batch, so duplicate records can't push a product out of the page.
    params: { rows: productIds.length * 2, start: 0 },
    query: "*:*",
    filter: `docType: PRODUCT AND productId: (${productIds.map(quoted).join(" OR ")})`
  };
}

export function registerProductsDomain(getDb: (omsInstance: string) => BaseDB): void {
  registerSyncDomain({
    name: PRODUCTS_DOMAIN,

    async sync(ctx: SyncContext) {
      const db = getDb(ctx.omsInstance);
      const referenced = new Set<string>();
      await db.table<DbRow, string>("orderItems").each((item) => {
        if(item.productId) {referenced.add(String(item.productId));}
      });
      if(!referenced.size) {return;}

      const productIds = [...referenced];
      const stored = await db.table<DbRow, string>("products").bulkGet(productIds);
      const due = productIds.filter((productId, index) => {
        const row = stored[index];
        const isFresh = row && ctx.now - (Number(row.syncedAt) || 0) < PRODUCT_TTL_MS;
        const askedRecently = ctx.now - (lastQueriedAt.get(productId) ?? 0) < PRODUCT_TTL_MS;

        return !isFresh && !askedRecently;
      });

      for(const batch of chunk(due, PRODUCT_BATCH_SIZE)) {
        const response = await workerPost(ctx, "admin/search/query", productQuery(batch));
        batch.forEach((productId) => lastQueriedAt.set(productId, ctx.now));
        const docs = response?.response?.response?.docs ?? response?.response?.docs ?? [];
        const rows = projectRows(mergeProductDocs(docs), productProjection, ctx.now);
        if(rows.length) {await db.table("products").bulkPut(rows);}
      }
    }
  });
}
