import { describe, expect, it } from "vitest";
import { OPEN_ORDER_FILTER_DIMENSIONS, filterOpenOrders, matchesSearch, openOrderFacets } from "@/utils/openOrderFilters";

const productsById = new Map<string, any>([
  ["P1", { productId: "P1", productName: "Aero Daily Tee", tags: ["Men", "Top"], productCategories: ["T-Shirt"], goodIdentifications: ["SKU/MS01-XS"] }],
  ["P2", { productId: "P2", productName: "Trail Short", tags: ["Women", "Bottom"], productCategories: ["Shorts"] }],
  ["P3", { productId: "P3", productName: "Rain Jacket", tags: ["Men"], productCategories: ["Jacket"] }]
]);

const orders = [
  { orderKey: "A-1", orderId: "A", orderName: "#1001", customerName: "Ada Lovelace", shipmentMethodTypeId: "STANDARD", items: [{ productId: "P1" }] },
  { orderKey: "B-1", orderId: "B", orderName: "#1002", customerName: "Grace Hopper", shipmentMethodTypeId: "NEXT_DAY", items: [{ productId: "P2" }] },
  { orderKey: "C-1", orderId: "C", orderName: "#1003", customerName: "Alan Turing", shipmentMethodTypeId: "STANDARD", items: [{ productId: "P2" }, { productId: "P3" }] }
];

const allDimensions = OPEN_ORDER_FILTER_DIMENSIONS;
const keys = (list: any[]) => list.map((order) => order.orderKey);

describe("filterOpenOrders", () => {
  it("returns every order when nothing is selected", () => {
    expect(keys(filterOpenOrders(orders, { dimensions: allDimensions, selections: {}, productsById, query: "" }))).toEqual(["A-1", "B-1", "C-1"]);
  });

  it("combines values within a dimension with OR", () => {
    const selections = { shipmentMethod: ["STANDARD", "NEXT_DAY"] };
    expect(keys(filterOpenOrders(orders, { dimensions: allDimensions, selections, productsById, query: "" }))).toEqual(["A-1", "B-1", "C-1"]);
  });

  it("combines dimensions with AND", () => {
    const selections = { shipmentMethod: ["STANDARD"], productTag: ["Women"] };
    expect(keys(filterOpenOrders(orders, { dimensions: allDimensions, selections, productsById, query: "" }))).toEqual(["C-1"]);
  });

  it("matches a product dimension when any item matches", () => {
    const selections = { productCategory: ["Jacket"] };
    expect(keys(filterOpenOrders(orders, { dimensions: allDimensions, selections, productsById, query: "" }))).toEqual(["C-1"]);
  });

  it("ignores selections for dimensions that are switched off", () => {
    const shippingOnly = allDimensions.filter((dimension) => dimension.id === "shipmentMethod");
    const selections = { productTag: ["Women"] };
    expect(keys(filterOpenOrders(orders, { dimensions: shippingOnly, selections, productsById, query: "" }))).toEqual(["A-1", "B-1", "C-1"]);
  });
});

describe("matchesSearch", () => {
  it("finds orders by order name, customer, product name and identifier", () => {
    expect(matchesSearch(orders[0], productsById, "#1001")).toBe(true);
    expect(matchesSearch(orders[1], productsById, "grace")).toBe(true);
    expect(matchesSearch(orders[2], productsById, "rain jacket")).toBe(true);
    expect(matchesSearch(orders[0], productsById, "ms01-xs")).toBe(true);
    expect(matchesSearch(orders[0], productsById, "jacket")).toBe(false);
  });
});

describe("openOrderFacets", () => {
  it("counts orders and items for each value, honoring the other dimensions' selections", () => {
    const facets = openOrderFacets(orders, {
      dimensions: allDimensions,
      selections: { productTag: ["Men"] },
      productsById,
      query: ""
    });

    // Shipping method counts only orders with a Men product: A (STANDARD, 1 item) and C (STANDARD, 2 items).
    expect(facets.shipmentMethod).toEqual([{ value: "STANDARD", orderCount: 2, itemCount: 3 }]);
    // Tag counts ignore the tag selection itself, so every tag stays tappable.
    expect(facets.productTag.map((facet) => [facet.value, facet.orderCount])).toEqual([["Bottom", 2], ["Men", 2], ["Top", 1], ["Women", 2]]);
  });

  it("keeps a selected value listed even when no order has it", () => {
    const facets = openOrderFacets(orders, {
      dimensions: allDimensions,
      selections: { shipmentMethod: ["THIRD_DAY"] },
      productsById,
      query: ""
    });
    expect(facets.shipmentMethod.find((facet) => facet.value === "THIRD_DAY")).toEqual({ value: "THIRD_DAY", orderCount: 0, itemCount: 0 });
  });
});
