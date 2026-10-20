import type { DbRow } from "@common/db";
import { DateTime } from "luxon";
import { type Ref, computed, reactive, watch } from "vue";
import { useCachedLiveEntity } from "@/composables/useCachedLiveEntity";
import { useProductCacheBridge } from "@/composables/useProductCacheBridge";
import { focusLiveOrders, liveOrdersStatus } from "@/db/appDbSync";
import { SHIPMENT_STAGE, fulfillmentDb } from "@/db/fulfillmentDb";
import { useOrderStore } from "@/store/order";
import { useProductStore as useAppProductStore } from "@/store/productStore";
import { picklistView, sortShipments, toShipmentView } from "@/utils/shipmentView";

interface LiveShipmentsOptions {
  facilityId: Ref<string | undefined>;
  productStoreId: Ref<string | undefined>;
  stage: typeof SHIPMENT_STAGE[keyof typeof SHIPMENT_STAGE];
}

const formatTime = (millis: number) => DateTime.fromMillis(millis).toLocaleString(DateTime.TIME_SIMPLE);

// The shipments of the facility on screen, in one stage, kept live from the app database. The page reads this
// instead of fetching: a visit shows the last sync at once, and the worker's next pass updates it in place.
export function useLiveShipments(options: LiveShipmentsOptions) {
  const facilityKey = () => options.facilityId.value ?? "";
  const shipmentLive = useCachedLiveEntity<DbRow>(fulfillmentDb.tables.shipments, () => {
    const facilityId = options.facilityId.value;

    return facilityId
      ? { scope: { field: "facilityId", value: facilityId }, filter: (row: DbRow) => row.stage === options.stage }
      : { filter: () => false };
  }, () => `shipments:${options.stage}:${facilityKey()}`);
  const picklistRows = useCachedLiveEntity<DbRow>(fulfillmentDb.tables.picklists, () => {
    const facilityId = options.facilityId.value;

    return facilityId ? { scope: { field: "facilityId", value: facilityId } } : { filter: () => false };
  }, () => `picklists:${facilityKey()}`).records;
  const productRows = useCachedLiveEntity<DbRow>(fulfillmentDb.tables.products, undefined, () => "products").records;
  const shipmentMethodRows = useCachedLiveEntity<DbRow>(fulfillmentDb.tables.shipmentMethodTypes, undefined, () => "shipmentMethodTypes").records;

  useProductCacheBridge(productRows);

  // The sync follows the facility on screen.
  watch(options.facilityId, (facilityId) => {
    if(facilityId) {void focusLiveOrders(facilityId, options.productStoreId.value);}
  }, { immediate: true });

  const requiresLabel = computed(() => useAppProductStore().getProductStoreShipmentMethCount > 0);

  // A view is reused while its row is unchanged, so what the associate has chosen on a card (a box, a rejection) survives
  // every sync that doesn't touch that shipment, and is dropped when the server's copy changes.
  let viewCache = new Map<string, { version: string; view: any }>();
  const shipments = computed(() => {
    const next = new Map<string, { version: string; view: any }>();
    const views: any[] = [];

    for(const row of shipmentLive.records.value) {
      const shipmentId = String(row.shipmentId);
      if(liveOrdersStatus.hiddenShipmentIds.has(shipmentId) || !row.shipment) {continue;}
      const version = `${row.syncedAt}|${requiresLabel.value}`;
      const cached = viewCache.get(shipmentId);
      const view = cached && cached.version === version ? cached.view : reactive(toShipmentView(row.shipment, { requiresLabel: requiresLabel.value }));
      next.set(shipmentId, { version, view });
      views.push(view);
    }

    viewCache = next;

    return sortShipments(views, options.stage);
  });

  const picklists = computed(() => picklistRows.value
    .map((row) => picklistView(row, formatTime))
    .sort((a, b) => (Number(a.picklistDate) || 0) - (Number(b.picklistDate) || 0)));

  const shipmentMethodLabels = computed(() => new Map(shipmentMethodRows.value.map((row) => [
    String(row.shipmentMethodTypeId),
    String(row.description ?? row.shipmentMethodTypeId)
  ])));

  // A failed read counts as loaded, so the page doesn't wait on it for ever.
  const hydrated = computed(() => !!options.facilityId.value && (shipmentLive.hydrated.value || !!shipmentLive.error.value));

  // Nothing to wait for once rows are in, or the first sync has run.
  const loaded = computed(() => {
    if(!hydrated.value) {return false;}
    if(shipments.value.length) {return true;}
    const facilityId = options.facilityId.value;

    return !liveOrdersStatus.running || !!(facilityId && liveOrdersStatus.facilitySyncedAt[facilityId]);
  });

  // Gift card items show whether they are activated, which is known only to the server.
  const checkedGiftCards = new Set<string>();
  watch(shipments, async (views) => {
    const pending = views.filter((view) => !checkedGiftCards.has(view.shipmentId) && view.items.some((item: any) => item.productTypeId === "GIFT_CARD"));
    if(!pending.length) {return;}
    pending.forEach((view) => checkedGiftCards.add(view.shipmentId));
    const withDetails = await useOrderStore().fetchGiftCardActivationDetails({ isDetailsPage: false, currentOrders: JSON.parse(JSON.stringify(pending)) });
    for(const detailed of withDetails) {
      const view = pending.find((candidate) => candidate.shipmentId === detailed.shipmentId);
      detailed.items.forEach((item: any) => {
        const target = view?.items.find((candidate: any) => candidate.shipmentItemSeqId === item.shipmentItemSeqId);
        if(target && item.isGCActivated !== undefined) {Object.assign(target, { isGCActivated: item.isGCActivated, gcInfo: item.gcInfo });}
      });
    }
  }, { immediate: true });

  return { shipments, picklists, hydrated, loaded, shipmentMethodLabels };
}
