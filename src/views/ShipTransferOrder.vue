<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" data-testid="ship-transfer-orders-back-btn" :default-href="route?.params?.orderId ? `/transfer-order-details/${route.params.orderId}/open` : `/transfer-orders`" />
        <ion-title>{{ translate("Ship transfer order") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main>
        <ion-card class="desktop only order-info">
          <ion-card-header>
            <template v-if="shipmentDetails.shipmentId">
              <ion-card-subtitle>{{ shipmentDetails.orderId }}</ion-card-subtitle>
              <ion-card-title>{{ shipmentDetails.orderName }}</ion-card-title>
            </template>
            <template v-else>
              <ion-card-subtitle><ion-skeleton-text animated class="skeleton-short" /></ion-card-subtitle>
              <ion-card-title><ion-skeleton-text animated class="skeleton-long" /></ion-card-title>
            </template>
          </ion-card-header>
          <ion-item lines="full">
            <ion-icon :icon="storefrontOutline" slot="start" />
            <ion-label>
              <p class="overline">{{ translate("Sending to") }}</p>
              <ion-skeleton-text v-if="!shipmentDetails.shipmentId" animated class="skeleton-short" />
              <template v-else>
                {{ getFacilityName(shipmentDetails.orderFacilityId) }}
              </template>
            </ion-label>
          </ion-item>
          <ion-item v-if="shippingMethodName" lines="full">
            <ion-icon :icon="pricetagOutline" slot="start" />
            <ion-label>
              <p class="overline">{{ translate("Shipping method") }}</p>
              {{ shippingMethodName }}
            </ion-label>
          </ion-item>
          <ion-list>
            <ion-list-header>{{ translate("Items") }}</ion-list-header>
            <template v-if="shipmentDetails.shipmentId">
              <ion-item v-for="item in shipmentItems" :key="item.shipmentItemSeqId">
                <ion-thumbnail slot="start">
                  <Image :key="getProduct(item.productId).mainImageUrl" :src="getProduct(item.productId).mainImageUrl" />
                </ion-thumbnail>
                <ion-label>
                  {{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId)?.internalName }}
                  <p v-if="commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) !== 'null'">
                    {{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}
                  </p>
                </ion-label>
                <ion-label slot="end">
                  {{ item.quantity }}
                </ion-label>
              </ion-item>
            </template>
            <ion-item v-else>
              <ion-thumbnail slot="start">
                <ion-skeleton-text animated />
              </ion-thumbnail>
              <ion-label><ion-skeleton-text animated class="skeleton-long" /></ion-label>
            </ion-item>
          </ion-list>
        </ion-card>

        <div class="shipping">
          <ion-segment v-model="selectedSegment" :disabled="isLabelAccepted || isBusy" @ionChange="segmentChanged">
            <ion-segment-button value="generate">{{ translate("Generate shipping label") }}</ion-segment-button>
            <ion-segment-button value="manual">{{ translate("Manual tracking") }}</ion-segment-button>
          </ion-segment>

          <ion-card v-if="isLabelAccepted">
            <ion-item lines="full">
              <ion-avatar slot="start">
                <Image :src="getCarrierLogo(shipmentDetails.actualCarrierCode || shipmentDetails.routeSegCarrierPartyId)" />
              </ion-avatar>
              <ion-label>
                {{ commonUtil.formatCurrency(shipmentDetails.shippingEstimateAmount, shipmentDetails.currencyUom) }}
                <p>{{ shippingMethodName }}</p>
              </ion-label>
              <ion-note data-testid="tracking-code-value">
                {{ shipmentDetails.trackingIdNumber }}
              </ion-note>
              <ion-button :disabled="!labelTrackingUrl" data-testid="tracking-code-link" fill="clear" size="default" color="medium" @click="openLabelTrackingUrl()">
                <ion-icon slot="icon-only" :icon="openOutline" />
              </ion-button>
            </ion-item>
            <ion-card-content>
              <ion-note v-if="isLabelWindowBlocked" color="warning" class="label-note">
                {{ translate("Unable to open as the browser is blocking pop-ups.", { documentName: "shipping label" }) }}
              </ion-note>
              <ion-button data-testid="reprint-label-btn" fill="outline" color="primary" :disabled="isBusy" @click="printShippingLabel">
                <ion-spinner v-if="isPrintingLabel" slot="start" name="crescent" />
                <ion-icon v-else slot="start" :icon="printOutline" size="small" />
                {{ translate("Re-print shipping label") }}
              </ion-button>
              <ion-button data-testid="void-label-btn" fill="outline" color="warning" :disabled="isBusy" @click="voidShippingLabelAlert">
                <ion-spinner v-if="isVoidingLabel" slot="start" name="crescent" />
                {{ translate("Void shipping label") }}
              </ion-button>
            </ion-card-content>
          </ion-card>

          <template v-else>
            <template v-if="selectedSegment === 'generate'">
              <ion-list v-if="isLoadingRates" data-testid="shipping-rates-loading">
                <ion-item v-for="row in 3" :key="row">
                  <ion-avatar slot="start">
                    <ion-skeleton-text animated />
                  </ion-avatar>
                  <ion-label>
                    <ion-skeleton-text animated class="skeleton-short" />
                    <p><ion-skeleton-text animated class="skeleton-long" /></p>
                  </ion-label>
                  <ion-skeleton-text slot="end" animated class="skeleton-button" />
                </ion-item>
                <ion-item lines="none">
                  <ion-spinner slot="start" name="crescent" />
                  <ion-label color="medium">
                    {{ translate("Loading...") }}
                  </ion-label>
                </ion-item>
              </ion-list>

              <ion-list v-else-if="displayRates.length">
                <ion-item v-for="shippingRate in displayRates" :key="shippingRateKey(shippingRate)">
                  <ion-avatar slot="start">
                    <Image :src="getCarrierLogo(shippingRate.actualCarrierCode || shippingRate.carrierPartyId)" />
                  </ion-avatar>
                  <ion-label>
                    {{ commonUtil.formatCurrency(shippingRate.shippingEstimateAmount, shipmentDetails.currencyUom || shippingRate.currencyUomId) }}
                    <p>{{ getRateName(shippingRate) }}</p>
                    <p v-if="shippingRate?.serviceDays">{{ "Service Days:" }} {{ shippingRate.serviceDays }}</p>
                  </ion-label>
                  <ion-button slot="end" data-testid="purchase-label-btn" color="primary" fill="outline" :disabled="isBusy || !shipmentDetails.shipmentId" @click="generateLabel(shippingRate)">
                    <ion-spinner v-if="selectedRateKey === shippingRateKey(shippingRate)" slot="start" name="crescent" />
                    {{ translate("Generate label") }}
                  </ion-button>
                </ion-item>
                <ion-item lines="none">
                  <ion-button slot="end" data-testid="refresh-rates-btn" fill="clear" size="small" color="medium" :disabled="isBusy || isRefreshingRates" @click="loadShippingRates(true)">
                    <ion-spinner v-if="isRefreshingRates" slot="icon-only" name="crescent" />
                    <ion-icon v-else slot="icon-only" :icon="refreshOutline" />
                  </ion-button>
                </ion-item>
                <ion-item v-if="labelError" lines="none">
                  <ion-label color="danger" class="ion-text-wrap" data-testid="label-error">
                    {{ labelError }}
                  </ion-label>
                </ion-item>
              </ion-list>

              <div v-else class="empty-state">
                <ion-label>{{ translate("No shipping rates found") }}</ion-label>
                <ion-button data-testid="retry-rates-btn" fill="outline" size="small" @click="loadShippingRates(true)">
                  <ion-icon slot="icon-only" :icon="refreshOutline" />
                </ion-button>
                <ion-label v-if="labelError" color="danger" class="ion-text-wrap" data-testid="label-error">
                  {{ labelError }}
                </ion-label>
              </div>
            </template>

            <ion-list v-if="selectedSegment === 'manual'">
              <ion-item>
                <ion-select data-testid="select-carrier-dropdown" :value="selectedCarrier" :label="translate('Carrier')" interface="popover" :placeholder="translate('Select')" @ionChange="updateSelectedCarrier($event.detail.value)">
                  <ion-select-option data-testid="select-carrier-dropdown-option" v-for="(carrierPartyId, index) in Object.keys(carrierShipmentMethods)" :key="index" :value="carrierPartyId">{{ getCarrierDesc(carrierPartyId) }}</ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item>
                <ion-select data-testid="select-method-dropdown" :disabled="!shipmentMethods.length" :value="selectedShippingMethod" :label="translate('Method')" interface="popover" :placeholder="translate('Select')" @ionChange="updateSelectedShippingMethod($event.detail.value)">
                  <template v-for="(method, index) in shipmentMethods" :key="index">
                    <ion-select-option data-testid="select-method-dropdown-option" v-if="method.shipmentMethodTypeId !== 'SHIP_TO_STORE'" :value="method.shipmentMethodTypeId">{{ method.description ? method.description : method.shipmentMethodTypeId }}</ion-select-option>
                  </template>
                </ion-select>
              </ion-item>
              <ion-item lines="full">
                <ion-input data-testid="tracking-code-input" :label="translate('Tracking code')" :placeholder="translate('Enter code')" :value="trackingCode" @ionInput="trackingCode = ($event.target as any).value" />
              </ion-item>
              <ion-item v-if="selectedCarrier || shipmentDetails.carrierPartyId" lines="none">
                {{ generateTrackingUrl() }}
                <ion-button slot="end" data-testid="tracking-test-link" color="primary" fill="clear" :disabled="!trackingCode.trim() || !getTrackingUrl(selectedCarrier)" @click="openTrackingUrl(selectedCarrier, trackingCode)">
                  {{ translate("Test") }}
                  <ion-icon :icon="openOutline" slot="end" />
                </ion-button>
              </ion-item>
            </ion-list>
          </template>
        </div>
      </main>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button data-testid="ship-later-btn-ship-transfer-order-page" :disabled="isLabelAccepted || isBusy" fill="outline" color="primary" @click="shipLater()">
            {{ translate("Ship later") }}
          </ion-button>
          <ion-button data-testid="ship-order-btn" :disabled="isBusy || !shipmentDetails.shipmentId" fill="solid" color="primary" @click="shipOrder">
            <ion-spinner v-if="isProcessingShipment" slot="start" name="crescent" />
            {{ translate("Ship order") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonAvatar, IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonListHeader, IonNote, IonPage, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSkeletonText, IonSpinner, IonThumbnail, IonTitle, IonToolbar, alertController, onIonViewWillEnter, onIonViewDidLeave } from "@ionic/vue";
import { openOutline, pricetagOutline, printOutline, refreshOutline, storefrontOutline } from "ionicons/icons";
import { computed, ref } from "vue";
import { commonUtil, logger, translate } from "@common";
import { useProductStore as useAppProductStore } from "@/store/productStore";
import { useOrderStore } from "@/store/order";
import { onBeforeRouteLeave } from "vue-router";
import Image from "@/components/Image.vue";
import { useProductStore } from "@/store/product";
import { useUtilStore } from "@/store/util";
import { useCarrierStore } from "@/store/carrier";
import { useTransferOrderStore } from "@/store/transferorder";
import { dedupeShippingRates, shippingRateKey, shippingRateName } from "@/utils/shippingRates";
import router from "@/router";
import { refreshLiveOrders } from "@/db/appDbSync";
import { TRANSFER_ORDERS_DOMAIN } from "@/db/domains";

const route = router.currentRoute.value;
const shipmentId = route?.params?.shipmentId as string;
const productIdentificationPref = computed(() => useAppProductStore().getProductIdentificationPref);

const orderStore = useOrderStore();
const transferOrderStore = useTransferOrderStore();
const carrierStore = useCarrierStore();

const getProduct = (productId: string) => useProductStore().getProduct(productId);
const shipmentMethodsByCarrier = computed(() => useUtilStore().getShipmentMethodsByCarrier);
const getCarrierDesc = (carrierId: string) => useUtilStore().getCarrierDesc(carrierId);
const facilityCarriers = computed(() => useCarrierStore().getFacilityCarriers);
const carrierShipmentMethods = computed(() => {
  const carrierByFacility = new Set(facilityCarriers.value.map((item: any) => item.partyId));

  return Object.fromEntries(Object.entries(shipmentMethodsByCarrier.value).filter(([key]) => carrierByFacility.has(key)));
});

const selectedSegment = ref("generate");
const selectedCarrier = ref("");
const shipmentMethods = ref([]) as any;
const selectedShippingMethod = ref("");
// Only for the Manual tracking tab. The tracking number of a bought label is shipmentDetails.trackingIdNumber.
const trackingCode = ref("");
const shipmentDetails = ref({}) as any;
const rawShippingRates = ref<any[]>([]);
// The skeleton shows until the first rates are there. A refresh keeps the list and only spins the refresh button.
const isLoadingRates = ref(true);
const isRefreshingRates = ref(false);
const labelError = ref("");
const isLabelWindowBlocked = ref(false);
const isOrderShipped = ref(false);
const facilities = ref([]) as any;
const isProcessingShipment = ref(false);
const isVoidingLabel = ref(false);
const isPrintingLabel = ref(false);
// The key of the rate whose label is being bought. Set for the whole PUT, label and refresh round trip.
const selectedRateKey = ref("");
const carrierLogos = ref<Record<string, string>>({});
let latestRatesRequest = 0;

// A voided label keeps its tracking number on the shipment, so the status decides, not the presence of the number.
const isLabelAccepted = computed(() => shipmentDetails.value?.carrierServiceStatusId === "SHRSCS_ACCEPTED");
// The loader is only a slim bar, so every action that must not run twice has to disable its own buttons.
const isBusy = computed(() => !!selectedRateKey.value || isVoidingLabel.value || isProcessingShipment.value);

const shipmentItems = computed(() => {
  if(!shipmentDetails.value?.packages) {return [];}

  return shipmentDetails.value.packages.flatMap((pkg: any) => pkg.items || []);
});

const displayRates = computed(() => dedupeShippingRates(rawShippingRates.value, { isCarrierSpecificMethod }));

// Once a label is bought the method that counts is the one on the route segment, not the one the shipment was created with.
const shippingMethodName = computed(() => {
  const shipment = shipmentDetails.value;
  if(isLabelAccepted.value) {
    const carrierPartyId = shipment.actualCarrierCode || shipment.routeSegCarrierPartyId;
    const label = { carrierPartyId, carrierService: shipment.carrierService, shipmentMethodTypeId: shipment.routeSegShipmentMethodTypeId };

    return shippingRateName(label, getCarrierDesc(carrierPartyId), shipment.routeSegShipmentMethodDescription);
  }

  return shipment.carrierPartyId && shipment.shipmentMethodTypeId ? generateRateName(shipment.carrierPartyId, shipment.shipmentMethodTypeId) : "";
});

const labelTrackingUrl = computed(() => getTrackingUrl(shipmentDetails.value.routeSegCarrierPartyId) || getTrackingUrl(shipmentDetails.value.actualCarrierCode));

onIonViewWillEnter(() => {
  // The rates call needs nothing but the shipment id from the route and is the slowest call of the page, so it starts first
  // and nothing waits for it, and nothing it needs waits for the rest.
  loadShippingRates();
  loadShipment();
});

onBeforeRouteLeave(async () => {
  if (isOrderShipped.value) return true;
  if(selectedRateKey.value || isVoidingLabel.value) {
    commonUtil.showToast(translate("Generating label"));

    return false;
  }

  const hasLabel = isLabelAccepted.value;
  if (route?.params?.orderId) {
    let canLeave = false;
    const message = translate("Are you sure that you want to discard this shipment?");
    const alert = await alertController.create({
      header: translate("Discard shipment"),
      message,
      buttons: [
        {
          text: translate("Cancel"),
          handler: () => {
            canLeave = false;
          }
        },
        {
          text: translate("Discard"),
          handler: async () => {
            try {
              // A shipment that is cancelled with a bought label would leave a label that is still charged and cannot be reached.
              if(hasLabel) {
                await voidLabelRequest();
                commonUtil.showToast(translate("Shipping label voided successfully"));
              }
              const resp = await useTransferOrderStore().cancelTransferOrderShipment(shipmentDetails.value.shipmentId);
              if (!commonUtil.hasError(resp)) {
                carrierStore.clearShippingRatesCache(shipmentId);
                commonUtil.showToast(translate("Shipment is discarded."));
                canLeave = true;
                alertController.dismiss();
              } else {
                throw resp.data;
              }
            } catch (err) {
              commonUtil.showToast(translate("Failed to discard transfer order shipment"));
              logger.error("Failed to discard transfer order shipment", err);
              canLeave = false;
            }
          }
        }
      ]
    });
    alert.present();
    await alert.onDidDismiss();
    return canLeave;
  } else {
    let canLeave = false;
    const message = translate("Save this order without tracking details to ship later.");
    const alert = await alertController.create({
      header: translate("Ship later"),
      message,
      buttons: [
        {
          text: translate("Go back"),
          role: "cancel",
          handler: () => {
            canLeave = false;
          }
        },
        {
          text: translate("Ship later"),
          handler: async () => {
            try {
              if(hasLabel) {await voidLabelRequest();}
              const resp = await useTransferOrderStore().cancelTransferOrderShipment(shipmentDetails.value.shipmentId);
              if (!commonUtil.hasError(resp)) {
                canLeave = true;
                carrierStore.clearShippingRatesCache(shipmentId);
                await useTransferOrderStore().clearCurrentTransferOrder();
                alertController.dismiss();
              } else {
                throw resp.data;
              }
            } catch (err) {
              logger.error("Failed to cancel transfer order shipment", err);
              canLeave = false;
            }
          }
        }
      ]
    });
    alert.present();
    await alert.onDidDismiss();
    return canLeave;
  }
});

function segmentChanged() {
  trackingCode.value = "";
}

function updateSelectedCarrier(value: string) {
  selectedCarrier.value = value;
  trackingCode.value = "";
  updateShipmentMethodsForCarrier(selectedCarrier.value);
}

function updateSelectedShippingMethod(value: string) {
  selectedShippingMethod.value = value;
  trackingCode.value = "";
}

function updateShipmentMethodsForCarrier(carrierPartyId: string, shippingMethodId = "") {
  shipmentMethods.value = shipmentMethodsByCarrier.value[carrierPartyId] || [];
  selectedShippingMethod.value = shippingMethodId || shipmentMethods.value[0]?.shipmentMethodTypeId || "";
}

// Everything the page shows about the shipment, loaded together. The rates are not part of it.
async function loadShipment() {
  await Promise.allSettled([
    useAppProductStore().fetchProductStoreFacilities().then((result: any) => { facilities.value = result; }),
    fetchShipmentOrderDetail(shipmentId),
    useUtilStore().fetchStoreCarrierAndMethods(),
    useUtilStore().fetchCarriersDetail(),
    useCarrierStore().fetchFacilityCarriers()
  ]);

  fetchCarrierLogos([shipmentDetails.value?.actualCarrierCode, shipmentDetails.value?.routeSegCarrierPartyId]);

  if(!selectedCarrier.value) {
    selectedCarrier.value = shipmentDetails.value?.carrierPartyId || "";
    if(selectedCarrier.value) {updateShipmentMethodsForCarrier(selectedCarrier.value, shipmentDetails.value.shipmentMethodTypeId);}
  }
}

// Resolves the shipment, or null when it could not be read. The products and logos decorate the page and do not hold it back.
async function fetchShipmentOrderDetail(shipmentId: string) {
  try {
    const resp = await useTransferOrderStore().fetchTransferShipmentDetails({ shipmentId: shipmentId });
    const shipment = resp.data?.shipments?.[0];
    if(commonUtil.hasError(resp) || !shipment) {throw resp.data;}

    shipmentDetails.value = shipment;
    const productIds = [...new Set(shipmentItems.value.map((item: any) => item.productId))];
    if(productIds.length) {useProductStore().fetchProducts({ productIds });}

    return shipment;
  } catch (err) {
    commonUtil.showToast(translate("Failed to update shipment status"));
    logger.error("Failed to fetch the shipment", err);

    return null;
  }
}

async function loadShippingRates(forceRefresh = false) {
  const requestId = ++latestRatesRequest;
  const hasRates = rawShippingRates.value.length > 0;
  isLoadingRates.value = !hasRates;
  isRefreshingRates.value = hasRates;

  try {
    const data = await carrierStore.fetchShippingRates({ shipmentId, forceRefresh });
    if(requestId !== latestRatesRequest) {return;}
    rawShippingRates.value = data?.shippingRates || [];
    fetchCarrierLogos(rawShippingRates.value.map((rate: any) => rate.actualCarrierCode || rate.carrierPartyId));
  } catch (err) {
    if(requestId !== latestRatesRequest) {return;}
    logger.error("Failed to fetch shipping rates.", err);
    // A refresh that fails keeps the rates that are on screen.
    if(!hasRates) {rawShippingRates.value = [];}
  }
  isLoadingRates.value = false;
  isRefreshingRates.value = false;
}

function getCarrierLogo(partyId: string) {
  const carrier = facilityCarriers.value.find((carrier: any) => carrier.partyId === partyId);
  return carrier?.logoUrl || carrierLogos.value[partyId?.toUpperCase()] || "";
}

function getFacilityName(facilityId: string) {
  const facility = facilities.value.find((facility: any) => facility.facilityId === facilityId);
  return facility ? facility.facilityName || facility.facilityId : facilityId;
}

function getTrackingUrl(carrierPartyId: string) {
  return facilityCarriers.value.find((carrier: any) => carrier.partyId === carrierPartyId)?.trackingUrl;
}

function generateTrackingUrl() {
  const trackingUrl = getTrackingUrl(selectedCarrier.value);
  if(trackingUrl) {
    return translate("Tracking URL:", { trackingUrl: trackingUrl.replace("${trackingNumber}", trackingCode.value) });
  }
  return translate("A tracking URL is not configured for", { carrierName: getCarrierDesc(selectedCarrier.value) });
}

function openTrackingUrl(carrierPartyId: string, trackingNumber: string) {
  const trackingUrl = getTrackingUrl(carrierPartyId);
  if(trackingUrl) {window.open(trackingUrl.replace("${trackingNumber}", trackingNumber), "_blank");}
}

function openLabelTrackingUrl() {
  const trackingUrl = labelTrackingUrl.value;
  if(trackingUrl) {window.open(trackingUrl.replace("${trackingNumber}", shipmentDetails.value.trackingIdNumber), "_blank");}
}

// The logos of the facility carriers come with them, only a carrier outside that list is asked for.
async function fetchCarrierLogos(carriers: string[] = []) {
  const carrierIds = Array.from(new Set(carriers
    .filter((carrierId): carrierId is string => Boolean(carrierId))
    .map((carrierId: string) => carrierId.toUpperCase())));

  const hasLogo = (carrierId: string) => carrierLogos.value[carrierId] || facilityCarriers.value.some((carrier: any) => carrier.partyId?.toUpperCase() === carrierId && carrier.logoUrl);
  const carrierIdsToFetch = carrierIds.filter((carrierId: string) => !hasLogo(carrierId));
  if (!carrierIdsToFetch.length) return;

  try {
    const logoUrls = await carrierStore.fetchCarrierLogos(carrierIdsToFetch);
    const logoMap = { ...carrierLogos.value };
    Object.keys(logoUrls).map((key: any) => {
      logoMap[key.toUpperCase()] = logoUrls[key];
    });
    carrierLogos.value = logoMap;
  } catch (error) {
    logger.error("Failed to fetch carrier logos", error);
  }
}

// A method that exactly one carrier of the product store offers (FDX_GROUND), as opposed to one all of them offer (STANDARD).
function isCarrierSpecificMethod(carrierPartyId: string, shipmentMethodTypeId: string) {
  const carriersOfMethod = Object.keys(shipmentMethodsByCarrier.value).filter((partyId: string) => shipmentMethodsByCarrier.value[partyId]?.some((method: any) => method.shipmentMethodTypeId === shipmentMethodTypeId));

  return carriersOfMethod.length === 1 && carriersOfMethod[0] === carrierPartyId;
}

function generateRateName(carrierPartyId: string, shipmentMethodTypeId: string) {
  const carrierDesc = getCarrierDesc(carrierPartyId) || carrierPartyId;
  const methodDesc = shipmentMethodsByCarrier.value[carrierPartyId]?.find((method: any) => method.shipmentMethodTypeId === shipmentMethodTypeId)?.description || shipmentMethodTypeId;
  return `${carrierDesc} - ${methodDesc}`;
}

function getRateName(rate: any) {
  const methodDesc = shipmentMethodsByCarrier.value[rate.carrierPartyId]?.find((method: any) => method.shipmentMethodTypeId === rate.shipmentMethodTypeId)?.description;

  return shippingRateName(rate, getCarrierDesc(rate.carrierPartyId), methodDesc);
}

function getLabelPdfUrls(shipment: any): string[] {
  return Array.from(new Set((shipment.packages ?? []).filter((shipmentPackage: any) => shipmentPackage.labelImageUrl).map((shipmentPackage: any) => shipmentPackage.labelImageUrl)));
}

// The message the gateway gave for the failed label, when it gave one.
async function fetchLabelErrorMessage() {
  try {
    return await orderStore.fetchShipmentLabelError(shipmentId) || "";
  } catch {
    return "";
  }
}

// One purchase: choose the carrier and method on the route segment, buy the label, then read back the tracking number.
// The shipment and the label PDF are independent once the label exists, so they are fetched together, and the print
// is not waited for: the button stops spinning when the label and the tracking number are on screen.
async function generateLabel(shippingRate: any) {
  if(isBusy.value) {return;}

  selectedRateKey.value = shippingRateKey(shippingRate);
  labelError.value = "";
  isLabelWindowBlocked.value = false;

  try {
    const payload = {
      shipmentId: shipmentDetails.value.shipmentId,
      shipmentRouteSegmentId: shipmentDetails.value.shipmentRouteSegmentId,
      shipmentMethodTypeId: shippingRate.shipmentMethodTypeId || shippingRate.carrierServiceCode,
      carrierPartyId: shippingRate.carrierPartyId,
      actualCost: shippingRate.shippingEstimateAmount,
      carrierServiceStatusId: "SHRSCS_CONFIRMED"
    } as any;

    if(shippingRate.actualCarrierCode) {
      payload.actualCarrierCode = shippingRate.actualCarrierCode;
    }
    if(shippingRate.carrierService) {
      payload.carrierService = shippingRate.carrierService;
    }
    if(shippingRate.gatewayRateId) {
      payload.gatewayRateId = shippingRate.gatewayRateId;
    }

    const resp = await orderStore.updateRouteShipmentCarrierAndMethod(payload);
    if(commonUtil.hasError(resp)) {throw resp.data;}

    await transferOrderStore.generateShippingLabel(shipmentDetails.value.shipmentId);

    const [shipment] = await Promise.all([
      fetchShipmentOrderDetail(shipmentDetails.value.shipmentId),
      transferOrderStore.fetchShippingLabelPdfUrl(shipmentDetails.value.shipmentId).catch(() => null)
    ]);

    // The tracking number of an earlier, voided label is still on the shipment, so only an accepted label counts.
    if(!shipment || shipment.carrierServiceStatusId !== "SHRSCS_ACCEPTED" || !shipment.trackingIdNumber) {
      throw new Error("The shipping label was not accepted");
    }

    commonUtil.showToast(translate("Shipping Label generated successfully"));
    printLabelInBackground();
  } catch (error) {
    logger.error("Failed to generate shipping label", error);
    labelError.value = await fetchLabelErrorMessage();
    commonUtil.showToast(translate("Failed to generate shipping label"));
  } finally {
    selectedRateKey.value = "";
  }
}

// The window opens after a few seconds of waiting, so a browser may refuse it. The label is on screen either way, and Re-print
// opens it from a click.
async function printLabelInBackground() {
  const isOpened = await transferOrderStore.printShippingLabel([shipmentDetails.value.shipmentId], getLabelPdfUrls(shipmentDetails.value), shipmentDetails.value?.packages);
  isLabelWindowBlocked.value = !isOpened;
}

async function printShippingLabel() {
  const shipment = shipmentDetails.value;
  if(!isLabelAccepted.value || isPrintingLabel.value) {return;}

  isPrintingLabel.value = true;
  try {
    const isOpened = await transferOrderStore.printShippingLabel([shipment.shipmentId], getLabelPdfUrls(shipment), shipment.packages);
    isLabelWindowBlocked.value = !isOpened;
  } catch (err) {
    commonUtil.showToast(translate("Failed to print shipping label"));
    logger.error("Failed to print shipping label", err);
  }
  isPrintingLabel.value = false;
}

async function voidLabelRequest() {
  const routeSegmentId = shipmentDetails.value?.shipmentRouteSegmentId;
  if(!routeSegmentId) {throw new Error("The shipment has no route segment");}

  const resp = await orderStore.voidShipmentLabel({
    shipmentId: shipmentDetails.value.shipmentId,
    shipmentRouteSegmentId: routeSegmentId
  });
  if(commonUtil.hasError(resp)) {throw resp.data;}
  transferOrderStore.clearShippingLabelPdf(shipmentDetails.value.shipmentId);
}

async function voidShippingLabel() {
  if(isBusy.value) {return;}

  isVoidingLabel.value = true;
  try {
    await voidLabelRequest();
    commonUtil.showToast(translate("Shipping label voided successfully"));
    isLabelWindowBlocked.value = false;
    labelError.value = "";
    selectedSegment.value = "generate";
    await fetchShipmentOrderDetail(shipmentDetails.value.shipmentId);
    // The rates do not depend on the label, so the same list is there to buy from again. Only an empty one is asked for again.
    if(!rawShippingRates.value.length) {loadShippingRates();}
  } catch (err) {
    logger.error("Failed to void shipping label", err);
    commonUtil.showToast(translate("Failed to void shipping label"));
  }
  isVoidingLabel.value = false;
}

async function voidShippingLabelAlert() {
  const alert = await alertController.create({
    header: translate("Void shipping label"),
    buttons: [
      {
        text: translate("Cancel"),
        htmlAttributes: {
          "data-testid": "voidlabel-cancel-btn"
        }
      },
      {
        text: translate("Confirm"),
        htmlAttributes: {
          "data-testid": "voidlabel-confirm-btn"
        },
        // The alert closes at once and the Void button spins, instead of the alert staying open for the carrier's answer.
        handler: () => {
          voidShippingLabel();
        }
      }
    ]
  });
  return alert.present();
}

async function shipLater() {
  route?.params?.orderId ? router.replace({ path: `/transfer-order-details/${route?.params?.orderId}/open` }) : router.replace({ path: "/transfer-orders" });
}

async function shipOrder() {
  const shipment = shipmentDetails.value;
  if(!shipment?.shipmentId || isBusy.value) {return;}

  // A bought label decides, whichever tab was last open.
  const isManual = !isLabelAccepted.value && selectedSegment.value === "manual";
  if(isManual) {
    if (!selectedCarrier.value) {
      commonUtil.showToast(translate("Please select a carrier"));
      return;
    }
    if (!selectedShippingMethod.value) {
      commonUtil.showToast(translate("Please select a shipping method"));
      return;
    }
    if(!trackingCode.value.trim()) {
      commonUtil.showToast(translate("Please enter a tracking number"));
      return;
    }
  } else if(!isLabelAccepted.value || !shipment.trackingIdNumber) {
    commonUtil.showToast(translate("Please generate a shipping label"));
    return;
  }

  try {
    isProcessingShipment.value = true;
    const payload: any = {
      shipmentId: shipment.shipmentId,
      shipmentRouteSegmentId: shipment.shipmentRouteSegmentId,
      carrierPartyId: shipment.routeSegCarrierPartyId,
      shipmentMethodTypeId: shipment.routeSegShipmentMethodTypeId,
      trackingIdNumber: shipment.trackingIdNumber
    };

    if(isManual) {
      Object.assign(payload, {
        carrierPartyId: selectedCarrier.value,
        shipmentMethodTypeId: selectedShippingMethod.value,
        trackingIdNumber: trackingCode.value.trim()
      });
    }
    isOrderShipped.value = true;
    const resp = await useTransferOrderStore().shipTransferOrderShipment(payload);
    if(commonUtil.hasError(resp)) {throw resp.data;}

    carrierStore.clearShippingRatesCache(shipment.shipmentId);
    commonUtil.showToast(translate("Shipment shipped successfully."));
    route?.params?.orderId ? router.replace({ path: `/transfer-order-details/${route?.params?.orderId}/open` }) : router.replace({ path: "/transfer-orders" });
  } catch (err) {
    isProcessingShipment.value = false;
    isOrderShipped.value = false;
    logger.error("Failed to ship the shipment.", err);
    commonUtil.showToast(translate("Something went wrong, could not ship the shipment"));
  }
}

// Leaving after a shipment, a label or a new transfer order: the list the user returns to is read again.
onIonViewDidLeave(() => {
  void refreshLiveOrders([TRANSFER_ORDERS_DOMAIN]);
});
</script>

<style scoped>
main {
  display: flex;
  align-items: start;
  gap: var(--spacer-base);
  padding: var(--spacer-base);
}

.transfer-order > * {
  margin: 0;
}

.order-info {
  flex: 1;
}

.shipping {
  flex: 3;
}

hr {
  margin: 0;
}

ion-note {
  align-self: center;
}

.label-note {
  display: block;
  margin-bottom: var(--spacer-sm);
}

.skeleton-short {
  width: 30%;
}

.skeleton-long {
  width: 60%;
}

.skeleton-button {
  width: 110px;
  height: 36px;
}
</style>
