// Builds the cards of the In Progress and Completed pages from the shipments the sync stores. Pure: the product store
// settings and the products come in as arguments.

const VOIDED = "SHRSCS_VOIDED";
const KIT_PRODUCT_TYPE = "MARKETING_PKG_PICK";

export const SHIPMENT_CATEGORY = {
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed"
} as const;

const categoryOf = (shipment: any) => {
  if(shipment?.statusId === "SHIPMENT_APPROVED") {return SHIPMENT_CATEGORY.IN_PROGRESS;}
  if(shipment?.statusId === "SHIPMENT_PACKED" || shipment?.statusId === "SHIPMENT_SHIPPED") {return SHIPMENT_CATEGORY.COMPLETED;}

  return "";
};

// A kit and its components share an order item, and only the kit is shown.
export function withoutKitComponents(items: any[]) {
  const kitItemSeqIds = new Set(items.filter((item) => item.productTypeId === KIT_PRODUCT_TYPE).map((item) => item.orderItemSeqId));

  return items.filter((item) => item.productTypeId === KIT_PRODUCT_TYPE || !kitItemSeqIds.has(item.orderItemSeqId));
}

const customerNameOf = (shipment: any) => {
  if(shipment?.firstName && shipment?.lastName) {return `${shipment.firstName} ${shipment.lastName}`;}

  return shipment?.firstName || "";
};

// `requiresLabel`: the product store has shipping methods, so a packed shipment is expected to have tracking.
export function toShipmentView(shipment: any, { requiresLabel }: { requiresLabel: boolean }) {
  const routeSegments: any[] = shipment?.shipmentPackageRouteSegDetails ?? [];
  const activeSegments = routeSegments.filter((segment) => segment.carrierServiceStatusId !== VOIDED);
  const missingLabelImage = requiresLabel && (!activeSegments.length || activeSegments.some((segment) => !segment.trackingCode));

  const shipmentPackages = (shipment?.shipmentPackages ?? []).map((shipmentPackage: any) => {
    const segment = activeSegments.find((detail) => shipmentPackage.shipmentId === detail.shipmentId && shipmentPackage.shipmentPackageSeqId === detail.shipmentPackageSeqId);

    return { ...shipmentPackage, ...segment };
  });

  // The box an item sits in is the package its route segment names.
  const items = withoutKitComponents(shipment?.items ?? []).map((item: any) => {
    const packageName = routeSegments.find((segment) => segment.shipmentItemSeqId === item.shipmentItemSeqId)?.packageName || null;

    return { ...item, selectedBox: packageName, currentBox: packageName };
  });

  return {
    category: categoryOf(shipment),
    ...shipment,
    shipmentPackages,
    customerName: customerNameOf(shipment),
    items,
    missingLabelImage,
    trackingCode: activeSegments[0]?.trackingCode,
    // One entry per box with its own tracking code, for a shipment sent in several packages.
    packageTrackings: shipmentPackages
      .filter((shipmentPackage: any) => shipmentPackage.trackingCode)
      .map((shipmentPackage: any) => ({ packageName: shipmentPackage.packageName, trackingCode: shipmentPackage.trackingCode }))
  };
}

export interface ShipmentFilters {
  query?: string;
  picklistId?: string;
  carrierPartyId?: string;
  shipmentMethodTypeIds?: string[];
}

const text = (value: unknown) => String(value ?? "").toLowerCase();

// The search box: order, customer, tracking and the items' names and ids.
export function matchesQuery(view: any, query: string) {
  const needle = text(query).trim();
  if(!needle) {return true;}
  const haystack = [
    view.orderName, view.orderId, view.orderExternalId, view.shipmentId, view.customerName, view.trackingCode,
    ...(view.packageTrackings ?? []).map((tracking: any) => tracking.trackingCode),
    ...(view.items ?? []).flatMap((item: any) => [item.productId, item.internalName, item.productName])
  ];

  return haystack.some((value) => text(value).includes(needle));
}

export function filterShipments(views: any[], filters: ShipmentFilters) {
  return views.filter((view) => {
    if(filters.picklistId && view.picklistId !== filters.picklistId) {return false;}
    if(filters.carrierPartyId && view.carrierPartyId !== filters.carrierPartyId) {return false;}
    if(filters.shipmentMethodTypeIds?.length && !filters.shipmentMethodTypeIds.includes(view.shipmentMethodTypeId)) {return false;}

    return matchesQuery(view, filters.query ?? "");
  });
}

// In progress shipments go oldest order first, as they were picked. Completed ones newest first by when their wave made the
// shipment, so the order just packed is on top, then by order date.
export function sortShipments(views: any[], category: string) {
  const direction = category === SHIPMENT_CATEGORY.COMPLETED ? -1 : 1;
  const waveTime = (view: any) => (category === SHIPMENT_CATEGORY.COMPLETED ? Number(view.createdDate) || 0 : 0);

  return [...views].sort((a, b) =>
    (waveTime(b) - waveTime(a)) ||
    direction * ((Number(a.orderDate) || 0) - (Number(b.orderDate) || 0)) ||
    direction * String(a.shipmentId).localeCompare(String(b.shipmentId)));
}

// A picklist's chip: who is picking, and when it was made.
export function picklistView(row: any, formatTime: (millis: number) => string) {
  const roles = (row.roles ?? []).filter((role: any) => !role.thruDate);
  const pickersName = roles
    .map((role: any) => {
      if(role?.person) {return `${role.person.firstName} ${role.person.lastName}`;}
      if(role?.partyGroup) {return role.partyGroup.groupName;}

      return null;
    })
    .filter(Boolean)
    .join(", ");

  return {
    ...row,
    id: row.picklistId,
    date: row.picklistDate ? formatTime(Number(row.picklistDate)) : null,
    pickersName,
    pickerIds: roles.map((role: any) => role?.partyId)
  };
}
