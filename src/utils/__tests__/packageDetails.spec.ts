import { describe, expect, it } from "vitest";
import { convertWeight, formatBoxSize, formatWeight, isOverCarrierLimit, itemsMissingWeight, packageChanges, toPackageView, toPounds, weightBreakdown } from "@/utils/packageDetails";

describe("formatWeight", () => {
  it("shows the weight with its unit and at most two decimals", () => {
    expect(formatWeight(1.98, "WT_lb")).toBe("1.98 lb");
    expect(formatWeight("12.000", "WT_lb")).toBe("12 lb");
    expect(formatWeight(0.6614, "WT_lb")).toBe("0.66 lb");
    expect(formatWeight(2.5, "WT_kg")).toBe("2.5 kg");
  });

  it("is empty without a weight, and shows a unit it does not know in plain words", () => {
    expect(formatWeight(undefined, "WT_lb")).toBe("");
    expect(formatWeight(null, "WT_lb")).toBe("");
    expect(formatWeight("", "WT_lb")).toBe("");
    expect(formatWeight("abc", "WT_lb")).toBe("");
    expect(formatWeight(3, "WT_stone")).toBe("3 stone");
    expect(formatWeight(3, undefined)).toBe("3");
  });
});

describe("the carrier weight limit", () => {
  it("compares in pounds whatever the unit", () => {
    expect(toPounds(1, "WT_kg")).toBeCloseTo(2.2046, 3);
    expect(toPounds(16, "WT_oz")).toBe(1);
    expect(isOverCarrierLimit(150, "WT_lb")).toBe(false);
    expect(isOverCarrierLimit(150.01, "WT_lb")).toBe(true);
    expect(isOverCarrierLimit(70, "WT_kg")).toBe(true);
    expect(isOverCarrierLimit(60, "WT_kg")).toBe(false);
  });

  it("never judges a weight in a unit it does not know", () => {
    expect(toPounds(500, "WT_stone")).toBeUndefined();
    expect(isOverCarrierLimit(500, "WT_stone")).toBe(false);
    expect(isOverCarrierLimit(undefined, "WT_lb")).toBe(false);
  });
});

describe("formatBoxSize", () => {
  it("writes length, width and height with the unit", () => {
    expect(formatBoxSize(15, 10, 5, "LEN_in")).toBe("15 × 10 × 5 in");
    expect(formatBoxSize("20.5", 10, 10, "LEN_cm")).toBe("20.5 × 10 × 10 cm");
  });

  it("is empty when a side is missing, as for the BOPIS packaging", () => {
    expect(formatBoxSize(undefined, undefined, undefined, "LEN_in")).toBe("");
    expect(formatBoxSize(15, 10, null, "LEN_in")).toBe("");
  });
});

describe("itemsMissingWeight", () => {
  it("counts the items whose product has no shipping weight", () => {
    expect(itemsMissingWeight([{ productShippingWeight: 0.66 }, {}, { productShippingWeight: null }, { productShippingWeight: 0 }])).toHaveLength(2);
    expect(itemsMissingWeight(undefined)).toEqual([]);
  });
});

describe("toPackageView", () => {
  const shipmentPackage = {
    shipmentPackageSeqId: "01", packageWeight: 1.98, packageWeightUomId: "WT_lb", shipmentBoxTypeId: "YOURPACKNG",
    packageBoxLength: 15, packageBoxWidth: 10, packageBoxHeight: 5, packageDimensionUomId: "LEN_in",
    items: [{ productShippingWeight: 0.66 }, { productShippingWeight: 0.66 }]
  };

  it("puts the weight, box name and size into words", () => {
    expect(toPackageView(shipmentPackage, { YOURPACKNG: "Standard Box" })).toEqual({
      shipmentPackageSeqId: "01", weight: 1.98, weightUomId: "WT_lb", weightText: "1.98 lb", shipmentBoxTypeId: "YOURPACKNG",
      boxName: "Standard Box", boxSize: "15 × 10 × 5 in", isOverLimit: false, missingWeightCount: 0
    });
  });

  it("falls back to the box type id for the name, and flags an overweight package and items without a weight", () => {
    const view = toPackageView({ ...shipmentPackage, packageWeight: 726.2, items: [{}, { productShippingWeight: 1 }] });

    expect(view.boxName).toBe("YOURPACKNG");
    expect(view.isOverLimit).toBe(true);
    expect(view.missingWeightCount).toBe(1);
  });

  it("copes with a package the backend sent no details for (an older backend)", () => {
    const view = toPackageView({ shipmentPackageSeqId: "01", items: [] });

    expect(view).toMatchObject({ weightText: "", boxName: "", boxSize: "", isOverLimit: false });
    expect(view.weight).toBeUndefined();
  });
});

describe("packageChanges", () => {
  const view = { shipmentBoxTypeId: "YOURPACKNG", weight: 1.98, weightUomId: "WT_lb" };

  it("sends only what differs", () => {
    expect(packageChanges(view, { shipmentBoxTypeId: "YOURPACKNG", weight: "1.98" })).toEqual({});
    expect(packageChanges(view, { shipmentBoxTypeId: "LARGE_BOX", weight: 1.98 })).toEqual({ shipmentBoxTypeId: "LARGE_BOX" });
    expect(packageChanges(view, { shipmentBoxTypeId: "YOURPACKNG", weight: "25" })).toEqual({ weight: 25, weightUomId: "WT_lb" });
    expect(packageChanges(view, { shipmentBoxTypeId: "LARGE_BOX", weight: 30 })).toEqual({ shipmentBoxTypeId: "LARGE_BOX", weight: 30, weightUomId: "WT_lb" });
  });

  it("ignores an empty or unreadable weight and an empty box", () => {
    expect(packageChanges(view, { shipmentBoxTypeId: "", weight: "" })).toEqual({});
    expect(packageChanges(view, { weight: "abc" })).toEqual({});
  });
});

describe("convertWeight", () => {
  it("converts between the units it knows, through pounds", () => {
    expect(convertWeight(1, "WT_kg", "WT_lb")).toBeCloseTo(2.2046, 3);
    expect(convertWeight(16, "WT_oz", "WT_lb")).toBe(1);
    expect(convertWeight(2.2046226, "WT_lb", "WT_kg")).toBeCloseTo(1, 3);
  });

  it("keeps the number when the unit is the same, even one it does not know, and gives up on two it cannot compare", () => {
    expect(convertWeight(5, "WT_stone", "WT_stone")).toBe(5);
    expect(convertWeight(5, "WT_stone", "WT_lb")).toBeUndefined();
    expect(convertWeight(undefined, "WT_lb", "WT_lb")).toBeUndefined();
  });
});

describe("weightBreakdown", () => {
  const describe_ = (item: any) => ({ name: `Product ${item.productId}`, detail: item.size });

  it("gives what each product adds and their sum", () => {
    const result = weightBreakdown([
      { shipmentItemSeqId: "01", productId: "A", quantity: 3, productShippingWeight: 0.66, productWeightUomId: "WT_lb", size: "XS" },
      { shipmentItemSeqId: "02", productId: "B", quantity: 2, productShippingWeight: 1.25, productWeightUomId: "WT_lb" }
    ], "WT_lb", describe_);

    expect(result.rows.map((row) => [row.name, row.quantity, row.unitText, row.contribution, row.contributionText])).toEqual([
      ["Product A", 3, "0.66 lb", 1.98, "1.98 lb"],
      ["Product B", 2, "1.25 lb", 2.5, "2.5 lb"]
    ]);
    expect(result.rows[0].detail).toBe("XS");
    expect(result.estimate).toBe(4.48);
    expect(result.estimateText).toBe("4.48 lb");
    expect(result.missingCount).toBe(0);
  });

  it("states a product without a weight as having none, counts it as nothing and says how many", () => {
    const result = weightBreakdown([
      { productId: "A", quantity: 3, productShippingWeight: 0.66, productWeightUomId: "WT_lb" },
      { productId: "B", quantity: 4 }
    ], "WT_lb", describe_);

    expect(result.rows[1]).toMatchObject({ unitWeight: undefined, unitText: "", contribution: undefined, contributionText: "" });
    expect(result.estimate).toBe(1.98);
    expect(result.missingCount).toBe(1);
  });

  it("converts a product weight into the unit of the package", () => {
    const result = weightBreakdown([{ productId: "A", quantity: 2, productShippingWeight: 16, productWeightUomId: "WT_oz" }], "WT_lb", describe_);

    expect(result.rows[0].unitText).toBe("1 lb");
    expect(result.estimate).toBe(2);
  });

  it("has no estimate when no product has a weight, or there are no items", () => {
    expect(weightBreakdown([{ productId: "A", quantity: 1 }], "WT_lb", describe_)).toMatchObject({ estimate: undefined, estimateText: "", missingCount: 1 });
    expect(weightBreakdown(undefined, "WT_lb", describe_)).toMatchObject({ rows: [], estimate: undefined, missingCount: 0 });
  });
});
