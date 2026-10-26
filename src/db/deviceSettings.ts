import { reactive } from "vue";
import { DEFAULT_OPEN_ORDER_FILTER_DIMENSIONS } from "@/utils/openOrderFilters";

// In localStorage, which logout leaves alone: the choice belongs to this device.
const FILTER_DIMENSIONS_KEY = "fulfillment.openOrderFilterDimensions";

function storedFilterDimensions(): string[] | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(FILTER_DIMENSIONS_KEY) ?? "null");

    return Array.isArray(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export const deviceSettings = reactive({
  openOrderFilterDimensions: storedFilterDimensions() ?? [...DEFAULT_OPEN_ORDER_FILTER_DIMENSIONS]
});

export function setOpenOrderFilterDimension(dimensionId: string, enabled: boolean): void {
  const dimensions = deviceSettings.openOrderFilterDimensions.filter((id) => id !== dimensionId);
  deviceSettings.openOrderFilterDimensions = enabled ? [...dimensions, dimensionId] : dimensions;
  try {
    localStorage.setItem(FILTER_DIMENSIONS_KEY, JSON.stringify(deviceSettings.openOrderFilterDimensions));
  } catch (error) {
    console.warn("[deviceSettings] Failed to save the Open page filters:", error);
  }
}
