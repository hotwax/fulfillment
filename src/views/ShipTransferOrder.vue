<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button data-testid="ship-transfer-orders-back-btn" slot="start" :defaultHref="route?.params?.orderId ? `/transfer-order-details/${shipmentDetails.orderId}/open` : `/transfer-orders`" />
        <ion-title>{{ translate("Ship transfer order") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main>
        <ion-card class="desktop only order-info">
          <ion-card-header>
            <ion-card-subtitle>{{ shipmentDetails.orderId }}</ion-card-subtitle>
            <ion-card-title>{{ shipmentDetails.orderName }}</ion-card-title>
          </ion-card-header>
          <ion-item lines="full">
            <ion-icon :icon="storefrontOutline" slot="start" />
            <ion-label>
              <p class="overline">{{ translate("Sending to") }}</p>
              {{ getFacilityName(shipmentDetails.orderFacilityId) }}
            </ion-label>
          </ion-item>
          <ion-item lines="full" v-if="shipmentDetails?.carrierPartyId && shipmentDetails?.shipmentMethodTypeId">
            <ion-icon :icon="pricetagOutline" slot="start" />
            <ion-label>
              <p class="overline">{{ translate("Shipping method") }}</p>
              {{ generateRateName(shipmentDetails.carrierPartyId, shipmentDetails.shipmentMethodTypeId) }}
            </ion-label>
          </ion-item>
          <ion-list>
            <ion-list-header>{{ translate("Items") }}</ion-list-header>
            <ion-item v-for="item in shipmentItems" :key="item.shipmentItemSeqId">
              <ion-thumbnail slot="start">
                <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" :key="getProduct(item.productId).mainImageUrl" />
              </ion-thumbnail>
              <ion-label>
                {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId)?.internalName }}
                <p v-if="getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) !== 'null'">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
              </ion-label>
              <ion-label slot="end">{{ item.quantity }}</ion-label>
            </ion-item>
          </ion-list>
        </ion-card>

        <div class="shipping">
          <ion-segment :disabled="shipmentDetails?.carrierServiceStatusId === 'SHRSCS_ACCEPTED'" v-model="selectedSegment" @ionChange="segmentChanged">
            <ion-segment-button value="generate">{{ translate("Generate shipping label") }}</ion-segment-button>
            <ion-segment-button value="manual">{{ translate("Manual tracking") }}</ion-segment-button>
          </ion-segment>

          <ion-card v-if="shipmentDetails?.carrierServiceStatusId === 'SHRSCS_ACCEPTED'">
            <ion-item lines="full">
              <ion-avatar slot="start">
                <Image :src="getCarrierLogo(shipmentDetails.actualCarrierCode || shipmentDetails.routeSegCarrierPartyId)" />
              </ion-avatar>
              <ion-label>
                {{ commonUtil.formatCurrency(shipmentDetails.shippingEstimateAmount, shipmentDetails.currencyUom) }}
                <p>{{ generateRateName(shipmentDetails.actualCarrierCode || shipmentDetails.routeSegCarrierPartyId, shipmentDetails.carrierService || shipmentDetails.routeSegShipmentMethodTypeId) }}</p>
              </ion-label>
              <ion-note>{{ shipmentDetails.trackingIdNumber }}</ion-note>
              <ion-button :disabled="!getCarrierTrackingUrl()" data-testid="tracking-code-link" fill="clear" size="default" color="medium" @click="redirectToTrackingUrl()">
                <ion-icon slot="icon-only" :icon="openOutline" />
              </ion-button>
            </ion-item>
            <ion-card-content>
              <ion-button data-testid="reprint-label-btn" fill="outline" color="primary" @click="printShippingLabel">
                <ion-icon :icon="printOutline" slot="start" size="small" />
                {{ translate("Re-print shipping label") }}
              </ion-button>
              <ion-button data-testid="void-label-btn" fill="outline" color="warning" @click="voidShippingLabelAlert">
                {{ translate("Void shipping label") }}
              </ion-button>
            </ion-card-content>
          </ion-card>

          <template v-else>
            <template v-if="selectedSegment === 'generate'">
              <div v-if="isLoadingRates" class="empty-state">
                <ion-spinner name="crescent" />
                <ion-label>{{ translate("Loading...") }}</ion-label>
              </div>

              <ion-list v-else-if="shippingRates.length">
                <ion-item v-for="(shippingRate, index) in shippingRates" :key="index">
                  <ion-avatar slot="start">
                    <Image :src="getCarrierLogo(shippingRate.actualCarrier || shippingRate.carrierPartyId)" />
                  </ion-avatar>
                  <ion-label>
                    {{ commonUtil.formatCurrency(shippingRate.shippingEstimateAmount, shipmentDetails.currencyUom) }}
                    <p>{{ generateRateName(shippingRate.actualCarrier || shippingRate.carrierPartyId, shippingRate.carrierService || shippingRate.shipmentMethodTypeId) }}</p>
                    <p v-if="shippingRate?.serviceDays">{{ "Service Days:" }} {{ shippingRate.serviceDays }}</p>
                  </ion-label>
                  <ion-button data-testid="purchase-label-btn" slot="end" color="primary" fill="outline" :disabled="!!selectedCarrierService" @click="updateCarrierAndShippingMethod(shippingRate)">
                    <ion-spinner v-if="selectedCarrierService ===  ((shippingRate.actualCarrier || shippingRate.carrierPartyId)+'_'+(shippingRate.carrierService || shippingRate.shipmentMethodTypeId))" slot="start" name="crescent" />
                    {{ translate("Generate label") }}
                  </ion-button>
                </ion-item>
              </ion-list>

              <div v-else class="empty-state">
                <ion-label>{{ translate("No shipping rates found") }}</ion-label>
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
                <ion-button data-testid="tracking-test-link" slot="end" color="primary" fill="clear" :disabled="!trackingCode.trim() || !getCarrierTrackingUrl()" @click="redirectToTrackingUrl()">
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
          <ion-button data-testid="ship-later-btn-ship-transfer-order-page" :disabled="shipmentDetails?.carrierServiceStatusId === 'SHRSCS_ACCEPTED' || isProcessingShipment || !!selectedCarrierService" fill="outline" color="primary" @click="shipLater()">{{ translate("Ship later") }}</ion-button>
          <ion-button data-testid="ship-order-btn" :disabled="isProcessingShipment || !!selectedCarrierService" fill="solid" color="primary" @click="shipOrder">
            <ion-spinner v-if="isProcessingShipment" slot="start" name="crescent" />
            {{ translate("Ship order") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { IonAvatar, IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonListHeader, IonNote, IonPage, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSpinner, IonThumbnail, IonTitle, IonToolbar, alertController, onIonViewWillEnter } from "@ionic/vue";
import { openOutline, pricetagOutline, printOutline, storefrontOutline } from "ionicons/icons";
import { DxpShopifyImg, getProductIdentificationValue, useProductIdentificationStore, translate } from "@hotwax/dxp-components";
import { TransferOrderService } from "@/services/TransferOrderService";
import { OrderService } from "@/services/OrderService";
import { CarrierService } from "@/services/CarrierService";
import { UtilService } from "@/services/UtilService";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { commonUtil } from "@/utils/commonUtil";
import { hasError } from "@hotwax/oms-api";
import Image from "@/components/Image.vue";
import logger from "@/logger";
import { useProductStore } from "@/store/product";
import { useUtilStore } from "@/store/util";
import { useCarrierStore } from "@/store/carrier";
import { useTransferOrderStore } from "@/store/transferorder";

const route = useRoute();
const router = useRouter();
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);

const getProduct = (productId: string) => useProductStore().getProduct(productId);
const shipmentMethodsByCarrier = computed(() => useUtilStore().getShipmentMethodsByCarrier);
const getCarrierDesc = (carrierId: string) => useUtilStore().getCarrierDesc(carrierId);
const facilityCarriers = computed(() => useCarrierStore().getFacilityCarriers);

const shipmentItems = computed(() => {
  if (!shipmentDetails.value?.packages) return [];
  return shipmentDetails.value.packages.flatMap((pkg: any) => pkg.items || []);
});

const selectedSegment = ref("generate");
const selectedCarrier = ref("");
const shipmentMethods = ref([]) as any;
const selectedShippingMethod = ref("");
const trackingCode = ref("");
const shipmentDetails = ref({}) as any;
const shippingRates = ref([]) as any;
const isOrderShipped = ref(false);
const isLoadingRates = ref(true);
const facilities = ref([]) as any;
const carrierShipmentMethods = ref<Record<string, any>>({}) as any;
const isProcessingShipment = ref(false);
const selectedCarrierService = ref("");
const carrierLogos = ref<Record<string, string>>({});

onIonViewWillEnter(async () => {
  facilities.value = await UtilService.fetchProductStoreFacilities();
  await Promise.allSettled([
    fetchShipmentOrderDetail(route?.params?.shipmentId as any),
    useUtilStore().fetchStoreCarrierAndMethods(),
    useUtilStore().fetchCarriersDetail(),
    useCarrierStore().fetchFacilityCarriers()
  ]);
  await fetchShippingRates();
  const carrierByFacility = new Set(facilityCarriers.value.map((item: any) => item.partyId));
  carrierShipmentMethods.value = Object.fromEntries(Object.entries(shipmentMethodsByCarrier.value).filter(([key]) => carrierByFacility.has(key)));
  selectedCarrier.value = shipmentDetails.value?.carrierPartyId || "";
  if (shipmentDetails.value?.carrierPartyId) updateShipmentMethodsForCarrier(shipmentDetails.value.carrierPartyId, shipmentDetails.value.shipmentMethodTypeId);
});

onBeforeRouteLeave(async () => {
  if (isOrderShipped.value) return true;
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
              const resp = await TransferOrderService.cancelTransferOrderShipment(shipmentDetails.value.shipmentId);
              if (!hasError(resp)) {
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
              const resp = await TransferOrderService.cancelTransferOrderShipment(shipmentDetails.value.shipmentId);
              if (!hasError(resp)) {
                canLeave = true;
                await useTransferOrderStore().clearCurrentTransferOrder();
                alertController.dismiss();
              } else {
                throw resp.data;
              }
            } catch (err) {
              commonUtil.showToast(translate("Failed to cancel transfer order shipment"));
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

async function fetchShipmentOrderDetail(shipmentId: string) {
  try {
    const resp = await TransferOrderService.fetchTransferShipmentDetails({ shipmentId: shipmentId });
    if (!hasError(resp)) {
      shipmentDetails.value = resp.data.shipments[0];
      await fetchCarrierLogos([shipmentDetails.value.actualCarrierCode, shipmentDetails.value.routeSegCarrierPartyId]);
      trackingCode.value = shipmentDetails.value.trackingIdNumber || "";
      const items = shipmentDetails.value?.packages?.flatMap((pkg: any) => pkg.items || []) || [];
      const productIds = [...new Set(items.map((item: any) => item.productId))];
      if (productIds.length) {
        await useProductStore().fetchProducts({ productIds });
      }
    } else {
      throw resp.data;
    }
  } catch (err) {
    commonUtil.showToast(translate("Failed to update shipment status"));
    console.error(err);
  }
}

function getCarrierLogo(partyId: string) {
  const carrier = facilityCarriers.value.find((carrier: any) => carrier.partyId === partyId);
  return carrier?.logoUrl || carrierLogos.value[partyId?.toUpperCase()] || "";
}

function getFacilityName(facilityId: string) {
  const facility = facilities.value.find((facility: any) => facility.facilityId === facilityId);
  return facility ? facility.facilityName || facility.facilityId : facilityId;
}

function getCarrierTrackingUrl() {
  return facilityCarriers.value.find((carrier: any) => carrier.partyId === selectedCarrier.value)?.trackingUrl;
}

function generateTrackingUrl() {
  if (getCarrierTrackingUrl()) {
    return translate("Tracking URL:", { trackingUrl: getCarrierTrackingUrl()?.replace("${trackingNumber}", trackingCode.value) });
  }
  return translate("A tracking URL is not configured for", { carrierName: getCarrierDesc(selectedCarrier.value) });
}

function redirectToTrackingUrl() {
  window.open(getCarrierTrackingUrl().replace("${trackingNumber}", trackingCode.value), "_blank");
}

async function fetchCarrierLogos(carriers: string[] = []) {
  const carrierIds = Array.from(new Set(carriers
    .filter((carrierId): carrierId is string => Boolean(carrierId))
    .map((carrierId: string) => carrierId.toUpperCase())));

  const carrierIdsToFetch = carrierIds.filter((carrierId: string) => !carrierLogos.value[carrierId]);
  if (!carrierIdsToFetch.length) return;

  try {
    const resp = await CarrierService.fetchCarrierTrackingUrls({
      systemResourceId: carrierIdsToFetch,
      systemResourceId_op: "in",
      systemPropertyId: "%logo.url%",
      systemPropertyId_op: "like",
      fieldsToSelect: ["systemResourceId", "systemPropertyValue"]
    });

    if (!hasError(resp)) {
      const logoMap = { ...carrierLogos.value };
      resp.data.map((doc: any) => {
        logoMap[doc.systemResourceId.toUpperCase()] = doc.systemPropertyValue;
      });
      carrierLogos.value = logoMap;
    } else {
      throw resp.data;
    }
  } catch (error) {
    logger.error("Failed to fetch carrier logos", error);
  }
}

async function fetchShippingRates() {
  try {
    const resp = await CarrierService.fetchShippingRates({ shipmentId: shipmentDetails.value.shipmentId });
    if (!hasError(resp)) {
      shippingRates.value = resp.data?.shippingRates || [];
      const carriers = shippingRates.value.map((rate: any) => rate.actualCarrier || rate.actualCarrierCode || rate.carrierPartyId);
      if (shipmentDetails.value?.actualCarrierCode) carriers.push(shipmentDetails.value.actualCarrierCode);
      await fetchCarrierLogos(carriers);
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to fetch shipment details.", err);
    shippingRates.value = [];
  }
  isLoadingRates.value = false;
}

function generateRateName(carrierPartyId: string, shipmentMethodTypeId: string) {
  const carrierDesc = getCarrierDesc(carrierPartyId) || carrierPartyId;
  const methodDesc = shipmentMethodsByCarrier.value[carrierPartyId]?.find((method: any) => method.shipmentMethodTypeId === shipmentMethodTypeId)?.description || shipmentMethodTypeId;
  return `${carrierDesc} - ${methodDesc}`;
}

async function generateShippingLabel() {
  const shipment = shipmentDetails.value;

  try {
    await OrderService.retryShippingLabel(shipment.shipmentId);
    await fetchShipmentOrderDetail(shipment.shipmentId);
    await printShippingLabel();
  } catch (error) {
    logger.error("Failed to generate shipping label", error);
    commonUtil.showToast(translate("Failed to generate shipping label"));
  }
}

async function printShippingLabel() {
  const shipment = shipmentDetails.value;
  try {
    if (shipment.carrierServiceStatusId === "SHRSCS_ACCEPTED") {
      const shippingLabelPdfUrls: string[] = Array.from(
        new Set(
          (shipment.packages ?? [])
            .filter((shipmentPackage: any) => shipmentPackage.labelImageUrl)
            .map((shipmentPackage: any) => shipmentPackage.labelImageUrl)
        )
      );
      await OrderService.printShippingLabel([shipment.shipmentId], shippingLabelPdfUrls, shipment.packages);
    }
  } catch (err) {
    commonUtil.showToast(translate("Failed to print shipping label"));
    console.error(err);
  }
}

async function voidShippingLabel() {
  try {
    const routeSegmentId = shipmentDetails.value?.shipmentRouteSegmentId;
    if (!routeSegmentId) return;

    await OrderService.voidShipmentLabel({
      shipmentId: shipmentDetails.value.shipmentId,
      shipmentRouteSegmentId: routeSegmentId
    });

    commonUtil.showToast(translate("Shipping label voided successfully"));
    await fetchShipmentOrderDetail(shipmentDetails.value.shipmentId);
  } catch (err) {
    logger.error("Failed to void shipping label", err);
    commonUtil.showToast(translate("Failed to void shipping label"));
  }
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
        handler: async () => {
          await voidShippingLabel();
          alertController.dismiss();
        }
      }
    ]
  });
  return alert.present();
}

async function updateCarrierAndShippingMethod(shippingRate: any) {
  let resp;
  selectedCarrierService.value = (shippingRate.actualCarrier || shippingRate.carrierPartyId) + "_" + (shippingRate.carrierService || shippingRate.shipmentMethodTypeId);
  try {
    const payload = {
      shipmentId: shipmentDetails.value.shipmentId,
      shipmentRouteSegmentId: shipmentDetails.value.shipmentRouteSegmentId,
      shipmentMethodTypeId: shippingRate.shipmentMethodTypeId || shippingRate.carrierServiceCode,
      carrierPartyId: shippingRate.carrierPartyId,
      actualCost: shippingRate.shippingEstimateAmount,
      carrierServiceStatusId: "SHRSCS_CONFIRMED"
    } as any;

    if (shippingRate.actualCarrierCode) {
      payload.actualCarrierCode = shippingRate.actualCarrierCode;
    }
    if (shippingRate.carrierService) {
      payload.carrierService = shippingRate.carrierService;
    }
    if (shippingRate.gatewayRateId) {
      payload.gatewayRateId = shippingRate.gatewayRateId;
    }

    resp = await OrderService.updateRouteShipmentCarrierAndMethod(payload);
    if (!hasError(resp)) {
      await generateShippingLabel();
    } else {
      throw resp.data;
    }
  } catch (error) {
    logger.error(error);
  } finally {
    selectedCarrierService.value = "";
  }
}

async function shipLater() {
  route?.params?.orderId ? router.replace({ path: `/transfer-order-details/${route?.params?.orderId}/open` }) : router.replace({ path: "/transfer-orders" });
}

async function shipOrder() {
  const shipment = shipmentDetails.value;
  if (!shipment) return;

  if (selectedSegment.value === "manual") {
    if (!selectedCarrier.value) {
      commonUtil.showToast(translate("Please select a carrier"));
      return;
    }
    if (!selectedShippingMethod.value) {
      commonUtil.showToast(translate("Please select a shipping method"));
      return;
    }
    if (!trackingCode.value) {
      commonUtil.showToast(translate("Please enter a tracking number"));
      return;
    }
  } else if (selectedSegment.value === "generate" && shipment?.carrierServiceStatusId !== "SHRSCS_ACCEPTED") {
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

    if (selectedSegment.value === "manual") {
      Object.assign(payload, {
        carrierPartyId: selectedCarrier.value,
        shipmentMethodTypeId: selectedShippingMethod.value,
        trackingIdNumber: trackingCode.value
      });
    }
    isOrderShipped.value = true;
    await TransferOrderService.shipTransferOrderShipment(payload);
    commonUtil.showToast(translate("Shipment shipped successfully."));
    isProcessingShipment.value = false;
    route?.params?.orderId ? router.replace({ path: `/transfer-order-details/${route?.params?.orderId}/open` }) : router.replace({ path: "/transfer-orders" });
  } catch (err) {
    isProcessingShipment.value = false;
    isOrderShipped.value = false;
    logger.error("Failed to ship the shipment.", err);
    commonUtil.showToast(translate("Something went wrong, could not ship the shipment"));
  }
}
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
</style>
