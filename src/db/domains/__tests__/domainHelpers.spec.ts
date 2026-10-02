import { defineEntity } from "@common/db/schema/defineEntity";
import { canonicalKey, entityKeyOf, projectRows } from "@common/db/storage/projection";
import { activationKey } from "@common/db/sync/syncRegistry";
import { describe, expect, it } from "vitest";
import { OPEN_ORDERS_DOMAIN, ORDER_ITEMS_DOMAIN, PRODUCTS_DOMAIN, liveOrderDomains } from "@/db/domains";
import { mergeProductDocs } from "@/db/domains/productsDomain";
import { changedRows, chunk, hydrationOrder, runWithConcurrency } from "@/db/domains/rowSync";
import { fulfillmentDb } from "@/db/fulfillmentDb";

describe("mergeProductDocs", () => {
  it("keeps one record per product, preferring the fullest copy and unioning tags", () => {
    const full = { productId: "10040", productName: "XS / Black", productFeatures: ["Size/XS", "Color/Black"], tags: ["Men", "Top"], productStoreIds: ["STORE"] };
    const thin = { productId: "10040", productName: "XS / Black", productFeatures: ["SIZE/XS", "COLOR/Black"], tags: ["Sale"] };

    const merged = mergeProductDocs([thin, full]);

    expect(merged).toHaveLength(1);
    expect(merged[0].productFeatures).toEqual(["Size/XS", "Color/Black"]);
    expect(merged[0].productStoreIds).toEqual(["STORE"]);
    expect(merged[0].tags).toEqual(["Sale", "Men", "Top"]);
  });

  it("fills a gap in the fullest copy from another copy", () => {
    const merged = mergeProductDocs([
      { productId: "1", productName: "Tee", tags: ["Men"], mainImageUrl: "" },
      { productId: "1", mainImageUrl: "https://cdn.example/tee.png" }
    ]);
    expect(merged[0].mainImageUrl).toBe("https://cdn.example/tee.png");
  });

  it("drops records without a product ID", () => {
    expect(mergeProductDocs([{ productName: "No ID" }, { productId: "2" }])).toEqual([{ productId: "2" }]);
  });
});

describe("changedRows", () => {
  const entity = defineEntity({
    primaryKey: "orderId,shipGroupSeqId",
    fields: { orderId: "text", shipGroupSeqId: "text", itemCount: "count", tags: "structured" }
  });
  const row = (orderId: string, fields: Record<string, unknown> = {}, syncedAt = 1) => ({ orderId, shipGroupSeqId: "00001", ...fields, syncedAt });

  it("returns only rows that are new or whose stored fields changed", () => {
    const existing = [row("A", { itemCount: 1 }), row("B", { itemCount: 2 })];
    const fresh = [row("A", { itemCount: 1 }, 2), row("B", { itemCount: 3 }, 2), row("C", { itemCount: 1 }, 2)];
    expect(changedRows(fresh, existing, entity).map((r) => r.orderId)).toEqual(["B", "C"]);
  });

  it("returns nothing when the server set is unchanged, whatever the sync time", () => {
    expect(changedRows([row("A", { tags: ["Sale"] }, 5)], [row("A", { tags: ["Sale"] })], entity)).toEqual([]);
  });

  it("sees a change inside a structured field and a field that went missing", () => {
    expect(changedRows([row("A", { tags: ["Sale", "Men"] })], [row("A", { tags: ["Sale"] })], entity)).toHaveLength(1);
    expect(changedRows([row("A")], [row("A", { itemCount: 1 })], entity)).toHaveLength(1);
  });

  it("keys compound rows by every key member", () => {
    const otherShipGroup = { ...row("A", { itemCount: 1 }), shipGroupSeqId: "00002" };
    expect(changedRows([otherShipGroup], [row("A", { itemCount: 1 })], entity)).toEqual([otherShipGroup]);
  });
});

describe("chunk and runWithConcurrency", () => {
  it("splits into fixed-size batches", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("runs every task, never more than the limit at once, and keeps going after a failure", async () => {
    let running = 0;
    let peak = 0;
    const done: number[] = [];
    await runWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      if(n === 4) {throw new Error("boom");}
      done.push(n);
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(done.sort()).toEqual([1, 2, 3, 5, 6, 7]);
  });
});

describe("hydrationOrder", () => {
  it("interleaves facilities, oldest first within each, so every facility's top orders come first", () => {
    const orders = [
      { orderKey: "B-new", facilityId: "B", orderDate: 30 },
      { orderKey: "A-old", facilityId: "A", orderDate: 10 },
      { orderKey: "A-new", facilityId: "A", orderDate: 40 },
      { orderKey: "B-old", facilityId: "B", orderDate: 20 },
      { orderKey: "A-mid", facilityId: "A", orderDate: 25 }
    ];
    expect(hydrationOrder(orders).map((order) => order.orderKey)).toEqual(["A-old", "B-old", "A-mid", "B-new", "A-new"]);
    expect(hydrationOrder(orders, "B").map((order) => order.orderKey)).toEqual(["B-old", "B-new", "A-old", "A-mid", "A-new"]);
  });
});

describe("product rows", () => {
  it("keep every field the product identifier settings can pick", () => {
    const doc = { productId: "10033", internalName: "WP07-28-Black", groupId: "10032", groupName: "V_aeon-capri", title: "Product 28 / Black.", primaryProductCategoryName: "Browse Root" };
    const [row] = projectRows([doc], fulfillmentDb.entities.products, 1);

    expect(row).toMatchObject(doc);
  });
});

describe("order item keys", () => {
  it("keeps one row per ship group when an order item is allocated to two of them", () => {
    const entity = fulfillmentDb.entities.orderItems;
    const item = { orderId: "10110", orderItemSeqId: "00101", productId: "10001", quantity: 1, statusId: "ITEM_APPROVED" };
    const rows = projectRows([{ ...item, shipGroupSeqId: "00001" }, { ...item, shipGroupSeqId: "00002" }], entity, 1);

    expect(new Set(rows.map((row) => canonicalKey(entityKeyOf(row, entity)!))).size).toBe(2);
  });
});

describe("liveOrderDomains", () => {
  it("runs the facility on screen's own items and products before the rest of the queue's", () => {
    const domains = liveOrderDomains("BROOKLYN");

    expect(domains.map((domain) => [domain.name, domain.args])).toEqual([
      [OPEN_ORDERS_DOMAIN, undefined],
      [ORDER_ITEMS_DOMAIN, { facilityId: "BROOKLYN", only: true }],
      [PRODUCTS_DOMAIN, { facilityId: "BROOKLYN" }],
      [ORDER_ITEMS_DOMAIN, { facilityId: "BROOKLYN" }],
      [PRODUCTS_DOMAIN, undefined]
    ]);
    // Each activation keeps its own clock, so the facility's passes don't stop the queue's from running.
    expect(new Set(domains.map(activationKey)).size).toBe(domains.length);
  });

  it("has one pass each without a facility", () => {
    expect(liveOrderDomains().map((domain) => domain.name)).toEqual([OPEN_ORDERS_DOMAIN, ORDER_ITEMS_DOMAIN, PRODUCTS_DOMAIN]);
  });
});
