import { useLiveEntity } from "@common";
import type { DbRow } from "@common/db";
import { type Ref, computed, markRaw, watch } from "vue";
import { useProductCacheBridge } from "@/composables/useProductCacheBridge";
import { focusLiveOrders, liveOrdersStatus } from "@/db/appDbSync";
import { deviceSettings } from "@/db/deviceSettings";
import { ORDER_STAGE, fulfillmentDb, orderKeyOf } from "@/db/fulfillmentDb";
import { liveOrdersLoad } from "@/utils/liveOrdersLoad";
import { type FilterSelections, OPEN_ORDER_FILTER_DIMENSIONS, filterOpenOrders, openOrderFacets } from "@/utils/openOrderFilters";

interface LiveOpenOrdersOptions {
  facilityId: Ref<string | undefined>;
  productStoreId: Ref<string | undefined>;
  query: Ref<string>;
  selections: Ref<FilterSelections>;
  pickSize: Ref<number>;
}

const orderKeyOfRow = (row: DbRow) => String(orderKeyOf(row.orderId, row.shipGroupSeqId));

function toOrderView(order: any, items: DbRow[]) {
  return markRaw({
    category: "open",
    orderKey: orderKeyOfRow(order),
    orderId: order.orderId,
    orderName: order.orderName,
    orderDate: order.orderDate,
    shipGroupSeqId: order.shipGroupSeqId,
    shipmentMethodTypeId: order.shipmentMethodTypeId,
    customerName: [order.firstName, order.lastName].filter(Boolean).join(" "),
    // Picklist creation reads the ship method from the items.
    items: items.map((item) => ({ ...item, shipmentMethodTypeId: order.shipmentMethodTypeId }))
  });
}

export function useLiveOpenOrders(options: LiveOpenOrdersOptions) {
  // Each read re-subscribes when its options change, and starts empty until its first emit.
  const orders = useLiveEntity<DbRow>(fulfillmentDb.tables.orders, () => {
    const facilityId = options.facilityId.value;

    return facilityId
      ? { scope: { field: "facilityId", value: facilityId }, filter: (row: DbRow) => row.stage === ORDER_STAGE.OPEN }
      : { filter: () => false };
  });
  const orderRows = orders.records;
  const itemRows = useLiveEntity<DbRow>(fulfillmentDb.tables.orderItems).records;
  const productRows = useLiveEntity<DbRow>(fulfillmentDb.tables.products).records;
  const shipmentMethodRows = useLiveEntity<DbRow>(fulfillmentDb.tables.shipmentMethodTypes).records;
  // A failed read counts as loaded, so the page doesn't wait on it for ever.
  const hydrated = computed(() => !!options.facilityId.value && (orders.hydrated.value || !!orders.error.value));

  // The facility on screen gets its items and products first.
  watch(options.facilityId, (facilityId) => {
    if(facilityId) {void focusLiveOrders(facilityId, options.productStoreId.value);}
  }, { immediate: true });

  const productsById = computed(() => new Map(productRows.value.map((row) => [String(row.productId), row as any])));
  const productVersions = computed(() => new Map(productRows.value.map((row) => [String(row.productId), Number(row.syncedAt) || 0])));

  useProductCacheBridge(productRows);

  const itemsByOrderKey = computed(() => {
    const grouped = new Map<string, DbRow[]>();
    for(const row of itemRows.value) {
      const key = orderKeyOfRow(row);
      const items = grouped.get(key) ?? [];
      items.push(row);
      grouped.set(key, items);
    }
    grouped.forEach((items) => items.sort((a, b) => String(a.orderItemSeqId).localeCompare(String(b.orderItemSeqId))));

    return grouped;
  });

  // Reused while unchanged, so a sync that touches one order hands Vue the same objects for every other card.
  let viewCache = new Map<string, { version: string; view: any }>();

  const allOrders = computed(() => {
    const productStoreId = options.productStoreId.value;
    const nextCache = new Map<string, { version: string; view: any }>();
    const views: any[] = [];

    for(const row of orderRows.value) {
      if(productStoreId && row.productStoreId && row.productStoreId !== productStoreId) {continue;}
      const key = orderKeyOfRow(row);
      // A picklist just took it, and the next open orders pass has yet to prune it.
      if(liveOrdersStatus.hiddenOrderKeys.has(key)) {continue;}
      const items = itemsByOrderKey.value.get(key) ?? [];
      // An order joins the view once its items are stored, so a card is never shown half-filled.
      if(!items.length) {continue;}
      const version = [
        row.syncedAt,
        ...items.map((item) => `${item.orderItemSeqId}:${item.syncedAt}:${productVersions.value.get(String(item.productId)) ?? 0}`)
      ].join("|");
      const cached = viewCache.get(key);
      const view = cached && cached.version === version ? cached.view : toOrderView(row, items);
      nextCache.set(key, { version, view });
      views.push(view);
    }

    viewCache = nextCache;

    // Oldest first, as the Open page has always been.
    return views.sort((a, b) => (Number(a.orderDate) || 0) - (Number(b.orderDate) || 0) || a.orderKey.localeCompare(b.orderKey));
  });

  const shipmentMethodLabels = computed(() => new Map(shipmentMethodRows.value.map((row) => [
    String(row.shipmentMethodTypeId),
    String(row.description ?? row.shipmentMethodTypeId)
  ])));

  const dimensions = computed(() => OPEN_ORDER_FILTER_DIMENSIONS.filter((dimension) => deviceSettings.openOrderFilterDimensions.includes(dimension.id)));

  const filterOptions = computed(() => ({
    dimensions: dimensions.value,
    selections: options.selections.value,
    productsById: productsById.value,
    query: options.query.value
  }));

  const filteredOrders = computed(() => filterOpenOrders(allOrders.value, filterOptions.value));
  const facets = computed(() => openOrderFacets(allOrders.value, filterOptions.value));
  const visibleOrders = computed(() => filteredOrders.value.slice(0, Math.max(0, Number(options.pickSize.value) || 0)));

  // How far the facility's fill has come. A sync that never started leaves nothing to wait for.
  const loadState = computed(() => {
    if(!hydrated.value) {return { loaded: false };}
    const productStoreId = options.productStoreId.value;
    const facilityId = options.facilityId.value;
    const firstSyncAt = liveOrdersStatus.firstSyncAt;
    const productIds = new Set(allOrders.value.flatMap((order) => order.items.map((item: any) => String(item.productId))));

    return liveOrdersLoad({
      synced: !!firstSyncAt || !liveOrdersStatus.running,
      facilityPassed: !!facilityId && !!firstSyncAt && (liveOrdersStatus.facilitySyncedAt[facilityId] ?? 0) >= firstSyncAt,
      orders: orderRows.value.filter((row) => !productStoreId || !row.productStoreId || row.productStoreId === productStoreId).length,
      ordersWithItems: allOrders.value.length,
      products: productIds.size,
      productsLoaded: [...productIds].filter((productId) => productsById.value.has(productId)).length
    });
  });

  return { hydrated, allOrders, filteredOrders, visibleOrders, facets, dimensions, shipmentMethodLabels, loadState };
}
