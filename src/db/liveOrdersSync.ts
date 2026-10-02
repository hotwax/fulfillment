// When the worker can't start (for example a host that loads this app from another origin, where browsers
// refuse a cross-origin worker script), the same domains run on the main thread on the same cadence.

import { commonUtil, logger } from "@common";
import { clearDatabaseTables, ensureDbReady, getSyncDomain, projectRows, registerDomains, setupAppDbSync } from "@common/db";
import { reactive } from "vue";
import { deviceSettings, loadDeviceSettings } from "./deviceSettings";
import { FULFILLMENT_SYNC_DOMAINS, LIVE_ORDERS_INTERVAL_MS, LIVE_ORDER_DOMAINS, OPEN_ORDERS_DOMAIN, resetLiveOrderDomains } from "./domains";
import { fulfillmentDb } from "./fulfillmentDb";
import fulfillmentSyncWorkerUrl from "./fulfillmentSync.worker.ts?worker&url";

// A worker that loads posts its first status within moments; one that never answers didn't load.
const WORKER_START_TIMEOUT_MS = 20_000;

export const liveOrdersStatus = reactive({
  mode: "off" as "off" | "worker" | "main",
  lastSyncAt: 0,
  syncing: false
});

let activeOms = "";
let starting: Promise<void> | null = null;
let mainThreadTimer: ReturnType<typeof setInterval> | null = null;
let mainThreadRunning = false;
let workerAnswered = false;

// The instance the sync started for, so logout clears the database it filled.
fulfillmentDb.setOmsInstanceResolver(() => activeOms || commonUtil.getOMSInstanceName());
// The same domains in this thread's registry, for the main-thread fallback.
registerDomains(FULFILLMENT_SYNC_DOMAINS);

const appDbSync = setupAppDbSync({
  db: fulfillmentDb,
  getWorkerUrl: () => new URL(fulfillmentSyncWorkerUrl, import.meta.url),
  onStatus: (status) => {
    workerAnswered = true;
    if(status.type === "sync-end" && status.domain === OPEN_ORDERS_DOMAIN) {liveOrdersStatus.lastSyncAt = Date.now();}
  }
});
const syncOwner = appDbSync.createSyncDomainOwner("liveOpenOrders");

function mainThreadContext() {
  return {
    token: commonUtil.getToken() || "",
    maargUrl: commonUtil.getMaargURL(),
    omsInstance: activeOms,
    now: Date.now()
  };
}

async function runOnMainThread(domainNames: string[]): Promise<void> {
  if(mainThreadRunning) {return;}
  mainThreadRunning = true;
  try {
    for(const name of domainNames) {
      const domain = getSyncDomain(name);
      if(!domain) {continue;}
      try {
        await domain.sync(mainThreadContext());
        if(name === OPEN_ORDERS_DOMAIN) {liveOrdersStatus.lastSyncAt = Date.now();}
      } catch (error) {
        logger.error(`Failed to sync ${name} on the main thread`, error);
      }
    }
  } finally {
    mainThreadRunning = false;
  }
}

function startMainThreadLoop(): void {
  if(liveOrdersStatus.mode === "main") {return;}
  liveOrdersStatus.mode = "main";
  const domainNames = FULFILLMENT_SYNC_DOMAINS.map((domain) => domain.name);
  void runOnMainThread(domainNames);
  mainThreadTimer = setInterval(() => void runOnMainThread(domainNames), LIVE_ORDERS_INTERVAL_MS);
}

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

function workerStartTimeout(): Promise<"timeout"> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const check = setInterval(() => {
      if(workerAnswered || Date.now() - startedAt >= WORKER_START_TIMEOUT_MS) {
        clearInterval(check);
        if(!workerAnswered) {resolve("timeout");}
      }
    }, 500);
  });
}

async function start(facilities: any[]): Promise<void> {
  activeOms = commonUtil.getOMSInstanceName();
  await ensureDbReady(fulfillmentDb.raw());
  await writeMasterFacilities(facilities);

  workerAnswered = false;
  const outcome = await Promise.race([appDbSync.startAppDbSync().then(() => "started" as const), workerStartTimeout()]);
  if(outcome === "timeout" || !appDbSync.syncService()) {
    logger.error("Fulfillment sync worker did not start, syncing on the main thread", appDbSync.bootstrapState.errors.__start);
    appDbSync.syncService()?.stop();
    startMainThreadLoop();

    return;
  }

  await appDbSync.activateSyncDomains(LIVE_ORDER_DOMAINS, syncOwner);
  liveOrdersStatus.mode = "worker";
  // Run the live domains now rather than on the harness's next tick.
  await appDbSync.syncNow().catch((error) => logger.error("Failed the first live order sync", error));
}

// Later calls only refresh the facility master list.
export async function startLiveOrdersSync(facilities: any[]): Promise<void> {
  await loadDeviceSettings();
  if(!deviceSettings.liveOpenOrders) {return;}

  if(starting) {
    await starting;
    await syncMasterFacilities(facilities);

    return;
  }

  starting = start(facilities).catch((error) => {
    logger.error("Failed to start the live order sync, syncing on the main thread", error);
    // Never sync from both threads.
    appDbSync.syncService()?.stop();
    startMainThreadLoop();
  });
  await starting;
}

export async function syncMasterFacilities(facilities: any[]): Promise<void> {
  if(!starting || liveOrdersStatus.mode === "off") {return;}
  if(await writeMasterFacilities(facilities)) {await refreshLiveOrders();}
}

export async function refreshLiveOrders(domainNames: string[] = LIVE_ORDER_DOMAINS.map((domain) => domain.name)): Promise<void> {
  liveOrdersStatus.syncing = true;
  try {
    if(liveOrdersStatus.mode === "worker") {
      for(const name of domainNames) {await appDbSync.resyncDomain(name);}
    } else if(liveOrdersStatus.mode === "main") {
      await runOnMainThread(domainNames);
    }
  } catch (error) {
    logger.error("Failed to refresh live orders", error);
  } finally {
    liveOrdersStatus.syncing = false;
  }
}

// Ahead of the confirming resync.
export async function removeOpenOrdersLocally(items: Array<{ orderId: string; shipGroupSeqId: string }>): Promise<void> {
  if(!items.length || liveOrdersStatus.mode === "off") {return;}
  const keys = items.map((item) => [item.orderId, item.shipGroupSeqId]);
  const db = fulfillmentDb.raw();
  await db.transaction("rw", ["orders", "orderItems"], async () => {
    await db.table("orders").bulkDelete(keys);
    await db.table("orderItems").where("[orderId+shipGroupSeqId]").anyOf(keys).delete();
  });
}

export async function stopLiveOrdersSync(): Promise<void> {
  if(mainThreadTimer) {
    clearInterval(mainThreadTimer);
    mainThreadTimer = null;
  }
  const wasRunning = liveOrdersStatus.mode !== "off";
  liveOrdersStatus.mode = "off";
  liveOrdersStatus.lastSyncAt = 0;
  starting = null;
  resetLiveOrderDomains();
  if(activeOms || wasRunning) {
    try {
      await appDbSync.deactivateSyncDomains(syncOwner);
      await appDbSync.stopAppDbSync();
    } catch (error) {
      logger.error("Failed to stop the live order sync", error);
      if(activeOms) {await clearDatabaseTables(fulfillmentDb.get(activeOms));}
    }
  }
  activeOms = "";
}
