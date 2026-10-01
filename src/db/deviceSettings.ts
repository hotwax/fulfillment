/**
 * Settings that belong to this device, persisted in IndexedDB until they get a server-side home.
 *
 * Kept in their own small database rather than the per-OMS fulfillment database, because logout
 * clears that one and these choices should survive a re-login on the same device.
 */

import { BaseDB, ensureDbReady } from "@common/db/baseDb";
import { reactive } from "vue";
import { DEFAULT_OPEN_ORDER_FILTER_DIMENSIONS } from "@/utils/openOrderFilters";

const SETTINGS = {
  LIVE_OPEN_ORDERS: "liveOpenOrders",
  OPEN_ORDER_FILTER_DIMENSIONS: "openOrderFilterDimensions"
} as const;

const settingsDb = new BaseDB("FulfillmentDeviceSettings", { deviceSettings: "settingId" });

export const deviceSettings = reactive({
  loaded: false,
  liveOpenOrders: true,
  openOrderFilterDimensions: [...DEFAULT_OPEN_ORDER_FILTER_DIMENSIONS] as string[]
});

let loading: Promise<void> | null = null;

export function loadDeviceSettings(): Promise<void> {
  if(!loading) {
    loading = (async () => {
      try {
        await ensureDbReady(settingsDb);
        const rows = await settingsDb.table("deviceSettings").toArray();
        for(const row of rows) {
          if(row.settingId === SETTINGS.LIVE_OPEN_ORDERS) {deviceSettings.liveOpenOrders = row.value !== false;}
          if(row.settingId === SETTINGS.OPEN_ORDER_FILTER_DIMENSIONS && Array.isArray(row.value)) {deviceSettings.openOrderFilterDimensions = row.value;}
        }
      } catch (error) {
        console.warn("[deviceSettings] Failed to load, using defaults:", error);
      } finally {
        deviceSettings.loaded = true;
      }
    })();
  }

  return loading;
}

async function saveSetting(settingId: string, value: unknown): Promise<void> {
  try {
    await settingsDb.table("deviceSettings").put({ settingId, value, updatedAt: Date.now() });
  } catch (error) {
    console.warn(`[deviceSettings] Failed to save ${settingId}:`, error);
  }
}

export async function setLiveOpenOrdersEnabled(enabled: boolean): Promise<void> {
  deviceSettings.liveOpenOrders = enabled;
  await saveSetting(SETTINGS.LIVE_OPEN_ORDERS, enabled);
}

export async function setOpenOrderFilterDimension(dimensionId: string, enabled: boolean): Promise<void> {
  const current = new Set(deviceSettings.openOrderFilterDimensions);
  if(enabled) {current.add(dimensionId);} else {current.delete(dimensionId);}
  deviceSettings.openOrderFilterDimensions = [...current];
  // A plain copy: IndexedDB can't clone the reactive proxy the state hands back.
  await saveSetting(SETTINGS.OPEN_ORDER_FILTER_DIMENSIONS, [...current]);
}
