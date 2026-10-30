import { describe, expect, it } from "vitest";
import {
  AVOID_SPLIT_REJECTION_REASON_ID,
  MIN_COMPLETE_LOCATIONS,
  buildWholeOrderRejections,
  completeFacilities,
  facilitiesThatRejected,
  itemsUnavailableElsewhere,
  requiredQuantities,
  splitDecision,
  unitCount
} from "@/utils/onePackageReroute";

// Shaped like checkShippingInventory's resultList on demo-maarg.
const shippingInventory = [{
  productId: "10424",
  facilities: [
    { facilityId: "SOUTH_JORDAN", computedAtp: 40, facilityRemainingOrderCapacity: null },
    { facilityId: "BROADWAY", computedAtp: 96, facilityOrderCapacity: 14, facilityRemainingOrderCapacity: 14 },
    { facilityId: "BROOKLYN", computedAtp: 97, facilityOrderCapacity: 10, facilityRemainingOrderCapacity: 10 },
    { facilityId: "OREM", computedAtp: 97, facilityOrderCapacity: 0, facilityRemainingOrderCapacity: 0 },
    { facilityId: "GALXBOY_WAREHOUSE", computedAtp: 0.0, decisionReason: "ProductFacility" }
  ]
}, {
  productId: "10033",
  facilities: [
    { facilityId: "SOUTH_JORDAN", computedAtp: 200, facilityRemainingOrderCapacity: null },
    { facilityId: "BROADWAY", computedAtp: 88, facilityOrderCapacity: 14, facilityRemainingOrderCapacity: 14 },
    { facilityId: "BROOKLYN", computedAtp: 124, facilityOrderCapacity: 10, facilityRemainingOrderCapacity: 10 },
    { facilityId: "OREM", computedAtp: 95, facilityOrderCapacity: 0, facilityRemainingOrderCapacity: 0 },
    { facilityId: "GALXBOY_WAREHOUSE", computedAtp: 500 }
  ]
}];

const shipGroupItems = [
  { orderItemSeqId: "00101", productId: "10424", quantity: 1 },
  { orderItemSeqId: "00102", productId: "10033", quantity: 1 },
  { orderItemSeqId: "00103", productId: "10033", quantity: 1 }
];

describe("requiredQuantities", () => {
  it("adds up units per product", () => {
    expect(requiredQuantities(shipGroupItems)).toEqual(new Map([["10424", 1], ["10033", 2]]));
    expect(unitCount(shipGroupItems)).toBe(3);
  });
});

describe("completeFacilities", () => {
  it("lists the other locations that can ship every unit", () => {
    // OREM has stock but no capacity today, GALXBOY_WAREHOUSE can't ship 10424.
    const complete = completeFacilities(shippingInventory, requiredQuantities(shipGroupItems), ["SOUTH_JORDAN"]);
    expect(complete).toEqual(["BROADWAY", "BROOKLYN"]);
    expect(complete.length >= MIN_COMPLETE_LOCATIONS).toBe(true);
  });

  it("leaves out the rejecting store, whose stock didn't hold up", () => {
    expect(completeFacilities(shippingInventory, requiredQuantities(shipGroupItems))).toContain("SOUTH_JORDAN");
    expect(completeFacilities(shippingInventory, requiredQuantities(shipGroupItems), ["SOUTH_JORDAN"])).not.toContain("SOUTH_JORDAN");
  });

  it("falls short of a whole-order rejection with only one location left", () => {
    const complete = completeFacilities(shippingInventory, requiredQuantities(shipGroupItems), ["SOUTH_JORDAN", "BROOKLYN"]);
    expect(complete).toEqual(["BROADWAY"]);
    expect(complete.length >= MIN_COMPLETE_LOCATIONS).toBe(false);
  });

  it("requires every unit at one location", () => {
    const products = [
      { productId: "A", facilities: [{ facilityId: "STORE_1", computedAtp: 5 }, { facilityId: "STORE_2", computedAtp: 1 }] },
      { productId: "B", facilities: [{ facilityId: "STORE_1", computedAtp: 0 }, { facilityId: "STORE_2", computedAtp: 3 }] }
    ];
    // STORE_1 lacks B, STORE_2 has only one A.
    expect(completeFacilities(products, new Map([["A", 2], ["B", 1]]))).toEqual([]);
    expect(completeFacilities(products, new Map([["A", 1], ["B", 1]]))).toEqual(["STORE_2"]);
  });

  it("finds nothing for a product the check didn't return", () => {
    expect(completeFacilities(shippingInventory, new Map([["10424", 1], ["MISSING", 1]]))).toEqual([]);
    expect(completeFacilities(shippingInventory, new Map())).toEqual([]);
  });
});

describe("itemsUnavailableElsewhere", () => {
  it("flags items no other location can ship", () => {
    const products = [
      { productId: "A", facilities: [{ facilityId: "HERE", computedAtp: 4 }, { facilityId: "STORE_2", computedAtp: 2 }] },
      { productId: "B", facilities: [{ facilityId: "HERE", computedAtp: 4 }, { facilityId: "STORE_2", computedAtp: 0 }, { facilityId: "STORE_3", computedAtp: 9, decisionReason: "AllowBrokeringFacility" }] }
    ];
    const items = [
      { orderItemSeqId: "00101", productId: "A", quantity: 1 },
      { orderItemSeqId: "00102", productId: "B", quantity: 1 },
      { orderItemSeqId: "00103", productId: "A", quantity: 3 }
    ];
    // B only has stock at the rejecting store; STORE_2 has 2 of A, not 3.
    expect(itemsUnavailableElsewhere(products, items, ["HERE"])).toEqual(["00102", "00103"]);
    expect(itemsUnavailableElsewhere(products, items)).toEqual([]);
  });
});

describe("splitDecision", () => {
  const base = { partialRejections: true, shipGroupUnits: 3, pickedUnits: 2 };

  it("rejects the whole order when more than one other location can ship all of it", () => {
    expect(splitDecision({ ...base, completeLocations: 2 })).toBe("whole");
    expect(splitDecision({ ...base, completeLocations: 13 })).toBe("whole");
  });

  it("keeps the partial rejection with one complete location or none", () => {
    expect(splitDecision({ ...base, completeLocations: 1 })).toBe("partial");
    expect(splitDecision({ ...base, completeLocations: 0 })).toBe("partial");
  });

  it("decides nothing when the rejection can't split the order", () => {
    expect(splitDecision({ ...base, partialRejections: false, completeLocations: 5 })).toBeUndefined();
    expect(splitDecision({ ...base, shipGroupUnits: 1, completeLocations: 5 })).toBeUndefined();
    expect(splitDecision({ ...base, pickedUnits: 0, completeLocations: 5 })).toBeUndefined();
  });
});

describe("facilitiesThatRejected", () => {
  it("lists stores that sent these items to rejected parking", () => {
    const changes = [
      { orderItemSeqId: "00101", facilityId: "SOUTH_JORDAN", fromFacilityId: "_NA_" },
      { orderItemSeqId: "00102", facilityId: "REJECTED_ITM_PARKING", fromFacilityId: "BROADWAY" },
      { orderItemSeqId: "00102", facilityId: "CENTERVILLE", fromFacilityId: "REJECTED_ITM_PARKING" },
      { orderItemSeqId: "00999", facilityId: "REJECTED_ITM_PARKING", fromFacilityId: "OREM" }
    ];
    expect([...facilitiesThatRejected(changes, ["00101", "00102"])]).toEqual(["BROADWAY"]);
  });
});

describe("buildWholeOrderRejections", () => {
  const rejected = {
    orderId: "10000",
    orderItemSeqId: "00102",
    productId: "10033",
    shipmentId: "10104",
    facilityId: "SOUTH_JORDAN",
    updateQOH: true,
    maySplit: "Y",
    cascadeRejectByProduct: "N",
    rejectionReasonId: "NOT_IN_STOCK",
    kitComponents: ["KIT_PART"],
    excludeOrderFacilityDuration: "2",
    comments: "Store Rejected Inventory"
  };

  it("keeps the associate's rejection and takes the rest of the ship group with one maySplit N entry", () => {
    const shipmentItems = [{ orderItemSeqId: "00101", shipmentItemSeqId: "00001" }];
    const rejections = buildWholeOrderRejections([rejected], shipGroupItems, shipmentItems);

    expect(rejections[0]).toBe(rejected);
    expect(rejections).toHaveLength(2);
    expect(rejections[1]).toMatchObject({
      orderId: "10000",
      orderItemSeqId: "00101",
      productId: "10424",
      shipmentItemSeqId: "00001",
      facilityId: "SOUTH_JORDAN",
      excludeOrderFacilityDuration: "2",
      updateQOH: false,
      maySplit: "N",
      cascadeRejectByProduct: "N",
      rejectionReasonId: AVOID_SPLIT_REJECTION_REASON_ID
    });
    expect(rejections[1]).not.toHaveProperty("kitComponents");
  });

  it("leaves units of a collaterally rejected product to the cascade", () => {
    const cascading = { ...rejected, cascadeRejectByProduct: "Y" };
    // 00103 is also 10033, so the cascade takes it; the extra entry goes on 00101.
    const rejections = buildWholeOrderRejections([cascading], shipGroupItems);
    expect(rejections.map((entry) => entry.orderItemSeqId)).toEqual(["00102", "00101"]);

    const sameProductOnly = shipGroupItems.filter((item) => item.productId === "10033");
    expect(buildWholeOrderRejections([cascading], sameProductOnly)).toEqual([cascading]);
  });

  it("adds nothing when every item is already rejected", () => {
    const all = shipGroupItems.map((item) => ({ ...rejected, orderItemSeqId: item.orderItemSeqId, productId: item.productId }));
    expect(buildWholeOrderRejections(all, shipGroupItems)).toEqual(all);
    expect(buildWholeOrderRejections([], shipGroupItems)).toEqual([]);
  });
});
