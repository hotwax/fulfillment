import { commonUtil, logger } from "@common";
import { ensureDbReady, projectRows, setupAppDbSync } from "@common/db";
import { reactive } from "vue";
import { OPEN_ORDERS_DOMAIN, ORDER_ITEMS_DOMAIN, liveOrderDomains } from "./domains";
import { fulfillmentDb } from "./fulfillmentDb";
import fulfillmentSyncWorkerUrl from "./fulfillmentSync.worker.ts?worker&url";

export const liveOrdersStatus = reactive({
  running: false,
  // The last open orders sync whose items are in too.
  lastSyncAt: 0
});

let activeOms = "";
let starting: Promise<void> | null = null;
let openOrdersSyncedAt = 0;
let focusedFacilityId: string | undefined;

// The instance the sync started for, so logout clears the database it filled.
fulfillmentDb.setOmsInstanceResolver(() => activeOms || commonUtil.getOMSInstanceName());

const appDbSync = setupAppDbSync({
  db: fulfillmentDb,
  getWorkerUrl: () => new URL(fulfillmentSyncWorkerUrl, import.meta.url),
  onStatus: (status) => {
    if(status.type !== "sync-end") {return;}
    if(status.domain === OPEN_ORDERS_DOMAIN) {openOrdersSyncedAt = Date.now();}
    if(status.domain === ORDER_ITEMS_DOMAIN) {liveOrdersStatus.lastSyncAt = openOrdersSyncedAt;}
  }
});
const syncOwner = appDbSync.createSyncDomainOwner("liveOpenOrders");

// Returns whether the set of facilities changed.
async function writeMasterFacilities(facilities: any[]): Promise<boolean> {
  const db = fulfillmentDb.raw();
  // Pinia hands out reactive proxies, which IndexedDB can't clone. Before facilities load, the store holds `{}`.
  const plain = JSON.parse(JSON.stringify(Array.isArray(facilities) ? facilities : []));
  const fresh = projectRows(plain, fulfillmentDb.entities.userFacilities, Date.now());
  const freshKeys = fresh.map((row) => String(row.facilityId)).sort();
  const storedKeys = (await db.table("userFacilities").toCollection().primaryKeys()).map(String).sort();
  if(freshKeys.join(",") === storedKeys.join(",")) {return false;}

  await db.transaction("rw", ["userFacilities"], async () => {
    await db.table("userFacilities").clear();
    if(fresh.length) {await db.table("userFacilities").bulkPut(fresh);}
  });

  return true;
}

async function start(facilities: any[]): Promise<void> {
  activeOms = commonUtil.getOMSInstanceName();
  await ensureDbReady(fulfillmentDb.raw());
  await writeMasterFacilities(facilities);
  await appDbSync.startAppDbSync();
  if(!appDbSync.syncService()) {throw new Error(appDbSync.bootstrapState.errors.__start || "The sync worker did not start");}

  await appDbSync.activateSyncDomains(liveOrderDomains(focusedFacilityId), syncOwner);
  // Run the live domains now rather than on the harness's next tick.
  await appDbSync.syncNow().catch((error) => logger.error("Failed the first live order sync", error));
}

// Later calls only refresh the facility master list.
export async function startLiveOrdersSync(facilities: any[]): Promise<void> {
  if(starting) {
    await starting;
    await syncMasterFacilities(facilities);

    return;
  }

  liveOrdersStatus.running = true;
  starting = start(facilities).catch((error) => {
    logger.error("Failed to start the live order sync", error);
    liveOrdersStatus.running = false;
  });
  await starting;
}

// The Open page's facility gets its items first.
export async function focusLiveOrders(facilityId?: string): Promise<void> {
  focusedFacilityId = facilityId;
  if(appDbSync.syncService()) {await appDbSync.activateSyncDomains(liveOrderDomains(facilityId), syncOwner);}
}

export async function syncMasterFacilities(facilities: any[]): Promise<void> {
  if(!starting || !liveOrdersStatus.running) {return;}
  if(await writeMasterFacilities(facilities)) {await refreshLiveOrders();}
}

export async function refreshLiveOrders(domainNames: string[] = liveOrderDomains().map((domain) => domain.name)): Promise<void> {
  if(!liveOrdersStatus.running) {return;}
  try {
    for(const name of domainNames) {await appDbSync.resyncDomain(name);}
  } catch (error) {
    logger.error("Failed to refresh live orders", error);
  }
}

// Ahead of the confirming resync.
export async function removeOpenOrdersLocally(items: Array<{ orderId: string; shipGroupSeqId: string }>): Promise<void> {
  if(!items.length || !liveOrdersStatus.running) {return;}
  const keys = items.map((item) => [item.orderId, item.shipGroupSeqId]);
  const db = fulfillmentDb.raw();
  await db.transaction("rw", ["orders", "orderItems"], async () => {
    await db.table("orders").bulkDelete(keys);
    await db.table("orderItems").where("[orderId+shipGroupSeqId]").anyOf(keys).delete();
  });
}

export async function stopLiveOrdersSync(): Promise<void> {
  liveOrdersStatus.running = false;
  liveOrdersStatus.lastSyncAt = 0;
  openOrdersSyncedAt = 0;
  starting = null;
  await appDbSync.deactivateSyncDomains(syncOwner).catch((error) => logger.error("Failed to stop the live order sync", error));
  // Terminates the worker and clears the tables of the instance the sync started for.
  await appDbSync.stopAppDbSync();
  activeOms = "";
}
