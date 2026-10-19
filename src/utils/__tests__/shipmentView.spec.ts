import { describe, expect, it } from "vitest";
import { filterShipments, matchesQuery, picklistView, sortShipments, toShipmentView, withoutKitComponents } from "@/utils/shipmentView";

const shipment = (overrides: Record<string, unknown> = {}) => ({
  shipmentId: "S1",
  orderId: "O1",
  orderName: "BRK#1",
  statusId: "SHIPMENT_APPROVED",
  firstName: "Ada",
  lastName: "Lovelace",
  picklistId: "P1",
  shipmentMethodTypeId: "SECOND_DAY",
  carrierPartyId: "FEDEX",
  orderDate: 100,
  items: [
    { orderItemSeqId: "01", shipmentItemSeqId: "01", productId: "10", internalName: "SHORT-33", productTypeId: "FINISHED_GOOD" },
    { orderItemSeqId: "02", shipmentItemSeqId: "02", productId: "11", internalName: "SWEATER-M", productTypeId: "FINISHED_GOOD" }
  ],
  shipmentPackages: [
    { shipmentId: "S1", shipmentPackageSeqId: "01", packageName: "A" },
    { shipmentId: "S1", shipmentPackageSeqId: "02", packageName: "B" }
  ],
  shipmentPackageRouteSegDetails: [
    { shipmentId: "S1", shipmentPackageSeqId: "01", shipmentItemSeqId: "01", packageName: "A", trackingCode: "TRK-A", carrierServiceStatusId: "SHRSCS_ACCEPTED" },
    { shipmentId: "S1", shipmentPackageSeqId: "02", shipmentItemSeqId: "02", packageName: "B", trackingCode: "TRK-B", carrierServiceStatusId: "SHRSCS_ACCEPTED" }
  ],
  ...overrides
});

describe("toShipmentView", () => {
  it("names the in progress category, the customer and the box each item sits in", () => {
    const view = toShipmentView(shipment(), { requiresLabel: true });

    expect(view.category).toBe("in-progress");
    expect(view.customerName).toBe("Ada Lovelace");
    expect(view.items.map((item: any) => [item.selectedBox, item.currentBox])).toEqual([["A", "A"], ["B", "B"]]);
  });

  it("keeps a tracking code for every box of a multi package shipment", () => {
    const view = toShipmentView(shipment({ statusId: "SHIPMENT_PACKED" }), { requiresLabel: true });

    expect(view.category).toBe("completed");
    expect(view.trackingCode).toBe("TRK-A");
    expect(view.packageTrackings).toEqual([{ packageName: "A", trackingCode: "TRK-A" }, { packageName: "B", trackingCode: "TRK-B" }]);
    expect(view.shipmentPackages.map((shipmentPackage: any) => shipmentPackage.trackingCode)).toEqual(["TRK-A", "TRK-B"]);
    expect(view.missingLabelImage).toBe(false);
  });

  it("flags a missing label when a store with shipping methods has a box without tracking, or nothing", () => {
    const noTracking = shipment({ shipmentPackageRouteSegDetails: [{ shipmentId: "S1", shipmentPackageSeqId: "01", shipmentItemSeqId: "01", packageName: "A", carrierServiceStatusId: "SHRSCS_ACCEPTED" }] });
    expect(toShipmentView(noTracking, { requiresLabel: true }).missingLabelImage).toBe(true);
    expect(toShipmentView(noTracking, { requiresLabel: false }).missingLabelImage).toBe(false);
    expect(toShipmentView(shipment({ shipmentPackageRouteSegDetails: [] }), { requiresLabel: true }).missingLabelImage).toBe(true);
  });

  it("ignores voided labels for tracking but still reads the box of an item from them", () => {
    const voided = shipment({
      shipmentPackageRouteSegDetails: [{ shipmentId: "S1", shipmentPackageSeqId: "01", shipmentItemSeqId: "01", packageName: "A", trackingCode: "OLD", carrierServiceStatusId: "SHRSCS_VOIDED" }]
    });
    const view = toShipmentView(voided, { requiresLabel: true });

    expect(view.trackingCode).toBeUndefined();
    expect(view.packageTrackings).toEqual([]);
    expect(view.missingLabelImage).toBe(true);
    expect(view.items[0].selectedBox).toBe("A");
  });
});

describe("withoutKitComponents", () => {
  it("shows the kit and hides the components that share its order item", () => {
    const items = [
      { orderItemSeqId: "01", productTypeId: "MARKETING_PKG_PICK", productId: "kit" },
      { orderItemSeqId: "01", productTypeId: "FINISHED_GOOD", productId: "component" },
      { orderItemSeqId: "02", productTypeId: "FINISHED_GOOD", productId: "plain" }
    ];

    expect(withoutKitComponents(items).map((item) => item.productId)).toEqual(["kit", "plain"]);
  });
});

describe("filtering and sorting", () => {
  const views = [
    toShipmentView(shipment({ shipmentId: "S1", orderDate: 300 }), { requiresLabel: true }),
    toShipmentView(shipment({ shipmentId: "S2", orderName: "HC#2", picklistId: "P2", orderDate: 100, carrierPartyId: "UPS", shipmentMethodTypeId: "STANDARD" }), { requiresLabel: true }),
    toShipmentView(shipment({ shipmentId: "S3", orderName: "HC#3", orderDate: 200, firstName: "Grace", lastName: "Hopper" }), { requiresLabel: true })
  ];

  it("searches order, customer, tracking and item names", () => {
    expect(matchesQuery(views[0], "brk#1")).toBe(true);
    expect(matchesQuery(views[2], "hopper")).toBe(true);
    expect(matchesQuery(views[0], "trk-b")).toBe(true);
    expect(matchesQuery(views[0], "sweater")).toBe(true);
    expect(matchesQuery(views[0], "nothing like this")).toBe(false);
  });

  it("filters by picklist, carrier and shipping method together with the query", () => {
    expect(filterShipments(views, { picklistId: "P2" }).map((view) => view.shipmentId)).toEqual(["S2"]);
    expect(filterShipments(views, { carrierPartyId: "FEDEX" }).map((view) => view.shipmentId)).toEqual(["S1", "S3"]);
    expect(filterShipments(views, { shipmentMethodTypeIds: ["STANDARD"] }).map((view) => view.shipmentId)).toEqual(["S2"]);
    expect(filterShipments(views, { carrierPartyId: "FEDEX", query: "hc#3" }).map((view) => view.shipmentId)).toEqual(["S3"]);
  });

  it("sorts in progress oldest first and completed newest first", () => {
    expect(sortShipments(views, "in-progress").map((view) => view.shipmentId)).toEqual(["S2", "S3", "S1"]);
    expect(sortShipments(views, "completed").map((view) => view.shipmentId)).toEqual(["S1", "S3", "S2"]);
  });

  it("puts the shipment made last on top of completed, even for an older order", () => {
    const withWave = [
      { ...views[0], shipmentId: "OLD", orderDate: 900, createdDate: 10 },
      { ...views[0], shipmentId: "NEW", orderDate: 100, createdDate: 20 }
    ];

    expect(sortShipments(withWave, "completed").map((view) => view.shipmentId)).toEqual(["NEW", "OLD"]);
    expect(sortShipments(withWave, "in-progress").map((view) => view.shipmentId)).toEqual(["NEW", "OLD"]);
  });
});

describe("picklistView", () => {
  it("names the current pickers, from a person or a group, and drops those who left", () => {
    const view = picklistView({
      picklistId: "P1",
      picklistDate: 1_000,
      roles: [
        { partyId: "1", person: { firstName: "Casey", lastName: "Morgan" } },
        { partyId: "2", partyGroup: { groupName: "Night shift" } },
        { partyId: "3", thruDate: 5, person: { firstName: "Left", lastName: "Early" } }
      ]
    }, (millis) => `t${millis}`);

    expect(view.id).toBe("P1");
    expect(view.pickersName).toBe("Casey Morgan, Night shift");
    expect(view.pickerIds).toEqual(["1", "2"]);
    expect(view.date).toBe("t1000");
  });
});
