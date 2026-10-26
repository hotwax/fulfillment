import type { DbRow } from "@common/db";
import { type Ref, computed, watch } from "vue";
import { useCachedLiveEntity } from "@/composables/useCachedLiveEntity";
import { focusLiveOrders, liveOrdersStatus } from "@/db/appDbSync";
import { fulfillmentDb } from "@/db/fulfillmentDb";
import { filterTransferOrders, sortTransferOrders, toTransferOrderView } from "@/utils/transferOrderView";

interface LiveTransferOrdersOptions {
  facilityId: Ref<string | undefined>;
  productStoreId: Ref<string | undefined>;
  stage: Ref<string>;
  query: Ref<string>;
}

// The facility's transfer orders in one stage, kept live from the app database. A visit shows the last sync at once and the
// worker's next pass updates the list in place.
export function useLiveTransferOrders(options: LiveTransferOrdersOptions) {
  const live = useCachedLiveEntity<DbRow>(fulfillmentDb.tables.transferOrders, () => {
    const facilityId = options.facilityId.value;
    const stage = options.stage.value;

    return facilityId ? { scope: { field: "facilityId", value: facilityId }, filter: (row: DbRow) => row.stage === stage } : { filter: () => false };
  }, () => `transferOrders:${options.stage.value}:${options.facilityId.value ?? ""}`);

  // The sync follows the facility on screen.
  watch(options.facilityId, (facilityId) => {
    if(facilityId) {void focusLiveOrders(facilityId, options.productStoreId.value);}
  }, { immediate: true });

  const all = computed(() => sortTransferOrders(live.records.value.map(toTransferOrderView), options.stage.value));
  const orders = computed(() => filterTransferOrders(all.value, options.query.value));
  const hydrated = computed(() => !!options.facilityId.value && (live.hydrated.value || !!live.error.value));
  // Nothing to wait for once rows are in, or the first sync has run.
  const loaded = computed(() => {
    if(!hydrated.value) {return false;}
    if(all.value.length) {return true;}
    const facilityId = options.facilityId.value;

    return !liveOrdersStatus.running || !!(facilityId && liveOrdersStatus.facilitySyncedAt[facilityId]);
  });

  return { orders, all, loaded };
}
