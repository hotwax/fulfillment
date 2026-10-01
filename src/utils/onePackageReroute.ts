/**
 * One-package reroute: when a store rejects part of a multi-unit ship group and more than one
 * other location can ship every item in it, the whole ship group is rejected instead of only the
 * missing units, so order routing can place it in one package. Otherwise the partial rejection
 * runs as before.
 *
 * Availability comes from ofbiz-oms-usl checkShippingInventory. For each product and facility it
 * returns computedAtp (ATP net of the facility's safety stock) and a decisionReason when the
 * facility can't ship that product for the product store.
 */

/** The parking facility reject#OrderItem moves rejected items to. */
export const REJECTED_PARKING_FACILITY_ID = "REJECTED_ITM_PARKING";
export const AVOID_SPLIT_REJECTION_REASON_ID = "REJ_AVOID_ORD_SPLIT";
/** The whole ship group is rejected only when more than one other location can ship all of it. */
export const MIN_COMPLETE_LOCATIONS = 2;

export interface ShipGroupItem {
  orderItemSeqId: string;
  productId: string;
  quantity: number | string;
}

export interface ShippingInventoryFacility {
  facilityId: string;
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

/** Units needed of each product to ship the ship group in full. */
export function requiredQuantities(items: ShipGroupItem[]) {
  const required = new Map<string, number>();
  for(const item of items) {
    const productId = String(item.productId);
    required.set(productId, (required.get(productId) ?? 0) + (Number(item.quantity) || 0));
  }

  return required;
}

/** Facilities that already rejected any of these items, read from the order's facility change history. */
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

/**
 * The facilities that can ship this quantity of the product. A facility doesn't count if it is
 * excluded, has a decision reason for the product, or has no order capacity left today.
 */
function facilitiesWithStock(products: ShippingInventoryProduct[], productId: string, quantity: number, excluded: Set<string>) {
  const product = products.find((candidate) => String(candidate.productId) === String(productId));

  return new Set((product?.facilities ?? [])
    .filter((facility) => !excluded.has(String(facility.facilityId)) && canShip(facility, quantity))
    .map((facility) => String(facility.facilityId)));
}

/** The facilities that can ship every product in full, sorted by ID. */
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

/** The items no other facility can ship, by orderItemSeqId. */
export function itemsUnavailableElsewhere(products: ShippingInventoryProduct[], items: ShipGroupItem[], excludedFacilityIds: Iterable<string> = []) {
  const excluded = new Set(excludedFacilityIds);

  return items
    .filter((item) => !facilitiesWithStock(products, item.productId, Number(item.quantity) || 0, excluded).size)
    .map((item) => String(item.orderItemSeqId));
}

export type SplitDecision = "whole" | "partial";

/**
 * What a rejection does to the ship group: "whole" when more than one other location can ship all
 * of it, "partial" otherwise. Undefined when nothing would split: partial rejections are off, the
 * ship group has a single unit, or every unit is rejected.
 */
export function splitDecision({ partialRejections, shipGroupUnits, pickedUnits, completeLocations }: {
  partialRejections: boolean;
  shipGroupUnits: number;
  pickedUnits: number;
  completeLocations: number;
}): SplitDecision | undefined {
  if(!partialRejections || shipGroupUnits < 2 || pickedUnits < 1) {return undefined;}

  return completeLocations >= MIN_COMPLETE_LOCATIONS ? "whole" : "partial";
}

/**
 * The rejections that take the whole ship group off this store.
 *
 * The associate's rejections go as entered. One more entry, on an item they didn't reject, has
 * maySplit N, so reject#OrderItems also takes every other item of the ship group, with reason
 * REJ_AVOID_ORD_SPLIT. The associate's own entries keep their settings, so collateral rejection
 * treats other orders as it does today.
 */
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
