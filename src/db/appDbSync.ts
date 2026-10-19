import { commonUtil, logger } from "@common";
import { setupAppDbSync } from "@common/db";
import { reactive } from "vue";
import { LIVE_ORDERS_CHANNEL, OPEN_ORDERS_DOMAIN, ORDER_ITEMS_DOMAIN, PICKLISTS_DOMAIN, PRODUCTS_DOMAIN, SHIPMENTS_DOMAIN, liveOrderDomains } from "./domains";
import { fulfillmentDb, orderKeyOf } from "./fulfillmentDb";
import fulfillmentSyncWorkerUrl from "./fulfillmentSync.worker.ts?worker&url";

export const liveOrdersStatus = reactive({
  running: false,
  // The last open orders sync whose items are in too.
  lastSyncAt: 0,
  // This session's first open orders sync.
  firstSyncAt: 0,
  // When each facility's own items and products pass last finished.
  facilitySyncedAt: {} as Record<string, number>,
  // Orders a picklist just took, hidden until the confirming open orders pass has pruned them.
  hiddenOrderKeys: new Set<string>(),
  // Shipments just packed or rejected, hidden until the confirming shipments pass has pruned them.
  hiddenShipmentIds: new Set<string>()
});

let activeOms = "";
let starting: Promise<void> | null = null;
let openOrdersSyncedAt = 0;
let focusedFacilityId: string | undefined;
let focusedProductStoreId: string | undefined;
// The user's facilities, handed to the open orders domain as args: the worker can't read the store.
let masterFacilityIds: string[] = [];

// The instance the sync started for, so logout clears the database it filled.
fulfillmentDb.setOmsInstanceResolver(() => activeOms || commonUtil.getOMSInstanceName());

const appDbSync = setupAppDbSync({
  db: fulfillmentDb,
  getWorkerUrl: () => new URL(fulfillmentSyncWorkerUrl, import.meta.url),
  onStatus: (status) => {
    if(status.type !== "sync-end") {return;}
    // The worker's clock, as the facility announcements use.
    if(status.domain === OPEN_ORDERS_DOMAIN) {
      openOrdersSyncedAt = Number(status.at) || Date.now();
      liveOrdersStatus.firstSyncAt ||= openOrdersSyncedAt;
    }
    if(status.domain === ORDER_ITEMS_DOMAIN) {liveOrdersStatus.lastSyncAt = openOrdersSyncedAt;}
  }
});
const syncOwner = appDbSync.createSyncDomainOwner("liveOpenOrders");

if(typeof BroadcastChannel !== "undefined") {
  new BroadcastChannel(LIVE_ORDERS_CHANNEL).addEventListener("message", ({ data }) => {
    if(data?.type === "facility-synced" && liveOrdersStatus.running) {liveOrdersStatus.facilitySyncedAt[data.facilityId] = data.at;}
  });
}

// Returns whether the set of facilities changed.
function setMasterFacilities(facilities: any[]): boolean {
  // Before facilities load, the store holds `{}`.
  const ids = (Array.isArray(facilities) ? facilities : []).map((facility) => String(facility?.facilityId ?? "")).filter(Boolean).sort();
  if(ids.join(",") === masterFacilityIds.join(",")) {return false;}
  masterFacilityIds = ids;

  return true;
}

async function start(facilities: any[]): Promise<void> {
  activeOms = commonUtil.getOMSInstanceName();
  setMasterFacilities(facilities);
  await appDbSync.startAppDbSync();
  if(!appDbSync.syncService()) {throw new Error(appDbSync.bootstrapState.errors.__start || "The sync worker did not start");}

  await appDbSync.activateSyncDomains(liveOrderDomains(focusedFacilityId, masterFacilityIds, focusedProductStoreId), syncOwner);
  // Run the live domains now rather than on the harness's next tick.
  await appDbSync.syncNow().catch((error) => logger.error("Failed the first live order sync", error));
}

// Later calls only refresh the facility master list. The facility, when known, gets its items and products first.
export async function startLiveOrdersSync(facilities: any[], facilityId?: string, productStoreId?: string): Promise<void> {
  if(starting) {
    await starting;
    await syncMasterFacilities(facilities);

    return;
  }

  if(facilityId) {focusedFacilityId = facilityId;}
  if(productStoreId) {focusedProductStoreId = productStoreId;}
  liveOrdersStatus.running = true;
  starting = start(facilities).catch((error) => {
    logger.error("Failed to start the live order sync", error);
    liveOrdersStatus.running = false;
  });
  await starting;
}

// The Open page's facility gets its items and products first. A newly focused one gets them now, rather than on the next tick.
export async function focusLiveOrders(facilityId?: string, productStoreId?: string): Promise<void> {
  const changed = facilityId !== focusedFacilityId || (!!productStoreId && productStoreId !== focusedProductStoreId);
  focusedFacilityId = facilityId;
  if(productStoreId) {focusedProductStoreId = productStoreId;}
  if(!appDbSync.syncService()) {return;}
  await appDbSync.activateSyncDomains(liveOrderDomains(facilityId, masterFacilityIds, focusedProductStoreId), syncOwner);
  if(changed && facilityId) {await refreshLiveOrders([SHIPMENTS_DOMAIN, PICKLISTS_DOMAIN, ORDER_ITEMS_DOMAIN, PRODUCTS_DOMAIN]);}
}

export async function syncMasterFacilities(facilities: any[]): Promise<void> {
  if(!starting || !liveOrdersStatus.running) {return;}
  if(!setMasterFacilities(facilities)) {return;}
  await appDbSync.activateSyncDomains(liveOrderDomains(focusedFacilityId, masterFacilityIds, focusedProductStoreId), syncOwner);
  await refreshLiveOrders();
}

export async function refreshLiveOrders(domainNames: string[] = [OPEN_ORDERS_DOMAIN, SHIPMENTS_DOMAIN, PICKLISTS_DOMAIN, ORDER_ITEMS_DOMAIN, PRODUCTS_DOMAIN]): Promise<void> {
  if(!liveOrdersStatus.running) {return;}
  try {
    for(const name of domainNames) {await appDbSync.resyncDomain(name);}
    // The open orders pass has pruned what a picklist took, so the local hiding is no longer needed.
    if(domainNames.includes(OPEN_ORDERS_DOMAIN)) {liveOrdersStatus.hiddenOrderKeys.clear();}
    if(domainNames.includes(SHIPMENTS_DOMAIN)) {liveOrdersStatus.hiddenShipmentIds.clear();}
  } catch (error) {
    logger.error("Failed to refresh live orders", error);
  }
}

// Ahead of the confirming resync. Only a sync domain writes the tables, so the orders are hidden in memory.
export function removeOpenOrdersLocally(items: Array<{ orderId: string; shipGroupSeqId: string }>): void {
  if(!items.length || !liveOrdersStatus.running) {return;}
  items.forEach((item) => {
    const key = orderKeyOf(item.orderId, item.shipGroupSeqId);
    if(key) {liveOrdersStatus.hiddenOrderKeys.add(key);}
  });
}

// Ahead of the confirming resync, as for open orders.
export function hideShipmentsLocally(shipmentIds: string[]): void {
  if(!shipmentIds.length || !liveOrdersStatus.running) {return;}
  shipmentIds.forEach((shipmentId) => liveOrdersStatus.hiddenShipmentIds.add(String(shipmentId)));
}

export async function stopLiveOrdersSync(): Promise<void> {
  liveOrdersStatus.running = false;
  liveOrdersStatus.lastSyncAt = 0;
  liveOrdersStatus.firstSyncAt = 0;
  liveOrdersStatus.facilitySyncedAt = {};
  liveOrdersStatus.hiddenOrderKeys.clear();
  liveOrdersStatus.hiddenShipmentIds.clear();
  masterFacilityIds = [];
  focusedProductStoreId = undefined;
  openOrdersSyncedAt = 0;
  starting = null;
  await appDbSync.deactivateSyncDomains(syncOwner).catch((error) => logger.error("Failed to stop the live order sync", error));
  // Terminates the worker and clears the tables of the instance the sync started for.
  await appDbSync.stopAppDbSync();
  activeOms = "";
}
