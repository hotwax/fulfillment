<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button data-testid="ship-transfer-orders-back-btn" slot="start" defaultHref="" @click="shipLater" />
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
              {{ shipmentDetails.originFacilityId }}
              <!-- this field is not coming in the api resposne -->
              <!-- <p>50 miles</p> -->
            </ion-label>
          </ion-item>
          <ion-list>
            <ion-list-header>{{ translate("Items") }}</ion-list-header>
            <ion-item v-for="item in shipmentItems" :key="item.shipmentItemSeqId">
              <ion-thumbnail>
                <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl"/>
              </ion-thumbnail>
              <ion-label>
                {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) }}
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
          <ion-segment v-model="selectedSegment">
            <ion-segment-button value="purchase">{{ translate("Purchase shipping label") }}</ion-segment-button>
            <ion-segment-button value="manual">{{ translate("Manual tracking") }}</ion-segment-button>
          </ion-segment>
          <!-- purchase shipping segment -->
          <ion-list v-if="selectedSegment === 'purchase'">
            <!-- we will remove this check after making the purchase shipping label functional -->
            <ion-item :disabled="selectedSegment === 'purchase'">
              <ion-avatar slot="start">
                <img src="" alt="carrier-logo" />
              </ion-avatar>
              <ion-label>
                Rate name
                <p>estimated delivery date</p>
              </ion-label>
              <ion-button data-testid="purchase-label-<id>" slot="end" color="primary" fill="outline" @click="generateShippingLabel">{{ translate("Purchase label") }}</ion-button>
            </ion-item>
          </ion-list>

          <!-- manual tracking segment -->
          <ion-list v-if="selectedSegment === 'manual'">
            <ion-item>
              <ion-select data-testid="select-carrier-dropdown" :value="selectedCarrier" :label="translate('Carrier')" interface="popover" :placeholder="translate('Select')" @ionChange="selectedCarrier = $event.detail.value; updateShipmentMethodsForCarrier(selectedCarrier)">
                <ion-select-option data-testid="select-carrier-dropdown-option" v-for="(carrierPartyId, index) in Object.keys(shipmentMethodsByCarrier)" :key="index" :value="carrierPartyId">{{ getCarrierDesc(carrierPartyId) ? getCarrierDesc(carrierPartyId) : carrierPartyId }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-select data-testid="select-method-dropdown" :disabled="!selectedCarrier" :value="selectedMethod" :label="translate('Method')" interface="popover" :placeholder="translate('Select')" @ionChange="selectedMethod = $event.detail.value">
                <ion-select-option data-testid="select-method-dropdown-option" v-for="(method, index) in shipmentMethods" :key="index" :value="method.shipmentMethodTypeId">{{ method.description ? method.description : method.shipmentMethodTypeId }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="full">
              <ion-input data-testid="tracking-code-input" :label="translate('Tracking code')" :placeholder="translate('Enter code')" :value="trackingCode" @ionInput="trackingCode = $event.target.value"/>
            </ion-item>
            <!-- no related data available for this field in the api response -->
            <!-- <ion-item lines="none">
              Tracking URL: fedex.com/tracking/12344
              <ion-button data-testid="tracking-test-link" slot="end" color="primary" fill="clear">
                Test
                <ion-icon :icon="openOutline" slot="end"/>
              </ion-button>
            </ion-item> -->
          </ion-list>

          <!-- card after purchase shipping label generated -->
          <!-- <ion-card>
            <ion-item lines="full">
              <ion-avatar slot="start">
                <img src="" alt="carrier-logo" />
              </ion-avatar>
              <ion-label>
                Rate name
                <p>estimated delivery date</p>
              </ion-label>
              <ion-note slot="end" class="ion-margin">tracking code</ion-note>
              <ion-icon data-testid="tracking-code-link" slot="end" :icon="openOutline"/>
            </ion-item>
            <ion-card-content>
              <ion-button data-testid="reprint-label-btn"> fill="outline" color="primary">
                <ion-icon :icon="printOutline" slot="start"  size="small"/>
                Re-print shipping label
              </ion-button>
              <ion-button data-testid="void-label-btn"> fill="outline" color="warning">Void shipping label</ion-button>
            </ion-card-content>
          </ion-card> -->
        </div>
      </main>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <!-- need to add check here that after we print shiping label we need to disable this button. -->
          <ion-button fill="outline" color="primary" @click="shipLater">{{ translate("Ship later") }}</ion-button>
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
import { useRoute } from 'vue-router';
import { showToast } from '@/utils';
import { hasError } from '@hotwax/oms-api';
import { useRouter } from 'vue-router'
import logger from '@/logger';

const store = useStore()
const route = useRoute();
const router = useRouter()

const productIdentificationStore = useProductIdentificationStore();
let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

const getProduct = computed(() => store.getters['product/getProduct'])
const shipmentMethodsByCarrier = computed(() => store.getters["util/getShipmentMethodsByCarrier"])
const getCarrierDesc = computed(() => store.getters["util/getCarrierDesc"])

const shipmentItems = computed(() => {
  if(!shipmentDetails.value?.packages) return []
  return shipmentDetails.value.packages.flatMap((pkg: any) => pkg.items || [])
})

const selectedSegment = ref('manual')
const selectedCarrier = ref('')
const shipmentMethods = ref([]) as any;
const selectedMethod = ref('')
const trackingCode = ref('')
const shipmentDetails = ref({}) as any
const shippingRates = ref({}) as any

onIonViewWillEnter(async() => {
  await Promise.allSettled([fetchShipmentOrderDetail(route.params.shipmentId as any), store.dispatch('util/fetchStoreCarrierAndMethods'), store.dispatch("util/fetchCarriersDetail")])
  await fetchShippingRates();
});

function updateShipmentMethodsForCarrier(carrierPartyId: string) {
  shipmentMethods.value = shipmentMethodsByCarrier.value[carrierPartyId] || [];
  selectedMethod.value = shipmentMethods.value[0].shipmentMethodTypeId;
}

async function fetchShipmentOrderDetail(shipmentId: string) {
  try {
    const resp = await TransferOrderService.fetchTransferShipmentDetails({ shipmentId: shipmentId });
    if(!hasError(resp)) {
      shipmentDetails.value = resp.data.shipments[0]
      const items = shipmentDetails.value?.packages?.flatMap(pkg => pkg.items || []) || []
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

async function fetchShippingRates() {
  try {
    const resp = await CarrierService.fetchShippingRates(shipmentDetails.value.shipmentId)
    if(!hasError(resp)) {
      shippingRates.value = resp.data
    } else { 
      throw resp.data
    }
  } catch (err) {
    logger.error('Failed to fetch shipment details.', err);
  }
}

async function generateShippingLabel() {
  await updateCarrierAndShippingMethod();
  const shipmentIds = [shipmentDetails.value.shipmentId]
  const shippingLabelPdfUrls: string[] = Array.from(
    new Set(
      (shipmentDetails.value.shipmentPackages ?? [])
        .filter((shipmentPackage: any) => shipmentPackage.labelImageUrl)
        .map((shipmentPackage: any) => shipmentPackage.labelImageUrl)
    )
  );
  await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls, shipmentDetails.value.shipmentPackages);
}

async function updateCarrierAndShippingMethod() {
  let resp;
  try {
    const payload = {
      shipmentId: shipmentDetails.value.shipmentId,
      shipmentRouteSegmentId: shipmentDetails.value.shipmentRouteSegmentId,
      shipmentMethodTypeId: 'method',
      carrierPartyId: 'carrier'
    }
    resp = await OrderService.updateShipmentCarrierAndMethod(payload);
    if(!hasError(resp)) {
      return true;
    } else {
      throw resp.data
    }
  } catch (error) {
     logger.error(error)
  }
}



async function shipLater() {
  const message = translate("Save this order without tracking details to ship later.");
  const alert = await alertController.create({
    header: translate("Ship later"),
    message,
    buttons: [
      {
        text: translate("Go back"),
      },
      {
        text: translate("Continue"),
        handler: async () => {
          const resp = await TransferOrderService.cancelTransferOrderShipment(shipmentDetails.value.shipmentId)
          if(!hasError(resp)) {
            alertController.dismiss()
            router.push({ path: '/transfer-orders' })
          }
        }
      }
    ],
  });
  return alert.present();
}

async function shipOrder() {
  if(!selectedCarrier.value) {
    showToast(translate('Please select a carrier'))
    return
  }
  if(!selectedMethod.value) {
    showToast(translate('Please select a shipping method'))
    return
  }
  if(!trackingCode.value) {
    showToast(translate('Please enter a tracking number'));
    return;
  }

  try {
    await TransferOrderService.shipTransferOrderShipment({
      shipmentId: shipmentDetails.value.shipmentId,
      trackingIdNumber: trackingCode.value,
      shipmentRouteSegmentId: shipmentDetails.value.shipmentRouteSegmentId,
      carrierPartyId: selectedCarrier.value,
      shipmentMethodTypeId: selectedMethod.value
    });
    
    showToast(translate('Shipment shipped successfully.'));
    router.replace({ path: '/transfer-orders' })
  } catch (err) {
    logger.error('Failed to ship the shipment.', err);
    showToast(translate('Something went wrong, could not ship the shipment'))
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