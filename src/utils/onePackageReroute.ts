// When a store rejects part of a multi-unit ship group and more than one other location can ship all of it,
// the whole ship group is rejected so order routing can place it in one package.

// Where reject#OrderItem moves rejected items.
const REJECTED_PARKING_FACILITY_ID = "REJECTED_ITM_PARKING";
export const AVOID_SPLIT_REJECTION_REASON_ID = "REJ_AVOID_ORD_SPLIT";
export const MIN_COMPLETE_LOCATIONS = 2;

export interface ShipGroupItem {
  orderItemSeqId: string;
  productId: string;
  quantity: number | string;
}

interface ShippingInventoryFacility {
  facilityId: string;
  // ATP net of the facility's safety stock.
  computedAtp?: number | string | null;
  facilityRemainingOrderCapacity?: number | string | null;
  decisionReason?: string | null;
}

export interface ShippingInventoryProduct {
  productId: string;
  facilities?: ShippingInventoryFacility[];
}

export interface OrderFacilityChange {
  orderItemSeqId?: string;
  facilityId?: string;
  fromFacilityId?: string;
}

export function unitCount(items: Array<{ quantity?: number | string }>) {
  return items.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
}

export function requiredQuantities(items: ShipGroupItem[]) {
  const required = new Map<string, number>();
  for(const item of items) {
    const productId = String(item.productId);
    required.set(productId, (required.get(productId) ?? 0) + (Number(item.quantity) || 0));
  }

  return required;
}

export function facilitiesThatRejected(changes: OrderFacilityChange[], orderItemSeqIds: string[]) {
  const seqIds = new Set(orderItemSeqIds.map(String));

  return new Set(changes
    .filter((change) => change.facilityId === REJECTED_PARKING_FACILITY_ID && change.fromFacilityId && seqIds.has(String(change.orderItemSeqId)))
    .map((change) => String(change.fromFacilityId)));
}

const canShip = (facility: ShippingInventoryFacility, quantity: number) => {
  const capacity = facility.facilityRemainingOrderCapacity;
  const hasNoCapacity = capacity !== null && capacity !== undefined && Number(capacity) <= 0;

  return !facility.decisionReason && !hasNoCapacity && (Number(facility.computedAtp) || 0) >= quantity;
};

function facilitiesWithStock(products: ShippingInventoryProduct[], productId: string, quantity: number, excluded: Set<string>) {
  const product = products.find((candidate) => String(candidate.productId) === String(productId));

  return new Set((product?.facilities ?? [])
    .filter((facility) => !excluded.has(String(facility.facilityId)) && canShip(facility, quantity))
    .map((facility) => String(facility.facilityId)));
}

export function completeFacilities(products: ShippingInventoryProduct[], required: Map<string, number>, excludedFacilityIds: Iterable<string> = []) {
  const excluded = new Set(excludedFacilityIds);
  let complete: Set<string> | undefined;

  for(const [productId, quantity] of required) {
    const covering = facilitiesWithStock(products, productId, quantity, excluded);
    complete = complete ? new Set([...complete].filter((facilityId) => covering.has(facilityId))) : covering;
    if(!complete.size) {return [];}
  }

  return complete ? [...complete].sort() : [];
}

export function itemsUnavailableElsewhere(products: ShippingInventoryProduct[], items: ShipGroupItem[], excludedFacilityIds: Iterable<string> = []) {
  const excluded = new Set(excludedFacilityIds);

  return items
    .filter((item) => !facilitiesWithStock(products, item.productId, Number(item.quantity) || 0, excluded).size)
    .map((item) => String(item.orderItemSeqId));
}

export type SplitDecision = "whole" | "partial";

// Undefined when nothing would split: partial rejections are off, there is one unit, or every unit is rejected.
export function splitDecision({ partialRejections, shipGroupUnits, pickedUnits, completeLocations }: {
  partialRejections: boolean;
  shipGroupUnits: number;
  pickedUnits: number;
  completeLocations: number;
}): SplitDecision | undefined {
  if(!partialRejections || shipGroupUnits < 2 || pickedUnits < 1) {return undefined;}

  return completeLocations >= MIN_COMPLETE_LOCATIONS ? "whole" : "partial";
}

// The associate's rejections go as entered, plus one entry with maySplit N on an item they didn't reject,
// so reject#OrderItems takes the rest of the ship group too.
export function buildWholeOrderRejections(rejectedOrderItems: any[], shipGroupItems: ShipGroupItem[], shipmentItems: any[] = []) {
  const [template] = rejectedOrderItems;
  if(!template) {return rejectedOrderItems;}

  const rejectedSeqIds = new Set(rejectedOrderItems.map((item) => String(item.orderItemSeqId)));
  // Collateral rejection already takes this store's other units of a rejected product.
  const cascadedProductIds = new Set(rejectedOrderItems.filter((item) => item.cascadeRejectByProduct === "Y").map((item) => String(item.productId)));
  const remaining = shipGroupItems.find((item) => !rejectedSeqIds.has(String(item.orderItemSeqId)) && !cascadedProductIds.has(String(item.productId)));
  if(!remaining) {return rejectedOrderItems;}

  const shipmentItem = shipmentItems.find((item) => String(item.orderItemSeqId) === String(remaining.orderItemSeqId));
  const entry = { ...template };
  delete entry.kitComponents;

  return [...rejectedOrderItems, {
    ...entry,
    orderItemSeqId: remaining.orderItemSeqId,
    productId: remaining.productId,
    shipmentItemSeqId: shipmentItem?.shipmentItemSeqId,
    updateQOH: false,
    maySplit: "N",
    cascadeRejectByProduct: "N",
    rejectionReasonId: AVOID_SPLIT_REJECTION_REASON_ID,
    comments: "Rejected with the rest of the order so it ships in one package"
  }];
}
