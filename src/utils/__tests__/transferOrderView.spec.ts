import { describe, expect, it } from "vitest";
import { filterTransferOrders, matchesTransferOrder, sortTransferOrders, toTransferOrderView } from "@/utils/transferOrderView";

const row = (orderId: string, extra: Record<string, unknown> = {}, order: Record<string, unknown> = {}) => ({
  orderId, orderName: `TO ${orderId}`, shippedDate: undefined, order: { orderExternalId: `EXT-${orderId}`, orderStatusDesc: "Approved", ...order }, ...extra
});

describe("toTransferOrderView", () => {
  it("hands the detail page the order as the API returned it, with the shipped date", () => {
    const view = toTransferOrderView(row("M1", { shippedDate: 500 }, { facilityId: "BROOKLYN", orderFacilityId: "QUEENS" }));

    expect(view).toMatchObject({ orderId: "M1", orderName: "TO M1", orderExternalId: "EXT-M1", facilityId: "BROOKLYN", orderFacilityId: "QUEENS", shipmentShippedDate: 500 });
  });
});

describe("searching and sorting", () => {
  const views = [
    { ...toTransferOrderView(row("M1")), orderDate: 100 },
    { ...toTransferOrderView(row("M2", { orderName: "Store Balancing - Brooklyn to Queens" })), orderDate: 300 },
    { ...toTransferOrderView(row("M3", { shippedDate: 900 })), orderDate: 200 }
  ];

  it("matches the name, id and external id, ignoring case", () => {
    expect(matchesTransferOrder(views[1], "balancing")).toBe(true);
    expect(matchesTransferOrder(views[0], "m1")).toBe(true);
    expect(matchesTransferOrder(views[0], "ext-m1")).toBe(true);
    expect(matchesTransferOrder(views[0], "nothing")).toBe(false);
    expect(filterTransferOrders(views, "to m")).toHaveLength(2);
    expect(filterTransferOrders(views, "")).toHaveLength(3);
  });

  it("sorts open by order date and completed by when they shipped, newest first", () => {
    expect(sortTransferOrders(views, "open").map((view) => view.orderId)).toEqual(["M2", "M3", "M1"]);
    expect(sortTransferOrders(views, "completed").map((view) => view.orderId)).toEqual(["M3", "M2", "M1"]);
  });
});
