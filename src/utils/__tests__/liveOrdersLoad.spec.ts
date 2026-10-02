import { describe, expect, it } from "vitest";
import { liveOrdersLoad } from "@/utils/liveOrdersLoad";

const filling = { synced: true, facilityPassed: false, orders: 4, ordersWithItems: 4, products: 6, productsLoaded: 6 };

describe("liveOrdersLoad", () => {
  it("is loading, with no progress to show, until the session's first sync is in", () => {
    expect(liveOrdersLoad({ ...filling, synced: false })).toEqual({ loaded: false });
  });

  it("fills the first half with items and the second with products", () => {
    expect(liveOrdersLoad({ ...filling, ordersWithItems: 2, products: 3, productsLoaded: 0 })).toEqual({ loaded: false, progress: 0.25 });
    expect(liveOrdersLoad({ ...filling, productsLoaded: 3 })).toEqual({ loaded: false, progress: 0.75 });
  });

  it("is loaded once every order has its items and every item its product", () => {
    expect(liveOrdersLoad(filling)).toEqual({ loaded: true, progress: 1 });
    expect(liveOrdersLoad({ ...filling, orders: 0, ordersWithItems: 0, products: 0, productsLoaded: 0 })).toEqual({ loaded: true, progress: 1 });
  });

  it("is loaded once the facility's own pass is done, even with an order or product the server can't fill", () => {
    expect(liveOrdersLoad({ ...filling, ordersWithItems: 3, productsLoaded: 5, facilityPassed: true })).toEqual({ loaded: true, progress: 1 });
  });
});
