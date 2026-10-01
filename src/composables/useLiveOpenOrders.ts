/**
 * The Open view of the local `orders` entity: open rows for the current facility and product
 * store, joined with their items and products, filtered by the enabled dimensions.
 *
 * Each order view object is reused for as long as its row, items and products are unchanged, so
 * a sync that touches one order hands Vue the same objects for every other card.
 */

import { type DbRow, ensureDbReady } from "@common/db";
import { type Ref, computed, markRaw, onUnmounted, ref, shallowRef, watch } from "vue";
import { deviceSettings } from "@/db/deviceSettings";
import { ORDER_STAGE, fulfillmentDb, orderKeyOf } from "@/db/fulfillmentDb";
import { useProductStore } from "@/store/product";
import { type FilterSelections, OPEN_ORDER_FILTER_DIMENSIONS, filterOpenOrders, openOrderFacets } from "@/utils/openOrderFilters";

interface LiveOpenOrdersOptions {
  facilityId: Ref<string | undefined>;
  productStoreId: Ref<string | undefined>;
  query: Ref<string>;
  selections: Ref<FilterSelections>;
  /** The picklist size: how many of the filtered orders the page shows and picks. */
  pickSize: Ref<number>;
}

const orderKeyOfRow = (row: DbRow) => String(orderKeyOf(row.orderId, row.shipGroupSeqId));

function toOrderView(order: any, items: DbRow[], version: string) {
  return markRaw({
    category: "open",
    orderKey: orderKeyOfRow(order),
    orderId: order.orderId,
    orderName: order.orderName,
    orderDate: order.orderDate,
    shipGroupSeqId: order.shipGroupSeqId,
    shipmentMethodTypeId: order.shipmentMethodTypeId,
    facilityId: order.facilityId,
    facilityName: order.facilityName,
    productStoreId: order.productStoreId,
    customerId: order.billToPartyId,
    customerName: [order.firstName, order.lastName].filter(Boolean).join(" "),
    itemCount: order.itemCount,
    // Picklist creation reads the ship method and facility from the items.
    items: items.map((item) => ({ ...item, shipmentMethodTypeId: order.shipmentMethodTypeId, facilityId: order.facilityId })),
    version
  });
}

export function useLiveOpenOrders(options: LiveOpenOrdersOptions) {
  const orderRows = shallowRef<DbRow[]>([]);
  const itemRows = shallowRef<DbRow[]>([]);
  const productRows = shallowRef<DbRow[]>([]);
  const shipmentMethodRows = shallowRef<DbRow[]>([]);
  const hydrated = ref(false);

  let subscriptions: Array<{ unsubscribe: () => void }> = [];
  // Bumped on every subscribe and on unmount, so a subscribe still opening the database knows it was replaced.
  let generation = 0;
  const unsubscribe = () => {
    subscriptions.forEach((subscription) => subscription.unsubscribe());
    subscriptions = [];
  };

  const subscribe = async (facilityId?: string) => {
    const current = ++generation;
    unsubscribe();
    hydrated.value = false;
    orderRows.value = [];
    if(!facilityId) {return;}

    const onError = (error: unknown) => console.error("[useLiveOpenOrders] live query failed:", error);
    try {
      // Open and version-check the database before any live query: the check can rebuild the
      // database, and a live query may only read.
      await ensureDbReady(fulfillmentDb.raw());
    } catch (error) {
      onError(error);
      hydrated.value = true;

      return;
    }
    if(current !== generation) {return;}

    subscriptions = [
      fulfillmentDb.entity<DbRow>("orders").live({ scope: { field: "facilityId", value: facilityId }, filter: (row) => row.stage === ORDER_STAGE.OPEN }).subscribe({
        next: (rows) => { orderRows.value = rows; hydrated.value = true; },
        error: (error) => { onError(error); hydrated.value = true; }
      }),
      fulfillmentDb.entity<DbRow>("orderItems").live().subscribe({ next: (rows) => { itemRows.value = rows; }, error: onError }),
      fulfillmentDb.entity<DbRow>("products").live().subscribe({ next: (rows) => { productRows.value = rows; }, error: onError }),
      fulfillmentDb.entity<DbRow>("shipmentMethodTypes").live().subscribe({ next: (rows) => { shipmentMethodRows.value = rows; }, error: onError })
    ];
  };

  watch(options.facilityId, (facilityId) => void subscribe(facilityId), { immediate: true });
  onUnmounted(() => {
    generation++;
    unsubscribe();
  });

  const productsById = computed(() => new Map(productRows.value.map((row) => [String(row.productId), row as any])));
  const productVersions = computed(() => new Map(productRows.value.map((row) => [String(row.productId), Number(row.syncedAt) || 0])));

  // The card helpers (images, identifiers, kit checks) read the Pinia product cache. Push each
  // product there when its stored version changes.
  const pushedVersions = new Map<string, number>();
  watch(productRows, (rows) => {
    const changed = rows.filter((row) => pushedVersions.get(String(row.productId)) !== row.syncedAt);
    if(!changed.length) {return;}
    useProductStore().addProductToCachedMultiple({ products: changed.map((row) => ({ ...row })) });
    changed.forEach((row) => pushedVersions.set(String(row.productId), Number(row.syncedAt)));
  });

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

  // Order views from the previous pass, reused while their version is unchanged.
  let viewCache = new Map<string, { version: string; view: any }>();

  const allOrders = computed(() => {
    const productStoreId = options.productStoreId.value;
    const nextCache = new Map<string, { version: string; view: any }>();
    const views: any[] = [];

    for(const row of orderRows.value) {
      if(productStoreId && row.productStoreId && row.productStoreId !== productStoreId) {continue;}
      const key = orderKeyOfRow(row);
      const items = itemsByOrderKey.value.get(key) ?? [];
      // An order joins the view once its items are stored, so a card is never shown half-filled.
      if(!items.length) {continue;}
      const version = [
        row.syncedAt,
        ...items.map((item) => `${item.orderItemSeqId}:${item.syncedAt}:${productVersions.value.get(String(item.productId)) ?? 0}`)
      ].join("|");
      const cached = viewCache.get(key);
      const view = cached && cached.version === version ? cached.view : toOrderView(row, items, version);
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

  return { hydrated, allOrders, filteredOrders, visibleOrders, facets, dimensions, shipmentMethodLabels };
}
