<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button data-testid="ship-transfer-orders-back-btn" slot="start" defaultHref="/transfer-orders" />
        <ion-title>{{ translate("Ship transfer order") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <!--Transfer order cards -->
      <main>
        <!-- order details -->
        <ion-card class="desktop only order-info">
          <ion-card-header>
            <ion-card-subtitle>{{ shipmentDetails.orderId }}</ion-card-subtitle>
            <ion-card-title>{{ shipmentDetails.orderName }}</ion-card-title>
          </ion-card-header>
          <ion-item lines="full">
            <ion-icon :icon="storefrontOutline" slot="start"/>
            <ion-label>
              <p class="overline">{{ translate("Sending to") }}</p>
              {{ getFacilityName(shipmentDetails.orderFacilityId) }}
              <!-- TODO: shipping distance field is not coming in the api resposne -->
            </ion-label>
          </ion-item>
          <ion-list>
            <ion-list-header>{{ translate("Items") }}</ion-list-header>
            <ion-item v-for="item in shipmentItems" :key="item.shipmentItemSeqId">
              <ion-thumbnail slot="start">
                <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" :key="getProduct(item.productId).mainImageUrl"/>
              </ion-thumbnail>
              <ion-label>
                {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId)?.internalName }}
                <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
              </ion-label>
              <ion-label slot="end">{{ item.quantity }}</ion-label>
            </ion-item>
            <!-- need to discuss about this buttons functionality -->
            <!-- <div actions>
              <ion-button fill="clear" @click="router.push(`/create-transfer-order/${shipmentDetails.orderId}`)">{{ translate("Edit") }}</ion-button>
            </div> -->
          </ion-list>
        </ion-card>

        <!-- Shipping label  -->
        <div class="shipping">
          <ion-segment :disabled="shipmentDetails?.trackingIdNumber" v-model="selectedSegment">
            <ion-segment-button value="purchase">{{ translate("Purchase shipping label") }}</ion-segment-button>
            <ion-segment-button value="manual">{{ translate("Manual tracking") }}</ion-segment-button>
          </ion-segment>

          <!-- card after purchase shipping label generated -->
          <ion-card v-if="shipmentDetails?.trackingIdNumber">
            <ion-item lines="full">
              <ion-avatar slot="start">
                <Image :src="getCarrierLogo(shipmentDetails.carrierPartyId)" />
              </ion-avatar>
              <ion-label>
                {{ formatCurrency(shipmentDetails.shippingEstimateAmount, shipmentDetails.currencyUomId) }}
                <p>{{ generateRateName(shipmentDetails.carrierPartyId, shipmentDetails.shipmentMethodTypeId) }}</p>
                <!-- this field is not coming it the shipping rates api -->
                <!-- <p>estimated delivery date</p> -->
              </ion-label>
              <ion-note slot="end" class="ion-margin">{{ shipmentDetails.trackingIdNumber }}</ion-note>
              <ion-button data-testid="tracking-code-link" fill="clear" size="default" color="medium" @click="redirectToTrackingUrl()">
                <ion-icon slot="icon-only" :icon="openOutline" />
              </ion-button>
            </ion-item>
            <ion-card-content>
              <ion-button data-testid="reprint-label-btn" fill="outline" color="primary" @click="printShippingLabel">
                <ion-icon :icon="printOutline" slot="start"  size="small"/>
                {{ translate("Re-print shipping label") }}
              </ion-button>
              <ion-button data-testid="void-label-btn" fill="outline" color="warning" @click="voidShippingLabelAlert">
                {{ translate("Void shipping label") }}
              </ion-button>
            </ion-card-content>
          </ion-card>

          <template v-else>
            <!-- purchase shipping segment -->
            <template v-if="selectedSegment === 'purchase'">
              <!-- Loading state -->
              <div v-if="isLoadingRates" class="empty-state">
                <ion-spinner name="crescent" />
                <ion-label>{{ translate("Loading...") }}</ion-label>
              </div>

              <!-- Rates list -->
              <ion-list v-else-if="shippingRates.length">
                <ion-item v-for="(shippingRate, index) in shippingRates" :key="index">
                  <ion-avatar slot="start">
                    <Image :src="getCarrierLogo(shippingRate.carrierPartyId)" />
                  </ion-avatar>
                  <ion-label>
                    {{ formatCurrency(shippingRate.shippingEstimateAmount, shippingRate.currencyUomId) }}
                    <p>{{ generateRateName(shippingRate.carrierPartyId, shippingRate.shipmentMethodTypeId) }}</p>
                    <!-- this field is not coming it the shipping rates api -->
                    <!-- <p>estimated delivery date</p> -->
                  </ion-label>
                  <ion-button data-testid="purchase-label-btn" slot="end" color="primary" fill="outline" @click="updateCarrierAndShippingMethod(shippingRate.carrierPartyId, shippingRate.shipmentMethodTypeId, shippingRate.shippingEstimateAmount)">{{ translate("Purchase label") }}</ion-button>
                </ion-item>
              </ion-list>

              <!-- No shipping rates found state -->
              <div v-else class="empty-state">
                <ion-label>{{ translate("No shipping rates found") }}</ion-label>
              </div>
            </template>

            <!-- manual tracking segment -->
            <ion-list v-if="selectedSegment === 'manual'">
              <ion-item>
                <ion-select data-testid="select-carrier-dropdown" :value="selectedCarrier" :label="translate('Carrier')" interface="popover" :placeholder="translate('Select')" @ionChange="selectedCarrier = $event.detail.value; updateShipmentMethodsForCarrier(selectedCarrier)">
                  <ion-select-option data-testid="select-carrier-dropdown-option" v-for="(carrierPartyId, index) in Object.keys(shipmentMethodsByCarrier)" :key="index" :value="carrierPartyId">{{ getCarrierDesc(carrierPartyId) ? getCarrierDesc(carrierPartyId) : carrierPartyId }}</ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item>
                <ion-select data-testid="select-method-dropdown" :disabled="!shipmentMethods.length" :value="selectedShippingMethod" :label="translate('Method')" interface="popover" :placeholder="translate('Select')" @ionChange="selectedShippingMethod = $event.detail.value">
                  <ion-select-option data-testid="select-method-dropdown-option" v-for="(method, index) in shipmentMethods" :key="index" :value="method.shipmentMethodTypeId">{{ method.description ? method.description : method.shipmentMethodTypeId }}</ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item lines="full">
                <ion-input data-testid="tracking-code-input" :label="translate('Tracking code')" :placeholder="translate('Enter code')" :value="trackingCode" @ionInput="trackingCode = $event.target.value"/>
              </ion-item>
              <ion-item v-if="selectedCarrier || shipmentDetails.carrierPartyId" lines="none">
                {{ generateTrackingUrl() }}
                <ion-button data-testid="tracking-test-link" slot="end" color="primary" fill="clear" :disabled="!trackingCode.trim() || !getCarrierTrackingUrl()" @click="redirectToTrackingUrl()">
                  {{ translate("Test") }}
                  <ion-icon :icon="openOutline" slot="end"/>
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
          <!-- need to add check here that after we print shiping label we need to disable this button. -->
          <ion-button data-testid="ship-later-btn-ship-transfer-order-page" :disabled="shipmentDetails.trackingIdNumber" fill="outline" color="primary" @click="router.replace('/transfer-orders')">{{ translate("Ship later") }}</ion-button>
          <ion-button data-testid="ship-order-btn" fill="solid" color="primary" @click="shipOrder">{{ translate("Ship order") }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStore } from 'vuex';
import { IonAvatar, IonBackButton, IonButton, IonButtons, IonCard, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonPage, IonSegment, IonSegmentButton, IonTitle, IonToolbar, alertController, onIonViewWillEnter } from '@ionic/vue'
import { openOutline, printOutline, storefrontOutline } from 'ionicons/icons'
import { DxpShopifyImg, getProductIdentificationValue, useProductIdentificationStore, translate } from '@hotwax/dxp-components';
import { TransferOrderService } from '@/services/TransferOrderService';
import { OrderService } from '@/services/OrderService'
import { CarrierService } from '@/services/CarrierService';
import { UtilService } from '@/services/UtilService';
import { onBeforeRouteLeave, useRoute } from 'vue-router';
import { formatCurrency, showToast } from '@/utils';
import { hasError } from '@hotwax/oms-api';
import { useRouter } from 'vue-router'
import Image from '@/components/Image.vue';
import logger from '@/logger';

const store = useStore()
const route = useRoute();
const router = useRouter()

const productIdentificationStore = useProductIdentificationStore();
let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

const getProduct = computed(() => store.getters['product/getProduct'])
const shipmentMethodsByCarrier = computed(() => store.getters["util/getShipmentMethodsByCarrier"])
const getCarrierDesc = computed(() => store.getters["util/getCarrierDesc"])
const facilityCarriers = computed(() => store.getters["carrier/getFacilityCarriers"])

const shipmentItems = computed(() => {
  if(!shipmentDetails.value?.packages) return []
  return shipmentDetails.value.packages.flatMap((pkg: any) => pkg.items || [])
})

const selectedSegment = ref('purchase')
const selectedCarrier = ref('')
const shipmentMethods = ref([]) as any;
const selectedShippingMethod = ref('')
const trackingCode = ref('')
const shipmentDetails = ref({}) as any
const shippingRates = ref([]) as any
const isLoadingRates = ref(true)
let facilities = ref([]) as any;

onIonViewWillEnter(async() => {
  facilities.value = await UtilService.fetchProductStoreFacilities();
  // Fetch shipment and carrier-related data in parallel
  await Promise.allSettled([fetchShipmentOrderDetail(route?.params?.shipmentId as any), store.dispatch('util/fetchStoreCarrierAndMethods'), store.dispatch("util/fetchCarriersDetail"), store.dispatch('carrier/fetchFacilityCarriers'), fetchShippingRates()])
  // Update shipment methods if carrier exists
  selectedCarrier.value = shipmentDetails.value?.carrierPartyId || '';
  if(shipmentDetails.value?.carrierPartyId) updateShipmentMethodsForCarrier(shipmentDetails.value.carrierPartyId, shipmentDetails.value.shipmentMethodTypeId)
});

onBeforeRouteLeave(async () => {
  let canLeave = false;
  const message = translate("Save this order without tracking details to ship later.");
  const alert = await alertController.create({
    header: translate("Ship later"),
    message,
    buttons: [
      {
        text: translate("Go back"),
        role: 'cancel',
        handler: () => {
          canLeave = false;
        },
      },
      {
        text: translate("Continue"),
        handler: async () => {
          try {
            const resp = await TransferOrderService.cancelTransferOrderShipment(shipmentDetails.value.shipmentId);
            if (!hasError(resp)) {
              canLeave = true;
              alertController.dismiss();
            } else {
              throw resp.data;
            }
          } catch (err) {
            showToast(translate('Failed to cancel transfer order shipment'));
            logger.error('Failed to cancel transfer order shipment', err);
            canLeave = false;
          }
        },
      },
    ],
  });

  alert.present();
  await alert.onDidDismiss();
  return canLeave;
});

// Updates the available shipment methods based on the selected carrier.
function updateShipmentMethodsForCarrier(carrierPartyId: string, shippingMethodId = "") {
  shipmentMethods.value = shipmentMethodsByCarrier.value[carrierPartyId] || [];
  selectedShippingMethod.value = shippingMethodId || shipmentMethods.value[0]?.shipmentMethodTypeId || '';
}

async function fetchShipmentOrderDetail(shipmentId: string) {
  try {
    const resp = await TransferOrderService.fetchTransferShipmentDetails({ shipmentId: shipmentId });
    if(!hasError(resp)) {
      shipmentDetails.value = resp.data.shipments[0]
      trackingCode.value = shipmentDetails.value.trackingIdNumber || ''
      const items = shipmentDetails.value?.packages?.flatMap((pkg: any) => pkg.items || []) || []
      const productIds = [...new Set(items.map((item: any) => item.productId))]
      if(productIds.length) {
        await store.dispatch('product/fetchProducts', { productIds })
      }
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error('Failed to fetch shipment details.', err);
  }
}

// Retrieves the logo url for the selected or prefilled carrier
function getCarrierLogo(partyId: string) {
  const carrier = facilityCarriers.value.find((carrier: any) => carrier.partyId === partyId);
  return carrier?.logoUrl || '';
}

function getFacilityName(facilityId: string) {
  const facility = facilities.value.find((facility: any) => facility.facilityId === facilityId)
  return facility ? facility.facilityName || facility.facilityId : facilityId
}

// Retrieves the tracking URL template for the selected or prefilled carrier
function getCarrierTrackingUrl() {
  return facilityCarriers.value.find((carrier: any) => carrier.partyId === selectedCarrier.value || shipmentDetails.value.carrierPartyId)?.trackingUrl
}

// Builds a full tracking URL with the tracking number, or shows a fallback message if unavailable
function generateTrackingUrl() {
  if(getCarrierTrackingUrl()) {
    return translate("Tracking URL:", { trackingUrl: getCarrierTrackingUrl()?.replace("${trackingNumber}", trackingCode.value) })
  }
  return translate("A tracking URL is not configured for", { carrierName: getCarrierDesc.value(selectedCarrier.value || shipmentDetails.value.carrierPartyId) })
}

// Opens the tracking URL in a new browser tab using the carrier's template and tracking number
function redirectToTrackingUrl() {
  window.open(getCarrierTrackingUrl().replace("${trackingNumber}", trackingCode.value), "_blank");
}

async function fetchShippingRates() {
  try {
    const resp = await CarrierService.fetchShippingRates({ shipmentId: shipmentDetails.value.shipmentId })
    if(!hasError(resp)) {
      shippingRates.value = resp.data?.shippingRates || []
    } else { 
      throw resp.data
    }
  } catch (err) {
    logger.error('Failed to fetch shipment details.', err);
    shippingRates.value = []
  }
  isLoadingRates.value = false
}

// Generates a rate name by combining carrier description and shipment method description.
function generateRateName(carrierPartyId: string, shipmentMethodTypeId: string) {
  const carrierDesc = getCarrierDesc.value(carrierPartyId) || carrierPartyId;
  const methodDesc = shipmentMethodsByCarrier.value[carrierPartyId]?.find((method: any) => method.shipmentMethodTypeId === shipmentMethodTypeId)?.description || shipmentMethodTypeId;
  return `${carrierDesc} - ${methodDesc}`;
}

// Purchases a new shipping label by updating carrier/method, retrying label generation, refreshing shipment details, and printing the label.
async function purchaseShippingLabel() {
  const shipment = shipmentDetails.value;

  try {
    await OrderService.retryShippingLabel(shipment.shipmentId);
    await fetchShipmentOrderDetail(shipment.shipmentId)
    await printShippingLabel();
  } catch (error) {
    logger.error("Failed to purchase shipping label", error);
    showToast(translate("Failed to purchase shipping label"));
  }
}

// Prints the shipping label if available by collecting unique label URLs and calling the print service
async function printShippingLabel() {
  const shipment = shipmentDetails.value

  try {
    if(shipment.trackingIdNumber) {
      const shippingLabelPdfUrls: string[] = Array.from(
        new Set(
          (shipment.shipmentPackages ?? [])
            .filter((shipmentPackage: any) => shipmentPackage.labelImageUrl)
            .map((shipmentPackage: any) => shipmentPackage.labelImageUrl)
        )
      );
      showToast(translate("Shipping Label generated successfully"))
      await OrderService.printShippingLabel([shipment.shipmentId], shippingLabelPdfUrls, shipment.shipmentPackages);
    } else {
      showToast(translate("Failed to generate shipping label"))
    }
  } catch (error) {
    logger.error(error)
  }
}

// Voids an existing shipping label using the route segment ID and refreshes shipment details
async function voidShippingLabel() {
  try {
    const routeSegmentId = shipmentDetails.value?.shipmentPackageRouteSegDetails?.[0]?.shipmentRouteSegmentId;
    if(!routeSegmentId) return;

    await OrderService.voidShipmentLabel({
      shipmentId: shipmentDetails.value.shipmentId,
      shipmentRouteSegmentId: routeSegmentId
    });

    showToast(translate("Shipping label voided successfully"));
    await fetchShipmentOrderDetail(shipmentDetails.value.shipmentId)
  } catch (err) {
    logger.error("Failed to void shipping label", err);
    showToast(translate("Failed to void shipping label"));
  }
}

async function voidShippingLabelAlert() {
  const alert = await alertController.create({
    header: translate("Void shipping label"),
    buttons: [
      {
        text: translate("Cancel"),
        htmlAttributes: { 
          'data-testid': "voidlabel-cancel-btn"
        },
      },
      {
        text: translate("Confirm"),
        htmlAttributes: { 
          'data-testid': "voidlabel-confirm-btn"
        },
        handler: async () => {
          await voidShippingLabel()
          alertController.dismiss()
        }
      }
    ],
  });
  return alert.present();
}

async function updateCarrierAndShippingMethod(carrierPartyId: string, shipmentMethodTypeId: string, shippingEstimateAmount: number) {
  let resp;
  try {
    const payload = {
      shipmentId: shipmentDetails.value.shipmentId,
      shipmentRouteSegmentId: shipmentDetails.value.shipmentRouteSegmentId,
      shipmentMethodTypeId: shipmentMethodTypeId,
      carrierPartyId: carrierPartyId,
      shippingEstimateAmount: shippingEstimateAmount
    }
    resp = await OrderService.updateShipmentCarrierAndMethod(payload);
    if(!hasError(resp)) {
      await purchaseShippingLabel();
    } else {
      throw resp.data
    }
  } catch (error) {
    logger.error(error)
  }
}

async function shipOrder() {
  const shipment = shipmentDetails.value;
  if(!shipment) return;
 
  // Validate required fields based on selected shipping method
  if(selectedSegment.value === "manual") {
    if(!selectedCarrier.value) {
      showToast(translate('Please select a carrier'))
      return;
    }
    if(!selectedShippingMethod.value) {
      showToast(translate('Please select a shipping method'))
      return;
    }
    if(!trackingCode.value) {
      showToast(translate('Please enter a tracking number'));
      return;
    }
  } else if(selectedSegment.value === "purchase" && !shipment.trackingIdNumber) {
    showToast(translate('Please purchase a shipping label'))
    return;
  }

  try {
    const payload: any = { shipmentId: shipment.shipmentId }

    if(selectedSegment.value === "manual") {
      payload.trackingIdNumber = trackingCode.value
      payload.shipmentRouteSegmentId = shipment.shipmentRouteSegmentId
      payload.carrierPartyId = selectedCarrier.value
      payload.shipmentMethodTypeId = selectedShippingMethod.value
    }

    await TransferOrderService.shipTransferOrderShipment(payload)
    showToast(translate('Shipment shipped successfully.'));
    router.replace({ path: '/transfer-orders' });
  } catch (err) {
    logger.error('Failed to ship the shipment.', err);
    showToast(translate('Something went wrong, could not ship the shipment'));
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