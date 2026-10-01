<template>
  <ion-page :key="router.currentRoute.value.path">
    <ViewSizeSelector menu-id="view-size-selector-open" content-id="view-size-selector" :total="isLive ? liveFilteredOrders.length : undefined" />

    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <template v-if="isLive">
          <ion-title v-if="!liveFilteredOrders.length">{{ liveFilteredOrders.length }} {{ translate('orders') }}</ion-title>
          <ion-title v-else>{{ displayedOrders.length }} {{ translate('of') }} {{ liveFilteredOrders.length }} {{ translate('orders') }}</ion-title>
        </template>
        <template v-else>
          <ion-title v-if="!openOrders.total">{{ openOrders.total }} {{ translate('orders') }}</ion-title>
          <ion-title v-else>{{ openOrders.query.viewSize }} {{ translate('of') }} {{ openOrders.total }} {{ translate('orders') }}</ion-title>
        </template>

        <ion-buttons slot="end">
          <ion-button @click="viewNotifications()">
            <ion-icon slot="icon-only" :icon="notificationsOutline" :color="(unreadNotificationsStatus && notifications.length) ? 'primary' : ''" />
          </ion-button>
          <ion-button :disabled="!userStore.hasPermission(Actions.APP_RECYCLE_ORDER) || !ordersTotal || isRejecting" fill="clear" color="danger" @click="recycleOutstandingOrders()">
            {{ translate("Reject all") }}
          </ion-button>
          <ion-menu-button menu="view-size-selector-open" :disabled="!ordersTotal">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="onContentScroll($event)" id="view-size-selector">
      <template v-if="isLive">
        <ion-searchbar class="searchbar" :value="liveQuery" :placeholder="translate('Search orders')" :debounce="200" @ionInput="liveQuery = $event.detail.value ?? ''" />
        <template v-for="dimension in filterableDimensions" :key="dimension.id">
          <div class="filters">
            <ion-item lines="none" v-for="facet in liveFacets[dimension.id]" :key="facet.value">
              <ion-checkbox label-placement="end" :checked="isFilterSelected(dimension.id, facet.value)" @ionChange="toggleFilter(dimension.id, facet.value)">
                <ion-label>
                  {{ filterValueLabel(dimension.id, facet.value) }}
                  <p>{{ facet.orderCount }} {{ translate("orders") }}, {{ facet.itemCount }} {{ translate("items") }}</p>
                </ion-label>
              </ion-checkbox>
            </ion-item>
          </div>
        </template>
      </template>
      <template v-else>
        <ion-searchbar class="searchbar" :value="openOrders.query.queryString" :placeholder="translate('Search orders')" @keyup.enter="updateQueryString($event.target.value)" />
        <div class="filters">
          <ion-item lines="none" v-for="method in shipmentMethods" :key="method.val">
            <ion-checkbox label-placement="end" :checked="openOrders.query.selectedShipmentMethods.includes(method.val)" @ionChange="updateSelectedShipmentMethods(method.val)">
              <ion-label>
                {{ shipmentMethodLabel(method.val) }}
                <p>{{ method.ordersCount }} {{ translate("orders") }}, {{ method.count }} {{ translate("items") }}</p>
              </ion-label>
            </ion-checkbox>
          </ion-item>
        </div>
        <Component :is="productCategoryFilterExt" :orderQuery="openOrders.query" :currentFacility="currentFacility" :currentProductStore="currentProductStore" @updateOpenQuery="updateOpenQuery" />
      </template>

      <div v-if="isLive ? displayedOrders.length : openOrders.total">
        <div class="results">
          <ion-button class="bulk-action desktop-only" size="large" @click="assignPickers">{{ translate("Print Picklist") }}</ion-button>

          <TransitionGroup tag="div" name="order" class="order-list" :css="animateCards" @before-enter="collapseEnteringCard" @enter="expandEnteringCard" @enter-cancelled="stopEnteringCard">
            <ion-card class="order" v-for="(order, index) in displayedOrders" :key="isLive ? order.orderKey : index" :data-order-key="isLive ? order.orderKey : undefined">
              <div class="order-header">
                <div class="order-primary-info">
                  <ion-label>
                    <strong>{{ order.customerName }}</strong>
                    <p>{{ translate("Ordered") }} {{ commonUtil.formatUtcDate(order.orderDate, userStore.currentTimeZoneId, 'dd MMMM yyyy hh:mm a ZZZZ') }}</p>
                  </ion-label>
                </div>

                <div class="order-tags">
                  <ion-chip @click.stop="orderActionsPopover(order, $event)" outline>
                    <ion-icon :icon="pricetagOutline" />
                    <ion-label>{{ order.orderName }}</ion-label>
                    <ion-icon :icon="caretDownOutline" />
                  </ion-chip>
                </div>

                <div class="order-metadata">
                  <ion-label>
                    {{ shipmentMethodLabel(order.shipmentMethodTypeId) }}
                    <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ commonUtil.formatUtcDate(order.reservedDatetime, userStore.currentTimeZoneId, 'dd MMMM yyyy hh:mm a ZZZZ') }}</p>
                  </ion-label>
                </div>
              </div>

              <div v-for="item in order.items" :key="order.orderId + item.orderItemSeqId" class="order-item">
                <div class="product-info">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start" v-image-preview="getProduct(item.productId)" :key="getProduct(item.productId)?.mainImageUrl">
                      <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" :key="getProduct(item.productId).mainImageUrl" size="small" />
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                      <div>
                        {{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}
                        <ion-badge class="kit-badge" color="dark" v-if="orderUtil.isKit(item)">{{ translate("Kit") }}</ion-badge>
                      </div>
                      <p>{{ commonUtil.getFeatures(getProduct(item.productId).productFeatures) }}</p>
                    </ion-label>
                  </ion-item>
                </div>
                <div class="product-metadata">
                  <ion-button v-if="orderUtil.isKit(item)" fill="clear" size="small" @click.stop="toggleKitComponents(order, item)">
                    <ion-icon v-if="isKitExpanded(order, item)" color="medium" slot="icon-only" :icon="chevronUpOutline" />
                    <ion-icon v-else color="medium" slot="icon-only" :icon="listOutline" />
                  </ion-button>
                  <ion-note v-if="getProductStock(item.productId).qoh">{{ getProductStock(item.productId).qoh }} {{ translate('pieces in stock') }}</ion-note>
                  <ion-button fill="clear" v-else size="small" @click.stop="fetchProductStock(item.productId)">
                    <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                  </ion-button>
                </div>
                <div v-if="isKitExpanded(order, item)" class="kit-components">
                  <template v-if="!getProduct(item.productId)?.productComponents">
                    <ion-item lines="none">
                      <ion-skeleton-text animated style="height: 80%;" />
                    </ion-item>
                    <ion-item lines="none">
                      <ion-skeleton-text animated style="height: 80%;" />
                    </ion-item>
                  </template>
                  <template v-else>
                    <ion-item v-for="(productComponent, index) in getProduct(item.productId).productComponents" :key="index" lines="none">
                      <ion-thumbnail slot="start" v-image-preview="getProduct(productComponent.productIdTo)" :key="getProduct(productComponent.productIdTo)?.mainImageUrl">
                        <DxpShopifyImg :src="getProduct(productComponent.productIdTo).mainImageUrl" :key="getProduct(productComponent.productIdTo).mainImageUrl" size="small" />
                      </ion-thumbnail>
                      <ion-label>
                        <p class="overline">{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(productComponent.productIdTo)) }}</p>
                        {{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) : productComponent.productIdTo }}
                        <p>{{ commonUtil.getFeatures(getProduct(productComponent.productIdTo).productFeatures) }}</p>
                      </ion-label>
                    </ion-item>
                  </template>
                </div>
              </div>
            </ion-card>
          </TransitionGroup>

          <ion-infinite-scroll v-if="!isLive" @ionInfinite="loadMoreOpenOrders($event)" threshold="100px" v-show="isOpenOrdersScrollable()" ref="infiniteScrollRef">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
          </ion-infinite-scroll>
        </div>
      </div>
      <div v-if="isLive ? isLiveLoading : isLoadingOrders" class="ion-padding ion-text-center">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
      <ion-fab v-else-if="isLive ? displayedOrders.length : openOrders.total" class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="assignPickers">
          <ion-icon :icon="printOutline" />
        </ion-fab-button>
      </ion-fab>
      <div class="empty-state" v-else>
        <p v-html="getErrorMessage()"></p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBadge, IonButton, IonButtons, IonCard, IonChip, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonMenuButton, IonNote, IonPage, IonSearchbar, IonSkeletonText, IonSpinner, IonThumbnail, IonTitle, IonToolbar, alertController, modalController, onIonViewWillEnter, popoverController } from "@ionic/vue";
import { TransitionGroup, computed, nextTick, ref, shallowRef, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { caretDownOutline, chevronUpOutline, cubeOutline, listOutline, notificationsOutline, optionsOutline, pricetagOutline, printOutline } from "ionicons/icons";
import AssignPickerModal from "@/views/AssignPickerModal.vue";
import { commonUtil, DxpShopifyImg, emitter, logger, moduleFederationUtil, useSolrSearch, translate, useNotificationStore } from "@common";
import ViewSizeSelector from "@/components/ViewSizeSelector.vue";
import OrderActionsPopover from "@/components/OrderActionsPopover.vue";
import { orderUtil } from "@/utils/orderUtil";
import { useLiveOpenOrders } from "@/composables/useLiveOpenOrders";
import { deviceSettings, loadDeviceSettings } from "@/db/deviceSettings";
import { liveOrdersStatus, refreshLiveOrders } from "@/db/liveOrdersSync";
import type { FilterSelections } from "@/utils/openOrderFilters";

import { useOrderStore } from "@/store/order";
import { useProductStore } from "@/store/product";
import { useStockStore } from "@/store/stock";
import { useUtilStore } from "@/store/util";
import { useUserStore } from "@/store/user";
import { useProductStore as useAppProductStore } from "@/store/productStore";
import router from "@/router";
import Actions from "@/authorization/actions";

// Picking from data this old risks orders that already left the queue.
const STALE_AFTER_MS = 5 * 60 * 1000;
// Once the user has scrolled this far, new orders that sort above their view wait until they
// are back at the top, so the cards they are reading never move under them.
const HOLD_INSERTS_BELOW_PX = 48;

const userStore = useUserStore();

const shipmentMethods = ref([] as Array<any>);
const searchedQuery = ref("");
const isScrollingEnabled = ref(false);
const isRejecting = ref(false);
const productCategoryFilterExt = shallowRef(null as any);
const selectedShipmentMethods = ref([] as any);
const isLoadingOrders = ref(false);

const contentRef = ref();
const infiniteScrollRef = ref();

const openOrders = computed(() => useOrderStore().getOpenOrders);
const notifications = computed(() => useNotificationStore().getNotifications);
const unreadNotificationsStatus = computed(() => useNotificationStore().getUnreadNotificationsStatus);
const getProduct = (productId: string) => useProductStore().getProduct(productId);
const getShipmentMethodDesc = (shipmentMethodId: string) => useUtilStore().getShipmentMethodDesc(shipmentMethodId);
const getProductStock = (productId: string) => useStockStore().getProductStock(productId);
const currentFacility = computed(() => useAppProductStore().getCurrentFacility);
const currentProductStore = computed(() => useAppProductStore().getCurrentProductStore);
const productIdentificationPref = computed(() => useAppProductStore().getProductIdentificationPref);

// Live open orders: the Open view of the local orders entity.
const isLive = computed(() => deviceSettings.liveOpenOrders);
const liveQuery = ref("");
const liveSelections = ref<FilterSelections>({});
const pickSize = computed(() => Number(openOrders.value.query.viewSize) || Number(import.meta.env.VITE_VIEW_SIZE));
const {
  hydrated: liveHydrated,
  allOrders: liveAllOrders,
  filteredOrders: liveFilteredOrders,
  visibleOrders: liveVisibleOrders,
  facets: liveFacets,
  dimensions: liveDimensions,
  shipmentMethodLabels
} = useLiveOpenOrders({
  facilityId: computed(() => currentFacility.value?.facilityId),
  productStoreId: computed(() => currentProductStore.value?.productStoreId),
  query: liveQuery,
  selections: liveSelections,
  pickSize
});

const heldOrderKeys = ref(new Set<string>());
const animationsReady = ref(false);
const scrollTop = ref(0);
const expandedKitKeys = ref(new Set<string>());

const ordersTotal = computed(() => isLive.value ? liveAllOrders.value.length : openOrders.value.total);
const animateCards = computed(() => isLive.value && animationsReady.value);
const isLiveLoading = computed(() => !liveHydrated.value || (liveOrdersStatus.mode !== "off" && !liveOrdersStatus.lastSyncAt && !liveAllOrders.value.length));
const isLiveDataStale = () => isLive.value && !!liveOrdersStatus.lastSyncAt && Date.now() - liveOrdersStatus.lastSyncAt > STALE_AFTER_MS;

const displayedOrders = computed(() => isLive.value
  ? liveVisibleOrders.value.filter((order: any) => !heldOrderKeys.value.has(order.orderKey))
  : getOpenOrders());

// Enabled dimensions that have something to filter by. One with no values yet (for example tags
// before product data loads) stays hidden instead of showing an empty row.
const filterableDimensions = computed(() => liveDimensions.value.filter((dimension: any) => liveFacets.value[dimension.id]?.length));

const shipmentMethodLabel = (shipmentMethodTypeId: string) => shipmentMethodLabels.value.get(shipmentMethodTypeId) || getShipmentMethodDesc(shipmentMethodTypeId) || shipmentMethodTypeId;
const filterValueLabel = (dimensionId: string, value: string) => dimensionId === "shipmentMethod" ? shipmentMethodLabel(value) : value;
const isFilterSelected = (dimensionId: string, value: string) => (liveSelections.value[dimensionId] ?? []).includes(value);

// Changes the user makes (filters, search, picklist size) swap the list at once. Motion is for
// changes that arrive from the server, so the user can see what moved without asking for it.
const applyWithoutMotion = (change: () => void) => {
  animationsReady.value = false;
  change();
  nextTick(() => requestAnimationFrame(() => { animationsReady.value = firstPaintReady.value; }));
};

watch([liveQuery, pickSize], () => applyWithoutMotion(() => undefined), { flush: "sync" });

// A new ion-card is inline and unstyled until Ionic sets it up, and its inner components keep
// settling for a frame or two after that, so the list can't measure how far the cards below it
// move, and they would jump as it reaches its real size. Instead the new card lays out hidden and
// out of the flow until its height holds. Then it takes its place, the cards below glide down from
// where they were, and it fades in behind them.
const ENTER_MS = 260;
const ENTER_EASING = "cubic-bezier(0.2, 0.7, 0.2, 1)";
const STAGED_PROPERTIES = ["position", "left", "right", "visibility"];
const enteringAnimations = new WeakMap<Element, Animation[]>();
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

// Waits for the card to keep one height for two frames in a row, for at most ten frames.
const waitForSteadyHeight = async (card: HTMLElement) => {
  let height = card.getBoundingClientRect().height;
  for(let frame = 0, steadyFrames = 0; frame < 10 && steadyFrames < 2; frame++) {
    await nextFrame();
    const nextHeight = card.getBoundingClientRect().height;
    steadyFrames = nextHeight === height ? steadyFrames + 1 : 0;
    height = nextHeight;
  }
};

const collapseEnteringCard = (el: Element) => {
  if(!animateCards.value || prefersReducedMotion()) {return;}
  // Laid out at the list's width, so it wraps as it will in place, without moving anything below.
  Object.assign((el as HTMLElement).style, { position: "absolute", left: "0px", right: "0px", visibility: "hidden", opacity: "0" });
};

const expandEnteringCard = async (el: Element, done: () => void) => {
  const card = el as HTMLElement;
  if(card.style.visibility !== "hidden") {return done();}

  // The card and the Ionic components inside it render on Ionic's schedule; wait until they have.
  await Promise.all([card, ...card.querySelectorAll("*")].map((node: any) => node.componentOnReady?.()));
  await waitForSteadyHeight(card);
  // Removed while waiting: it leaves without ever showing.
  if(!card.isConnected || card.classList.contains("order-leave-active")) {return done();}

  const below: HTMLElement[] = [];
  for(let node = card.nextElementSibling; node; node = node.nextElementSibling) {
    if(node instanceof HTMLElement && !node.classList.contains("order-leave-active")) {below.push(node);}
  }
  const topsBefore = below.map((node) => node.getBoundingClientRect().top);
  STAGED_PROPERTIES.forEach((property) => card.style.removeProperty(property));

  // Started from their old places in the same task, so they never paint at the new ones first.
  const glides = below.map((node, index) => {
    const offset = topsBefore[index] - node.getBoundingClientRect().top;

    return offset ? node.animate([{ transform: `translateY(${offset}px)` }, { transform: "none" }], { duration: ENTER_MS, easing: ENTER_EASING }) : undefined;
  }).filter((animation): animation is Animation => !!animation);
  const fade = card.animate([{ opacity: 0 }, { opacity: 0, offset: 0.25 }, { opacity: 1 }], { duration: ENTER_MS, easing: ENTER_EASING });
  card.style.removeProperty("opacity");

  enteringAnimations.set(card, [fade, ...glides]);
  fade.onfinish = () => {
    enteringAnimations.delete(card);
    done();
  };
};

// The card is leaving: stop its entry where it is, so one that never showed stays hidden.
const stopEnteringCard = (el: Element) => {
  enteringAnimations.get(el)?.forEach((animation) => animation.cancel());
  enteringAnimations.delete(el);
};

const toggleFilter = (dimensionId: string, value: string) => applyWithoutMotion(() => {
  const selected = new Set(liveSelections.value[dimensionId] ?? []);
  if (selected.has(value)) selected.delete(value);
  else selected.add(value);
  liveSelections.value = { ...liveSelections.value, [dimensionId]: [...selected] };
});

const kitKey = (order: any, item: any) => `${order.orderKey || order.orderId}-${item.orderItemSeqId}`;
const isKitExpanded = (order: any, item: any) => isLive.value ? expandedKitKeys.value.has(kitKey(order, item)) : item.showKitComponents;

const toggleKitComponents = (order: any, item: any) => {
  if (!isLive.value) return fetchKitComponents(item);
  const key = kitKey(order, item);
  const expanded = new Set(expandedKitKeys.value);
  if (expanded.has(key)) {
    expanded.delete(key);
  } else {
    expanded.add(key);
    useProductStore().fetchProductComponents({ productId: item.productId });
  }
  expandedKitKeys.value = expanded;
};

// The first card at least partly in view. New orders that sort before it land above the user's view.
const firstVisibleOrderKey = (): string | undefined => {
  const contentEl = contentRef.value?.$el as HTMLElement | undefined;
  if (!contentEl) return undefined;
  const top = contentEl.getBoundingClientRect().top;
  for (const card of contentEl.querySelectorAll<HTMLElement>("[data-order-key]")) {
    if (card.getBoundingClientRect().bottom > top) return card.dataset.orderKey;
  }
  return undefined;
};

watch(() => liveVisibleOrders.value.map((order: any) => order.orderKey as string), (nextKeys, previousKeys) => {
  const present = new Set(nextKeys);
  const held = new Set([...heldOrderKeys.value].filter((key) => present.has(key)));
  if (animationsReady.value && previousKeys && scrollTop.value > HOLD_INSERTS_BELOW_PX) {
    const previous = new Set(previousKeys);
    const anchorIndex = nextKeys.indexOf(firstVisibleOrderKey() ?? "");
    nextKeys.forEach((key, index) => {
      if (index < anchorIndex && !previous.has(key)) held.add(key);
    });
  }
  heldOrderKeys.value = held;
});

// The first paint of a list (page open, facility switch, first sync) appears without animation.
const firstPaintReady = computed(() => liveHydrated.value && (liveAllOrders.value.length > 0 || liveOrdersStatus.lastSyncAt > 0));
watch([firstPaintReady, () => currentFacility.value?.facilityId], ([ready, facilityId], previous) => {
  animationsReady.value = false;
  if (facilityId !== previous?.[1]) heldOrderKeys.value = new Set();
  if (ready) nextTick(() => requestAnimationFrame(() => { animationsReady.value = true; }));
}, { immediate: true });

const onContentScroll = (event: any) => {
  scrollTop.value = event?.detail?.scrollTop ?? 0;
  if (scrollTop.value <= HOLD_INSERTS_BELOW_PX && heldOrderKeys.value.size) heldOrderKeys.value = new Set();
  enableScrolling();
};

const updateOpenQuery = (payload: any) => {
  useOrderStore().updateOpenQuery(payload);
};

const getErrorMessage = () => {
  const query = isLive.value ? liveQuery.value : searchedQuery.value;
  const hasFilters = isLive.value ? Object.values(liveSelections.value).some((values) => values.length) : commonUtil.hasActiveFilters(openOrders.value.query);
  if (isLive.value && !query && hasFilters) return translate("No orders match the selected filters.");
  return query ? (hasFilters ? translate("No results found for . Try using different filters.", { searchedQuery: query }) : translate("No results found for . Try searching In Progress or Completed tab instead. If you still can't find what you're looking for, try switching stores.", { searchedQuery: query, lineBreak: "<br />" })) : translate("doesn't have any outstanding orders right now.", { facilityName: currentFacility.value?.facilityName });
};

const viewNotifications = () => {
  useUserStore().setUnreadNotificationsStatus(false);
  router.push({ path: "/notifications" });
};

const getOpenOrders = () => {
  return JSON.parse(JSON.stringify(openOrders.value.list)).slice(0, (openOrders.value.query.viewIndex + 1) * (import.meta.env.VITE_VIEW_SIZE as any));
};

const enableScrolling = () => {
  const parentElement = contentRef.value?.$el;
  const scrollEl = parentElement?.shadowRoot?.querySelector("main[part='scroll']");
  if (!scrollEl || !infiniteScrollRef.value?.$el) return;
  const scrollHeight = scrollEl.scrollHeight;
  const infiniteHeight = infiniteScrollRef.value.$el.offsetHeight;
  const scrollTop = scrollEl.scrollTop;
  const threshold = 100;
  const height = scrollEl.offsetHeight;
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height;
  isScrollingEnabled.value = !(distanceFromInfinite < 0);
};

const loadMoreOpenOrders = async (event: any) => {
  if (!(isScrollingEnabled.value && isOpenOrdersScrollable())) {
    await event.target.complete();
  }
  const openOrdersQuery = JSON.parse(JSON.stringify(openOrders.value.query));
  openOrdersQuery.viewIndex++;
  await useOrderStore().updateOpenOrderIndex({ ...openOrdersQuery });
  event.target.complete();
};

const isOpenOrdersScrollable = () => {
  return ((openOrders.value.query.viewIndex + 1) * (import.meta.env.VITE_VIEW_SIZE as any)) < openOrders.value.query.viewSize;
};

const updateSelectedShipmentMethods = async (method: string) => {
  const openOrdersQuery = JSON.parse(JSON.stringify(openOrders.value.query));
  const updatedShipmentMethods = openOrdersQuery.selectedShipmentMethods;
  const index = updatedShipmentMethods.indexOf(method);
  if (index < 0) {
    updatedShipmentMethods.push(method);
  } else {
    updatedShipmentMethods.splice(index, 1);
  }

  openOrdersQuery.viewSize = import.meta.env.VITE_VIEW_SIZE;
  openOrdersQuery.selectedShipmentMethods = updatedShipmentMethods;
  selectedShipmentMethods.value = updatedShipmentMethods;

  useOrderStore().updateOpenQuery({ ...openOrdersQuery });
};

const fetchKitComponents = async (orderItem: any) => {
  useProductStore().fetchProductComponents({ productId: orderItem.productId });
  const updatedOrder = openOrders.value.list.find((order: any) => order.orderId === orderItem.orderId);
  const updatedItem = updatedOrder.items.find((item: any) => item.orderItemSeqId === orderItem.orderItemSeqId);
  updatedItem.showKitComponents = orderItem.showKitComponents ? false : true;
};

const assignPickers = async () => {
  // Never pick from an old copy of the queue: bring it up to date first.
  if (isLiveDataStale()) {
    emitter.emit("presentLoader");
    try {
      await refreshLiveOrders();
      await nextTick();
    } finally {
      emitter.emit("dismissLoader");
    }
  }

  const assignPickerModal = await modalController.create({
    component: AssignPickerModal,
    // Live: pick exactly the orders on screen, the filtered set capped by the picklist size.
    componentProps: isLive.value ? { orders: displayedOrders.value } : {}
  });
  return assignPickerModal.present();
};

const fetchShipmentMethods = async () => {
  let resp: any;

  const payload = useSolrSearch().prepareSolrQuery({
    docType: "ORDER",
    viewSize: "0",
    isGroupingRequired: false,
    filters: {
      "-shipmentMethodTypeId": { value: ["STOREPICKUP", "POS_COMPLETED"] },
      orderStatusId: { value: "ORDER_APPROVED" },
      orderTypeId: { value: "SALES_ORDER" },
      productStoreId: { value: currentProductStore.value.productStoreId },
      ...getFacilityFilter(currentFacility.value?.facilityId)
    },
    solrFilters: [
      "((*:* -fulfillmentStatus: [* TO *]) OR fulfillmentStatus:Created)",
      "entryDate:[2025-01-01T00:00:00Z TO *]"
    ],
    facet: {
      shipmentMethodTypeIdFacet: {
        excludeTags: "shipmentMethodTypeIdFilter",
        field: "shipmentMethodTypeId",
        mincount: 1,
        limit: -1,
        sort: "index",
        type: "terms",
        facet: {
          ordersCount: "unique(orderId)"
        }
      }
    }
  });

  try {
    resp = await useSolrSearch().runSolrQuery(payload);
    if (resp.status == 200 && !commonUtil.hasError(resp) && resp.data.facets?.count > 0) {
      shipmentMethods.value = resp.data.facets.shipmentMethodTypeIdFacet.buckets;
      useUtilStore().fetchShipmentMethodTypeDesc(shipmentMethods.value.map((shipmentMethod: any) => shipmentMethod.val));
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to fetch shipment methods information", err);
  }
};

const getFacilityFilter = (value: any): any => {
const facilityFilter = {} as any;
facilityFilter[useAppProductStore().isProductStoreSettingEnabled("USE_RES_FACILITY_ID") ? "reservationFacilityId" : "facilityId"] = { value }
return facilityFilter
}

const updateQueryString = async (queryString: string) => {
  const openOrdersQuery = JSON.parse(JSON.stringify(openOrders.value.query));
  openOrdersQuery.viewSize = import.meta.env.VITE_VIEW_SIZE;
  openOrdersQuery.queryString = queryString;
  await useOrderStore().updateOpenQuery({ ...openOrdersQuery });
  searchedQuery.value = queryString;
};

// The live list only needs the new picklist size; the legacy list refetches from the server.
const applyOpenQuery = async (openOrdersQuery: any) => {
  if (isLive.value) await useOrderStore().updateOpenOrderQuery({ ...openOrdersQuery });
  else await useOrderStore().updateOpenQuery({ ...openOrdersQuery });
};

const updateOrderQuery = async (size: any) => {
  const openOrdersQuery = JSON.parse(JSON.stringify(openOrders.value.query));
  openOrdersQuery.viewSize = size;
  await applyOpenQuery(openOrdersQuery);
};

const initialiseOrderQuery = async () => {
  const openOrdersQuery = JSON.parse(JSON.stringify(openOrders.value.query));
  openOrdersQuery.viewIndex = 0;
  openOrdersQuery.viewSize = import.meta.env.VITE_VIEW_SIZE;
  if (selectedShipmentMethods.value?.length) openOrdersQuery.selectedShipmentMethods = selectedShipmentMethods.value;
  await applyOpenQuery(openOrdersQuery);
};

const recycleOutstandingOrders = async () => {
  const alert = await alertController.create({
    header: translate("Reject all open orders"),
    message: translate("Reject open orders.", { ordersCount: ordersTotal.value }),
    buttons: [{
      text: translate("Cancel"),
      role: "cancel"
    }, {
      text: translate("Reject"),
      handler: async () => {
        isRejecting.value = true;
        emitter.emit("presentLoader");
        await alert.dismiss();

        let resp;

        try {
          resp = await useOrderStore().recycleOutstandingOrders({
            facilityId: currentFacility.value?.facilityId,
            productStoreId: currentProductStore.value.productStoreId,
            reasonId: "INACTIVE_STORE"
          }) as any;


          if (!commonUtil.hasError(resp)) {
            commonUtil.showToast(translate("Rejecting has been started. All outstanding orders will be rejected shortly."));
            // The rejection runs as a background job; each sync removes the orders it has finished.
            if (isLive.value) void refreshLiveOrders();
          } else {
            throw resp.data;
          }
        } catch (err) {
          commonUtil.showToast(translate("Failed to reject outstanding orders"));
          logger.error("Failed to reject outstanding orders", err);
        }
        emitter.emit("dismissLoader");
      }
    }]
  });
  await alert.present();
};

const orderActionsPopover = async (order: any, ev: Event) => {
  const popover = await popoverController.create({
    component: OrderActionsPopover,
    componentProps: {
      order,
      category: "open"
    },
    showBackdrop: false,
    event: ev
  });
  return popover.present();
};

const fetchProductStock = (productId: string) => {
  useStockStore().fetchStock({ productId });
};

onIonViewWillEnter(async () => {
  isScrollingEnabled.value = false;
  await loadDeviceSettings();
  if (isLive.value) {
    await initialiseOrderQuery();
  } else {
    isLoadingOrders.value = true;
    try {
      await Promise.all([initialiseOrderQuery(), fetchShipmentMethods()]);
    } finally {
      isLoadingOrders.value = false;
    }
    const instance = commonUtil.getOmsURL().split("-")[0].replace(new RegExp("^(https|http)://"), "").replace(new RegExp("/api.*"), "").replace(new RegExp(":.*"), "");
    productCategoryFilterExt.value = await moduleFederationUtil.useDynamicImport({ scope: "fulfillment_extensions", module: `${instance}_ProductCategoryFilter` });
  }
  emitter.on("updateOrderQuery", updateOrderQuery);
});

onBeforeRouteLeave(() => {
  useOrderStore().clearOpenOrders();
  emitter.off("updateOrderQuery", updateOrderQuery);
});
</script>

<style scoped>
.order-tags {
  display: flex;
  justify-content: space-between;
}

@media (max-width: 991px) {
  .order-item {
    border-bottom: none;
  }
}

/* Live list updates: removed orders fade out while the rest glide into place. New orders fade in
   from script (expandEnteringCard) while the cards below glide down, since their size isn't known
   until Ionic sets them up. */
.order-list {
  position: relative;
}

.order-leave-active {
  position: absolute;
  inset-inline: 0;
  transition: opacity 220ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.order-move {
  transition: transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.order-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .order-leave-active,
  .order-move {
    transition: none;
  }
}
</style>
