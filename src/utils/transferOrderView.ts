// The Transfer Orders list, from the rows the sync stores. Pure: the page passes in what it shows and what it searched for.

export const TRANSFER_ORDER_PAGE_SIZE = 20;

const text = (value: unknown) => String(value ?? "").toLowerCase();

// The order as the detail page has always been handed it, with the shipped date the completed list shows.
export function toTransferOrderView(row: any) {
  return { ...(row.order ?? {}), orderId: row.orderId, orderName: row.orderName ?? row.order?.orderName, shipmentShippedDate: row.shippedDate ?? row.order?.shipmentShippedDate };
}

export function matchesTransferOrder(view: any, query: string) {
  const needle = text(query).trim();
  if(!needle) {return true;}

  return [view.orderName, view.orderId, view.orderExternalId, view.externalId].some((value) => text(value).includes(needle));
}

// Open ones newest first by order date; completed ones newest first by when they shipped.
export function sortTransferOrders(views: any[], stage: string) {
  const when = (view: any) => Number(stage === "completed" ? view.shipmentShippedDate || view.orderDate : view.orderDate) || 0;

  return [...views].sort((a, b) => when(b) - when(a) || String(b.orderId).localeCompare(String(a.orderId)));
}

export function filterTransferOrders(views: any[], query: string) {
  return views.filter((view) => matchesTransferOrder(view, query));
}
