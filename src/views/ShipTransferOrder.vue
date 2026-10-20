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
          <ion-list v-if="packageViews.length" data-testid="package-details">
            <ion-item v-for="(packageView, index) in packageViews" :key="packageView.shipmentPackageSeqId" lines="full">
              <ion-icon :icon="cubeOutline" slot="start" />
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ packageViews.length > 1 ? translate("Package {number}, estimated weight", { number: index + 1 }) : translate("Estimated weight") }}</p>
                <span data-testid="package-weight">{{ packageView.weightText || translate("No weight on file") }}</span>
                <p data-testid="package-box">{{ packageBoxLine(packageView) }}</p>
                <p v-if="packageView.isOverLimit" class="package-note" data-testid="package-over-limit">
                  {{ translate("Over the {limit} lb limit of a FedEx package, so FedEx refuses it.", { limit: CARRIER_PACKAGE_WEIGHT_LIMIT_LB }) }}
                </p>
                <p v-if="packageView.missingWeightCount" class="package-note" data-testid="package-missing-weight">
                  {{ translate("{count} items have no weight on file, so this weight and the rates may be too low.", { count: packageView.missingWeightCount }) }}
                </p>
              </ion-label>
              <ion-button v-if="!isLabelAccepted" slot="end" data-testid="edit-package-btn" fill="clear" color="medium" :aria-label="translate('Change package')" :disabled="isBusy" @click="editPackage(packageView, index)">
                <ion-spinner v-if="isSavingPackage" slot="icon-only" name="crescent" />
                <ion-icon v-else slot="icon-only" :icon="createOutline" />
              </ion-button>
            </ion-item>
          </ion-list>
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

          <StepProgress v-if="labelProgress" data-testid="label-progress" :title="labelProgressTitle" :subtitle="labelProgressSubtitle" :steps="labelSteps" :active-index="labelProgress.activeIndex" />

          <ion-card v-else-if="isLabelAccepted">
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
              <StepProgress v-if="isLoadingRates" data-testid="shipping-rates-loading" :title="translate('Finding your shipping options')" :steps="rateSteps" :active-index="0" />

              <ion-list v-else-if="displayRates.length || isStreamingRates">
                <!-- Where the backend rates one service at a time, the bar counts the services whose carrier has answered. -->
                <ion-item v-if="isStreamingRates && isRateLookupRunning" lines="none" data-testid="rates-progress">
                  <ion-label>
                    {{ translate("Checking {total} shipping services, {done} back", { total: rateRows.length, done: settledRateCount }) }}
                    <ion-progress-bar :value="settledRateCount / rateRows.length" />
                  </ion-label>
                </ion-item>
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
                <ion-item v-for="row in unratedRows" :key="row.key" lines="none" class="unrated" :data-testid="`rate-row-${row.status}`">
                  <ion-avatar slot="start">
                    <Image :src="getCarrierLogo(row.carrierPartyId)" />
                  </ion-avatar>
                  <ion-label color="medium">
                    {{ rowName(row) }}
                    <p v-if="row.status === 'pending'">{{ translate("Checking the price") }}</p>
                    <p v-else>{{ translate("No rate available") }}</p>
                  </ion-label>
                  <ion-spinner v-if="row.status === 'pending'" slot="end" name="dots" />
                  <ion-button v-else slot="end" data-testid="retry-rate-row-btn" fill="clear" size="small" color="medium" :disabled="isBusy" :aria-label="translate('Try again')" @click="retryRateRow(row.key)">
                    <ion-icon slot="icon-only" :icon="refreshOutline" />
                  </ion-button>
                </ion-item>
                <ion-item lines="none">
                  <ion-button slot="end" data-testid="refresh-rates-btn" fill="clear" size="small" color="medium" :disabled="isBusy || isRefreshingRates || isRateLookupRunning" @click="loadShippingRates(true)">
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
import { IonAvatar, IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonListHeader, IonNote, IonPage, IonProgressBar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSkeletonText, IonSpinner, IonThumbnail, IonTitle, IonToolbar, alertController, modalController, onIonViewWillEnter, onIonViewDidLeave } from "@ionic/vue";
import { createOutline, cubeOutline, openOutline, pricetagOutline, printOutline, refreshOutline, storefrontOutline } from "ionicons/icons";
import { computed, ref, watch } from "vue";
import { commonUtil, logger, translate } from "@common";
import { useProductStore as useAppProductStore } from "@/store/productStore";
import { useOrderStore } from "@/store/order";
import { onBeforeRouteLeave } from "vue-router";
import Image from "@/components/Image.vue";
import PackageDetailsModal from "@/components/PackageDetailsModal.vue";
import StepProgress from "@/components/StepProgress.vue";
import { useProductStore } from "@/store/product";
import { useUtilStore } from "@/store/util";
import { useCarrierStore } from "@/store/carrier";
import { useTransferOrderStore } from "@/store/transferorder";
import { dedupeShippingRates, shippingRateKey, shippingRateName } from "@/utils/shippingRates";
import { CARRIER_PACKAGE_WEIGHT_LIMIT_LB, type PackageView, toPackageView, weightBreakdown } from "@/utils/packageDetails";
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
// The rate lookup lives in the carrier store, so the one the create-shipment prefetch started is the one this page shows.
const rateStream = computed(() => carrierStore.rateStreams[shipmentId]);
const rawShippingRates = computed(() => rateStream.value?.rates ?? []);
const rateRows = computed(() => rateStream.value?.rows ?? []);
const isStreamingRates = computed(() => rateStream.value?.mode === "stream");
const isRateLookupRunning = computed(() => rateStream.value?.status === "loading");
// The progress card shows until there is something to list. Where services are rated one at a time they are listed at once.
const isLoadingRates = computed(() => !rateStream.value || (isRateLookupRunning.value && !isStreamingRates.value && !rawShippingRates.value.length));
// A refresh keeps the list and only spins the refresh button.
const isRefreshingRates = computed(() => isRateLookupRunning.value && !isStreamingRates.value && rawShippingRates.value.length > 0);
const settledRateCount = computed(() => rateRows.value.filter((row) => row.status !== "pending").length);
// A service that has not answered yet, and one that did not return a rate. When none did (the carrier is down) they are all listed,
// each with its own retry.
const unratedRows = computed(() => rateRows.value.filter((row) => row.status === "pending" || row.status === "failed"));
const labelError = ref("");
const isLabelWindowBlocked = ref(false);
const isOrderShipped = ref(false);
const facilities = ref([]) as any;
const isProcessingShipment = ref(false);
const isVoidingLabel = ref(false);
const isSavingPackage = ref(false);
// The boxes a package can be changed to: the ones with a size (the BOPIS packaging has none).
const boxTypes = ref<any[]>([]);
const isPrintingLabel = ref(false);
// The key of the rate whose label is being bought. Set for the whole PUT, label and refresh round trip.
const selectedRateKey = ref("");
const carrierLogos = ref<Record<string, string>>({});
let ratesAskedWithLabel = false;

// Where a label purchase is: 0 locking in the service, 1 the carrier creating the label, 2 reading the label back, 3 all done.
// Null when no label is being bought.
const LABEL_STEP_COUNT = 3;
// The finished state stays on screen for a moment so the last step is seen to complete before the label card replaces it.
const LABEL_READY_HOLD_MS = 500;
const labelProgress = ref<{ activeIndex: number; serviceName: string; carrierName: string; amount: string } | null>(null);

function setLabelStep(activeIndex: number) {
  if(labelProgress.value) {labelProgress.value.activeIndex = activeIndex;}
}

const labelSteps = computed(() => {
  const serviceName = labelProgress.value?.serviceName || "";
  const carrierName = labelProgress.value?.carrierName || "";

  return [
    { label: translate("Locking in {serviceName}", { serviceName }), doneLabel: translate("Locked in {serviceName}", { serviceName }) },
    {
      label: translate("Buying the label from {carrierName}", { carrierName }),
      doneLabel: translate("Label bought from {carrierName}", { carrierName }),
      hints: [
        { afterSeconds: 0, text: translate("{carrierName} is creating your label", { carrierName }) },
        { afterSeconds: 5, text: translate("This is the slow part, carriers can take a few seconds") },
        { afterSeconds: 12, text: translate("Still waiting on {carrierName}, nearly there", { carrierName }) }
      ]
    },
    { label: translate("Fetching your label and tracking number"), doneLabel: translate("Label and tracking number received") }
  ];
});

const labelProgressTitle = computed(() => labelProgress.value && labelProgress.value.activeIndex >= LABEL_STEP_COUNT ? translate("Your shipping label is ready") : translate("Generating your shipping label"));
const labelProgressSubtitle = computed(() => {
  if(!labelProgress.value) {return "";}
  if(labelProgress.value.activeIndex >= LABEL_STEP_COUNT) {return translate("Tracking number: {trackingNumber}", { trackingNumber: shipmentDetails.value?.trackingIdNumber || "" });}

  return [labelProgress.value.serviceName, labelProgress.value.amount].filter(Boolean).join(" · ");
});

// The rates call is one request to the backend, which asks the carrier about each service, so there is no real progress to
// report. The lines reassure the user that it is working, by how long it has been.
const rateSteps = computed(() => [
  {
    label: translate("Asking the carriers for live rates"),
    hints: [
      { afterSeconds: 0, text: translate("Sending the package details") },
      { afterSeconds: 3, text: translate("Waiting for the carriers to price each service") },
      { afterSeconds: 9, text: translate("Carriers can take a little while, hang tight") },
      { afterSeconds: 18, text: translate("Still working on it, almost there") }
    ]
  },
  { label: translate("Lining up your shipping options") }
]);

// A voided label keeps its tracking number on the shipment, so the status decides, not the presence of the number.
const isLabelAccepted = computed(() => shipmentDetails.value?.carrierServiceStatusId === "SHRSCS_ACCEPTED");
// The loader is only a slim bar, so every action that must not run twice has to disable its own buttons.
const isBusy = computed(() => !!selectedRateKey.value || isVoidingLabel.value || isProcessingShipment.value || isSavingPackage.value);

const shipmentItems = computed(() => {
  if(!shipmentDetails.value?.packages) {return [];}

  return shipmentDetails.value.packages.flatMap((pkg: any) => pkg.items || []);
});

const packageViews = computed(() => (shipmentDetails.value?.packages ?? []).map((shipmentPackage: any) => toPackageView(shipmentPackage, Object.fromEntries(boxTypes.value.map((boxType: any) => [boxType.shipmentBoxTypeId, boxType.description])))));

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
  loadBoxTypes();
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
  // The rates lookup started before this was known. On a shipment that already has a label it came back as one service repeated,
  // so after a void they are asked for again.
  if(isLabelAccepted.value) {ratesAskedWithLabel = true;}

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

function packageBoxLine(packageView: PackageView) {
  return [packageView.boxName, packageView.boxSize].filter(Boolean).join(" · ") || translate("No box");
}

async function loadBoxTypes() {
  try {
    const resp = await carrierStore.fetchShipmentBoxType({ pageSize: 50 });
    if(commonUtil.hasError(resp)) {throw resp.data;}
    boxTypes.value = (resp.data ?? []).filter((boxType: any) => boxType.boxLength && boxType.boxWidth && boxType.boxHeight);
  } catch (err) {
    logger.error("Failed to fetch the box types", err);
  }
}

// The words for an item in the weight breakdown: its identifier as the left card shows it, and the second identifier under it.
function describePackageItem(item: any) {
  const product = getProduct(item.productId);
  const primary = commonUtil.getProductIdentificationValue(productIdentificationPref.value.primaryId, product);
  const secondary = commonUtil.getProductIdentificationValue(productIdentificationPref.value.secondaryId, product);

  return {
    name: primary && primary !== "null" ? primary : (product?.productName || item.productId),
    detail: secondary && secondary !== "null" ? secondary : "",
    imageUrl: product?.mainImageUrl || ""
  };
}

async function editPackage(packageView: PackageView, index: number) {
  if(isBusy.value || isLabelAccepted.value) {return;}
  if(!boxTypes.value.length) {await loadBoxTypes();}

  const shipmentPackage = (shipmentDetails.value?.packages ?? []).find((candidate: any) => candidate.shipmentPackageSeqId === packageView.shipmentPackageSeqId);
  const breakdown = weightBreakdown(shipmentPackage?.items, packageView.weightUomId, describePackageItem);
  const modal = await modalController.create({
    component: PackageDetailsModal,
    componentProps: { title: packageViews.value.length > 1 ? translate("Package {number}", { number: index + 1 }) : translate("Package"), packageView, boxTypes: boxTypes.value, breakdown }
  });
  await modal.present();
  const { data, role } = await modal.onDidDismiss();
  if(role === "save" && data && Object.keys(data).length) {await savePackage(packageView, data);}
}

// The weight and the box change what the carrier is asked, so the rates are asked for again.
async function savePackage(packageView: PackageView, changes: { shipmentBoxTypeId?: string; weight?: number; weightUomId?: string }) {
  if(isBusy.value) {return;}

  isSavingPackage.value = true;
  try {
    const resp = await transferOrderStore.updateShipmentPackage({ shipmentId, shipmentPackageSeqId: packageView.shipmentPackageSeqId, ...changes });
    if(commonUtil.hasError(resp)) {throw resp.data;}

    await fetchShipmentOrderDetail(shipmentId);
    carrierStore.clearShippingRatesCache(shipmentId);
    loadShippingRates(true);
    commonUtil.showToast(translate("Package updated"));
  } catch (err: any) {
    logger.error("Failed to update the package", err);
    commonUtil.showToast(err?.response?.data?.errors || translate("Failed to update the package"));
  }
  isSavingPackage.value = false;
}

function loadShippingRates(forceRefresh = false) {
  return carrierStore.streamShippingRates(shipmentId, { forceRefresh });
}

watch(rawShippingRates, (rates) => {
  fetchCarrierLogos(rates.map((rate: any) => rate.actualCarrierCode || rate.carrierPartyId));
});

function retryRateRow(key: string) {
  carrierStore.retryRateService(shipmentId, key);
}

// The name of a service that has no rate yet: the carrier's own name for its shipment method.
function rowName(row: { carrierPartyId: string; shipmentMethodTypeIds: string[] }) {
  const shipmentMethodTypeId = row.shipmentMethodTypeIds.find((id: string) => isCarrierSpecificMethod(row.carrierPartyId, id)) ?? row.shipmentMethodTypeIds[0];

  return getRateName({ carrierPartyId: row.carrierPartyId, shipmentMethodTypeId });
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
  labelProgress.value = {
    activeIndex: 0,
    serviceName: getRateName(shippingRate),
    carrierName: getCarrierDesc(shippingRate.carrierPartyId) || shippingRate.carrierPartyId,
    amount: commonUtil.formatCurrency(shippingRate.shippingEstimateAmount, shipmentDetails.value.currencyUom || shippingRate.currencyUomId)
  };

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
    setLabelStep(1);

    await transferOrderStore.generateShippingLabel(shipmentDetails.value.shipmentId);
    setLabelStep(2);

    const [shipment] = await Promise.all([
      fetchShipmentOrderDetail(shipmentDetails.value.shipmentId),
      transferOrderStore.fetchShippingLabelPdfUrl(shipmentDetails.value.shipmentId).catch(() => null)
    ]);

    // The tracking number of an earlier, voided label is still on the shipment, so only an accepted label counts.
    if(!shipment || shipment.carrierServiceStatusId !== "SHRSCS_ACCEPTED" || !shipment.trackingIdNumber) {
      throw new Error("The shipping label was not accepted");
    }

    setLabelStep(LABEL_STEP_COUNT);
    commonUtil.showToast(translate("Shipping Label generated successfully"));
    printLabelInBackground();
    await new Promise((resolve) => setTimeout(resolve, LABEL_READY_HOLD_MS));
  } catch (error) {
    logger.error("Failed to generate shipping label", error);
    // The rates come back at once, the reason follows when the gateway has one.
    labelProgress.value = null;
    labelError.value = await fetchLabelErrorMessage();
    commonUtil.showToast(translate("Failed to generate shipping label"));
  } finally {
    labelProgress.value = null;
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
    // Rates asked for before the label was bought do not depend on it, so the same list is there to buy from again. An empty one,
    // or one asked for while the shipment already had a label, is asked for again.
    if(ratesAskedWithLabel) {
      ratesAskedWithLabel = false;
      loadShippingRates(true);
    } else if(!rawShippingRates.value.length) {
      loadShippingRates();
    }
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

.package-note {
  color: var(--ion-color-warning-shade);
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
</style>
