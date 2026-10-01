/**
 * Main-thread control of the fulfillment sync.
 *
 * Starts the accxui polling harness in a worker, keeps the facility master list in IndexedDB in
 * step with the facilities Pinia resolved, and exposes the refreshes pages call after an action.
 *
 * When a worker can't start (for example inside a host that loads this app from another origin,
 * where browsers refuse a cross-origin worker script), the same registered domains run on the
 * main thread on the same cadence. Those runs are called directly with the app's own token,
 * because the framework's direct path reads the token from cookies, which embedded logins don't set.
 */

import {
  DB_SYNC_CHANNEL,
  bootstrapState,
  clearLocalDb,
  commonUtil,
  ensureDbReady,
  getSyncDomain,
  logger,
  projectRows,
  refreshAfterMutation,
  registerCommonSeedDomains,
  resyncDomain,
  startDbBootstrap,
  updateWorkerToken
} from "@common";
import { reactive } from "vue";
import { deviceSettings, loadDeviceSettings } from "./deviceSettings";
import { FULFILLMENT_SYNC_DOMAINS, OPEN_ORDERS_DOMAIN, ORDER_ITEMS_DOMAIN, PRODUCTS_DOMAIN, registerFulfillmentDomains } from "./domains";
import { getFulfillmentDb, userFacilityProjection } from "./fulfillmentDb";

const BASE_TICK_MS = 15_000;
const LIVE_ORDER_DOMAINS = [OPEN_ORDERS_DOMAIN, ORDER_ITEMS_DOMAIN, PRODUCTS_DOMAIN];

export const liveOrdersStatus = reactive({
  mode: "off" as "off" | "worker" | "main",
  lastSyncAt: 0,
  syncing: false
});

let activeOms = "";
let starting: Promise<void> | null = null;
let mainThreadTimer: ReturnType<typeof setInterval> | null = null;
let mainThreadRunning = false;
let mainThreadDomainsRegistered = false;
let syncChannel: BroadcastChannel | null = null;

/** The same domains in this thread's registry, for the main-thread fallback. */
function registerMainThreadDomains(): void {
  if(mainThreadDomainsRegistered) {return;}
  registerCommonSeedDomains(getFulfillmentDb);
  registerFulfillmentDomains(getFulfillmentDb);
  mainThreadDomainsRegistered = true;
}

function listenForWorkerSyncs(): void {
  if(syncChannel || typeof BroadcastChannel === "undefined") {return;}
  syncChannel = new BroadcastChannel(DB_SYNC_CHANNEL);
  syncChannel.onmessage = (event) => {
    if(event.data?.type === "domain-synced" && event.data?.domain === OPEN_ORDERS_DOMAIN) {liveOrdersStatus.lastSyncAt = Date.now();}
  };
}

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
  void runOnMainThread(FULFILLMENT_SYNC_DOMAINS);
  mainThreadTimer = setInterval(() => void runOnMainThread(FULFILLMENT_SYNC_DOMAINS), BASE_TICK_MS);
}

/**
 * Make the IndexedDB master list match the facilities the app resolved. Returns whether it
 * changed, so callers resync only when the set of facilities really moved.
 */
async function writeMasterFacilities(facilities: any[]): Promise<boolean> {
  const db = getFulfillmentDb(activeOms);
  // Pinia hands out reactive proxies, which IndexedDB can't clone.
  const plain = JSON.parse(JSON.stringify(facilities ?? []));
  const fresh = projectRows(plain, userFacilityProjection, Date.now());
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
  const db = getFulfillmentDb(activeOms);
  await ensureDbReady(db);
  registerMainThreadDomains();
  listenForWorkerSyncs();
  await writeMasterFacilities(facilities);

  // A worker that fails to load never answers the harness, so its error also ends the start.
  let workerFailed: () => void = () => {};
  const workerFailure = new Promise<void>((resolve) => { workerFailed = resolve; });

  await Promise.race([
    startDbBootstrap({
      workerFactory: () => {
        const worker = new Worker(new URL("./fulfillmentSync.worker.ts", import.meta.url), { type: "module" });
        worker.addEventListener("error", (event) => {
          logger.error("Fulfillment sync worker failed, syncing on the main thread", event);
          startMainThreadLoop();
          workerFailed();
        });

        return worker;
      },
      token: commonUtil.getToken() || "",
      maargUrl: commonUtil.getMaargURL(),
      omsInstance: activeOms,
      db,
      domains: FULFILLMENT_SYNC_DOMAINS,
      baseTickMs: BASE_TICK_MS
    }),
    workerFailure
  ]);

  if(bootstrapState.error) {startMainThreadLoop();} else if(liveOrdersStatus.mode === "off") {liveOrdersStatus.mode = "worker";}
}

/**
 * Start the live sync for the logged-in session. Safe to call more than once: later calls only
 * refresh the token and the facility master list.
 */
export async function startLiveOrdersSync(facilities: any[]): Promise<void> {
  await loadDeviceSettings();
  if(!deviceSettings.liveOpenOrders) {return;}

  if(starting) {
    await starting;
    updateWorkerToken(commonUtil.getToken() || "");
    await syncMasterFacilities(facilities);

    return;
  }

  starting = start(facilities).catch((error) => {
    logger.error("Failed to start the live order sync, syncing on the main thread", error);
    startMainThreadLoop();
  });
  await starting;
}

/** Call when Pinia's facilities change. Resyncs only when the set of facilities changed. */
export async function syncMasterFacilities(facilities: any[]): Promise<void> {
  if(!starting || liveOrdersStatus.mode === "off") {return;}
  if(await writeMasterFacilities(facilities)) {await refreshLiveOrders();}
}

/** Re-read the open bucket now, then fill items and products for anything new. */
export async function refreshLiveOrders(domainNames: string[] = LIVE_ORDER_DOMAINS): Promise<void> {
  liveOrdersStatus.syncing = true;
  try {
    if(liveOrdersStatus.mode === "worker") {
      for(const name of domainNames) {await resyncDomain(name);}
    } else if(liveOrdersStatus.mode === "main") {
      await runOnMainThread(domainNames);
    }
  } catch (error) {
    logger.error("Failed to refresh live orders", error);
  } finally {
    liveOrdersStatus.syncing = false;
  }
}

/** After an action on one order, settle just that order's open rows. */
export async function refreshOpenOrder(orderId: string): Promise<void> {
  try {
    if(liveOrdersStatus.mode === "worker") {
      await refreshAfterMutation(OPEN_ORDERS_DOMAIN, { orderId });
    } else if(liveOrdersStatus.mode === "main") {
      await getSyncDomain(OPEN_ORDERS_DOMAIN)?.refetchOne?.({ orderId }, mainThreadContext());
    }
  } catch (error) {
    logger.error("Failed to refresh the order", error);
  }
}

/** Take orders out of the local queue at once, ahead of the confirming resync. */
export async function removeOpenOrdersLocally(orderKeys: string[]): Promise<void> {
  if(!orderKeys.length || liveOrdersStatus.mode === "off") {return;}
  const db = getFulfillmentDb(activeOms);
  await db.transaction("rw", ["orders", "orderItems"], async () => {
    await db.table("orders").bulkDelete(orderKeys);
    await db.table("orderItems").where("orderKey").anyOf(orderKeys).delete();
  });
}

/** Stop syncing and clear this OMS's tables. Used on logout and when the live list is switched off. */
export async function stopLiveOrdersSync(): Promise<void> {
  if(mainThreadTimer) {
    clearInterval(mainThreadTimer);
    mainThreadTimer = null;
  }
  liveOrdersStatus.mode = "off";
  liveOrdersStatus.lastSyncAt = 0;
  const oms = activeOms;
  starting = null;
  activeOms = "";
  if(!oms) {return;}
  try {
    await clearLocalDb(getFulfillmentDb(oms));
  } catch (error) {
    logger.error("Failed to clear the local order database", error);
  }
}
