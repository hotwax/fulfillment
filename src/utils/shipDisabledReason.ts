export interface ShipmentForShipping {
  statusId?: string;
  hasMissingShipmentInfo?: boolean;
  hasMissingPackageInfo?: boolean;
  isTrackingRequired?: string;
  trackingCode?: string | null;
}

export const TRACKING_REQUIRED = "Tracking number required.";

export function getShipDisabledReason(order: ShipmentForShipping, canShip: boolean, canForceShip: boolean) {
  if(!canShip) {return "Your role does not have permission to ship orders.";}
  if(order.hasMissingShipmentInfo || order.hasMissingPackageInfo) {return "Shipment or package details could not be loaded. Refresh the page to try again.";}
  if(order.isTrackingRequired === "Y" && !order.trackingCode && !canForceShip) {
    return TRACKING_REQUIRED;
  }

  return "";
}
