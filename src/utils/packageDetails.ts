// The weight, box and size of the packages of a transfer shipment, as the Ship page shows them. poorti/transferShipments gives
// each package packageWeight (+ packageWeightUomId), packageBoxLength/Width/Height (+ packageDimensionUomId), shipmentBoxTypeId, and
// for each item productShippingWeight (+ productWeightUomId), the weight of one unit.

// FedEx's limit for one package. A heavier one is refused when the label is made.
export const CARRIER_PACKAGE_WEIGHT_LIMIT_LB = 150;

const WEIGHT_UNIT_LABELS: Record<string, string> = { WT_lb: "lb", WT_kg: "kg", WT_oz: "oz", WT_g: "g" };
const POUNDS_PER_UNIT: Record<string, number> = { WT_lb: 1, WT_kg: 2.20462262, WT_oz: 1 / 16, WT_g: 0.00220462262 };
const LENGTH_UNIT_LABELS: Record<string, string> = { LEN_in: "in", LEN_ft: "ft", LEN_cm: "cm", LEN_mm: "mm", LEN_m: "m" };

const toNumber = (value: any) => {
  if(value === null || value === undefined || value === "") {return undefined;}
  const number = Number(value);

  return Number.isFinite(number) ? number : undefined;
};

// At most two decimals, none when whole: 1.98, 12, 0.5.
const trimmed = (value: number) => `${Math.round(value * 100) / 100}`;

export const weightUnitLabel = (uomId?: string) => WEIGHT_UNIT_LABELS[uomId ?? ""] ?? (uomId ?? "").replace(/^WT_/, "");

export function formatWeight(weight: any, uomId?: string) {
  const number = toNumber(weight);
  if(number === undefined) {return "";}

  return [trimmed(number), weightUnitLabel(uomId)].filter(Boolean).join(" ");
}

// Undefined when the unit is not one it knows, so a weight is never judged against the limit in the wrong unit.
export function toPounds(weight: any, uomId?: string) {
  const number = toNumber(weight);
  const factor = POUNDS_PER_UNIT[uomId ?? ""];

  return number === undefined || factor === undefined ? undefined : number * factor;
}

// A weight in another unit, through pounds. Undefined when either unit is not one it knows (and they differ).
export function convertWeight(weight: any, fromUomId?: string, toUomId?: string) {
  const number = toNumber(weight);
  if(number === undefined) {return undefined;}
  if(fromUomId === toUomId) {return number;}

  const fromFactor = POUNDS_PER_UNIT[fromUomId ?? ""];
  const toFactor = POUNDS_PER_UNIT[toUomId ?? ""];

  return fromFactor === undefined || toFactor === undefined ? undefined : number * fromFactor / toFactor;
}

const roundWeight = (value: number) => Math.round(value * 100) / 100;

export interface WeightRow {
  key: string;
  name: string;
  detail: string;
  quantity: number;
  // The weight of one unit, in the package's unit. Undefined when the product has none on file.
  unitWeight?: number;
  unitText: string;
  // quantity times unitWeight, in the package's unit.
  contribution?: number;
  contributionText: string;
}

// What each product adds to the package weight: quantity times the weight of one unit, in the unit of the package. The sum is the
// estimate the package gets when it is made. describe gives the words for an item; weightUomId is the unit of the package.
export function weightBreakdown(items: any[] | undefined, weightUomId: string | undefined, describe: (item: any) => { name: string; detail?: string }) {
  const rows: WeightRow[] = (items ?? []).map((item, index) => {
    const quantity = toNumber(item.quantity) ?? 0;
    const unitWeight = convertWeight(item.productShippingWeight, item.productWeightUomId || weightUomId, weightUomId);
    const contribution = unitWeight === undefined ? undefined : roundWeight(quantity * unitWeight);
    const { name, detail } = describe(item);

    return {
      key: `${item.shipmentItemSeqId ?? index}`,
      name,
      detail: detail ?? "",
      quantity,
      unitWeight,
      unitText: formatWeight(unitWeight, weightUomId),
      contribution,
      contributionText: formatWeight(contribution, weightUomId)
    };
  });
  const weighed = rows.filter((row) => row.contribution !== undefined);
  const estimate = weighed.length ? roundWeight(weighed.reduce((sum, row) => sum + (row.contribution as number), 0)) : undefined;

  return { rows, estimate, estimateText: formatWeight(estimate, weightUomId), missingCount: rows.length - weighed.length };
}

export function isOverCarrierLimit(weight: any, uomId?: string, limitLb = CARRIER_PACKAGE_WEIGHT_LIMIT_LB) {
  const pounds = toPounds(weight, uomId);

  return pounds !== undefined && pounds > limitLb;
}

// "15 × 10 × 5 in". Empty when the box has no size (BOPIS packaging).
export function formatBoxSize(length: any, width: any, height: any, uomId?: string) {
  const sides = [length, width, height].map(toNumber);
  if(sides.some((side) => side === undefined)) {return "";}

  const unit = LENGTH_UNIT_LABELS[uomId ?? ""] ?? (uomId ?? "").replace(/^LEN_/, "");

  return `${sides.map((side) => trimmed(side as number)).join(" × ")}${unit ? ` ${unit}` : ""}`;
}

// Items whose product has no shipping weight count as nothing in the package weight, so the weight (and the rates) may be too low.
export function itemsMissingWeight(items: any[] | undefined) {
  return (items ?? []).filter((item) => toNumber(item.productShippingWeight) === undefined);
}

export interface PackageView {
  shipmentPackageSeqId: string;
  weight?: number;
  weightUomId?: string;
  weightText: string;
  shipmentBoxTypeId?: string;
  boxName: string;
  boxSize: string;
  isOverLimit: boolean;
  missingWeightCount: number;
}

// boxDescriptions: shipmentBoxTypeId -> description, for the name of the box.
export function toPackageView(shipmentPackage: any, boxDescriptions: Record<string, string> = {}): PackageView {
  const weight = toNumber(shipmentPackage.packageWeight);
  const boxTypeId = shipmentPackage.shipmentBoxTypeId || undefined;

  return {
    shipmentPackageSeqId: shipmentPackage.shipmentPackageSeqId,
    weight,
    weightUomId: shipmentPackage.packageWeightUomId,
    weightText: formatWeight(weight, shipmentPackage.packageWeightUomId),
    shipmentBoxTypeId: boxTypeId,
    boxName: boxTypeId ? boxDescriptions[boxTypeId] || boxTypeId : "",
    boxSize: formatBoxSize(shipmentPackage.packageBoxLength, shipmentPackage.packageBoxWidth, shipmentPackage.packageBoxHeight, shipmentPackage.packageDimensionUomId),
    isOverLimit: isOverCarrierLimit(weight, shipmentPackage.packageWeightUomId),
    missingWeightCount: itemsMissingWeight(shipmentPackage.items).length
  };
}

// The payload of the change: only what differs from the package, so an unchanged field is not written.
export function packageChanges(view: Pick<PackageView, "shipmentBoxTypeId" | "weight" | "weightUomId">, form: { shipmentBoxTypeId?: string; weight?: any }) {
  const changes: { shipmentBoxTypeId?: string; weight?: number; weightUomId?: string } = {};
  if(form.shipmentBoxTypeId && form.shipmentBoxTypeId !== view.shipmentBoxTypeId) {changes.shipmentBoxTypeId = form.shipmentBoxTypeId;}

  const weight = toNumber(form.weight);
  if(weight !== undefined && weight !== view.weight) {
    changes.weight = weight;
    if(view.weightUomId) {changes.weightUomId = view.weightUomId;}
  }

  return changes;
}
