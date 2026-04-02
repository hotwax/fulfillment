<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" :default-href="`/${category}`" />
        <ion-title>{{ translate("Order details") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="order && Object.keys(order).length">
        <div class="order-header">
          <div class="order-primary-info">
            <h3>{{ order.orderName }}</h3>
          </div>
          <div class="order-tags">
            <ion-chip outline @click="commonUtil.copyToClipboard(order.orderId, 'Copied to clipboard')">
              <ion-icon :icon="pricetagOutline" />
              <ion-label>{{ order.orderId }}</ion-label>
            </ion-chip>
            <ion-chip v-if="category !== 'open'" outline @click="printPicklist(order)">
              <ion-icon :icon="documentTextOutline" />
              <ion-label>{{ translate('Linked picklist') }}: {{ order.picklistId }}</ion-label>
            </ion-chip>
            <ion-chip outline v-if="order?.paymentPreferences?.length > 0" :color="statusColor[order?.paymentPreferences[0]?.statusId]">
              <ion-icon :icon="cashOutline" />
              <ion-label>{{ translate(getPaymentMethodDesc(order?.paymentPreferences[0]?.paymentMethodTypeId)) }} : {{ translate(getStatusDesc(order?.paymentPreferences[0]?.statusId)) }}</ion-label>
            </ion-chip>
          </div>
          <div class="order-metadata">
            <ion-badge>{{ category === 'open' ? translate('Open') : (category === 'in-progress' ? translate('In Progress') : translate('Completed')) }}</ion-badge>
          </div>
        </div>

        <ion-card class="order">
          <div class="order-header">
            <div class="order-primary-info">
              <ion-label>
                <strong>{{ order.customerName }}</strong>
                <p>{{ translate("Ordered") }} {{ category === 'open' ? commonUtil.formatUtcDate(order.orderDate, userStore.currentTimeZoneId, 'dd MMMM yyyy hh:mm a ZZZZ') : getTime(order.orderDate) }}</p>
              </ion-label>
            </div>
            <div class="order-tags">
              <ion-chip outline>
                <ion-icon :icon="ribbonOutline" />
                <ion-label>{{ order.primaryShipGroupSeqId ? order.primaryShipGroupSeqId : order.shipGroupSeqId }}</ion-label>
              </ion-chip>
            </div>

            <div class="order-metadata">
              <ion-label>
                {{ getShipmentMethodDesc(order.shipmentMethodTypeId) }}
                <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ commonUtil.formatUtcDate(order.reservedDatetime, userStore.currentTimeZoneId, 'dd MMMM yyyy hh:mm a ZZZZ') }}</p>
              </ion-label>
            </div>
          </div>

          <div v-if="category === 'in-progress'">
            <div class="box-type desktop-only" v-if="!order.shipmentPackages">
              <ion-skeleton-text animated />
              <ion-skeleton-text animated />
            </div>
            <div class="box-type desktop-only" v-else-if="order.shipmentPackages">
              <ion-button :disabled="order.items.length <= order.shipmentPackages.length || addingBoxForShipmentIds.includes(order.orderId)" @click.stop="addShipmentBox(order)" fill="outline" shape="round" size="small"><ion-icon :icon="addOutline" />
                {{ translate("Add Box") }}
              </ion-button>
              <ion-row>
                <ion-chip v-for="shipmentPackage in order.shipmentPackages" :key="shipmentPackage.shipmentId" @click.stop="updateShipmentBoxType(shipmentPackage, order, $event)">
                  {{ `Box ${shipmentPackage?.packageName}` }} {{ `| ${boxTypeDesc(getShipmentPackageType(order, shipmentPackage))}` }}
                  <ion-icon :icon="caretDownOutline" />
                </ion-chip>
              </ion-row>
            </div>
          </div>

          <div v-for="item in order.items" :key="item" class="order-line-item">
            <div class="order-item">
              <div class="product-info">
                <ion-item lines="none">
                  <ion-thumbnail slot="start" v-image-preview="getProduct(item.productId)" :key="getProduct(item.productId)?.mainImageUrl">
                    <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
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

              <div v-if="category === 'in-progress'" class="desktop-only ion-text-center">
                <template v-if="item.rejectReason">
                  <ion-chip outline color="danger">
                    <ion-label> {{ getRejectionReasonDescription(item.rejectReason) }}</ion-label>
                    <ion-icon :icon="closeCircleOutline" @click.stop="removeRejectionReason($event, item, order)" />
                  </ion-chip>
                </template>
                <template v-else-if="isEntierOrderRejectionEnabled(order)">
                  <ion-chip outline color="danger">
                    <ion-label> {{ getRejectionReasonDescription(rejectEntireOrderReasonId) ? getRejectionReasonDescription(rejectEntireOrderReasonId) : translate('Reject to avoid order split (no variance)') }}</ion-label>
                  </ion-chip>
                </template>
                <template v-else>
                  <ion-chip outline @click="openShipmentBoxPopover($event, item, order)">
                    <ion-icon :icon="fileTrayOutline" />
                    {{ `Box ${item.selectedBox || ''}` }}
                    <ion-icon :icon="caretDownOutline" />
                  </ion-chip>
                </template>
              </div>

              <div v-else></div>

              <div class="product-metadata">
                <ion-note v-if="getProductStock(item.productId).qoh" class="ion-padding-end">{{ getProductStock(item.productId).qoh }} {{ translate('pieces in stock') }}</ion-note>
                <ion-button color="medium" fill="clear" v-else size="small" @click="fetchProductStock(item.productId)">
                  {{ translate('Check stock') }}
                  <ion-icon slot="end" :icon="cubeOutline" />
                </ion-button>
                <ion-button v-if="category === 'in-progress'" @click="openRejectReasonPopover($event, item, order)" class="desktop-only" color="danger" fill="clear" size="small">
                  {{ translate('Report an issue') }}
                  <ion-icon slot="end" :icon="trashBinOutline" />
                </ion-button>
                <ion-button v-if="orderUtil.isKit(item)" fill="clear" color="medium" size="small" @click.stop="fetchKitComponent(item)">
                  {{ translate('Components') }}
                  <ion-icon v-if="item.showKitComponents" color="medium" slot="end" :icon="chevronUpOutline" />
                  <ion-icon v-else color="medium" slot="end" :icon="listOutline" />
                </ion-button>
                <ion-button v-if="item.productTypeId === 'GIFT_CARD'" fill="clear" color="medium" size="small" @click="openGiftCardActivationModal(item)">
                  {{ translate('Gift card') }}
                  <ion-icon color="medium" slot="end" :icon="item.isGCActivated ? gift : giftOutline" />
                </ion-button>
              </div>
            </div>
            <div v-if="item.showKitComponents && getProduct(item.productId)?.productComponents" class="kit-components">
              <ion-card v-for="(productComponent, index) in getProduct(item.productId).productComponents" :key="index">
                <ion-item lines="none">
                  <ion-thumbnail slot="start" v-image-preview="getProduct(productComponent.productIdTo)" :key="getProduct(productComponent.productIdTo)?.mainImageUrl">
                    <DxpShopifyImg :src="getProduct(productComponent.productIdTo).mainImageUrl" size="small" />
                  </ion-thumbnail>
                  <ion-label>
                    <p class="overline">{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(productComponent.productIdTo)) }}</p>
                    <div>
                      {{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) : productComponent.productIdTo }}
                    </div>
                    <p>{{ commonUtil.getFeatures(getProduct(productComponent.productIdTo).productFeatures) }}</p>
                  </ion-label>
                  <ion-checkbox v-if="item.rejectReason || isEntierOrderRejectionEnabled(order)" :checked="item.kitComponents?.includes(productComponent.productIdTo)" @ionChange="rejectKitComponent(order, item, productComponent.productIdTo)" />
                </ion-item>
              </ion-card>
            </div>
          </div>

          <div v-if="category === 'in-progress'" class="mobile-only">
            <ion-item>
              <ion-button fill="clear" @click="packOrder(order)">{{ translate("Pack using default packaging") }}</ion-button>
              <ion-button slot="end" fill="clear" color="medium" @click="packagingPopover">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </ion-item>
          </div>

          <div v-else-if="category === 'completed'" class="mobile-only">
            <ion-item>
              <ion-button :disabled="isProductStoreSettingEnabled('DISABLE_SHIPNOW') || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || ((isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode) && !userStore.hasPermission('COMMON_ADMIN OR STOREFULFILLMENT_ADMIN'))" fill="clear">{{ translate("Ship Now") }}</ion-button>
              <ion-button slot="end" fill="clear" color="medium" @click.stop="shippingPopover">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </ion-item>
          </div>

          <div class="actions">
            <div>
              <template v-if="category === 'in-progress'">
                <ion-button :color="order.hasAllRejectedItem ? 'danger' : ''" @click="packOrder(order)">
                  <ion-icon slot="start" :icon="archiveOutline" />
                  {{ translate(order.hasAllRejectedItem ? "Reject order" : order.hasRejectedItem ? "Save and Pack Order" : "Pack order") }}
                </ion-button>
                <Component :is="printDocumentsExt" :category="category" :order="order" :currentFacility="currentFacility" :hasMissingInfo="order.missingLabelImage" />
              </template>
              <ion-button v-else-if="category === 'open'" @click="assignPickers">
                <ion-icon slot="start" :icon="personAddOutline" />
                {{ translate("Pick order") }}
              </ion-button>
              <div v-else-if="category === 'completed'" class="desktop-only">
                <ion-button v-if="!hasPackedShipments(order)" :disabled="true">
                  <ion-icon slot="start" :icon="bagCheckOutline" />
                  {{ translate("Shipped") }}
                </ion-button>
                <ion-button v-else :disabled="isProductStoreSettingEnabled('DISABLE_SHIPNOW') || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || ((isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode) && !userStore.hasPermission('COMMON_ADMIN OR STOREFULFILLMENT_ADMIN'))" @click.stop="shipOrder(order)">
                  <ion-icon slot="start" :icon="bagCheckOutline" />
                  {{ translate("Ship order") }}
                </ion-button>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" fill="outline" @click.stop="printPackingSlip(order)">
                  {{ translate("Print Customer Letter") }}
                  <ion-spinner data-spinner-size="medium" color="primary" slot="end" v-if="order.isGeneratingPackingSlip" name="crescent" />
                </ion-button>
              </div>
            </div>
            <div class="desktop-only" v-if="category === 'completed'">
              <ion-button :disabled="isProductStoreSettingEnabled('DISABLE_UNPACK') || !useUserStore().hasPermission('COMMON_ADMIN OR SF_UNLOCK_ORDER') || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || !hasPackedShipments(order)" fill="outline" color="danger" @click.stop="unpackOrder(order)">{{ translate("Unpack") }}</ion-button>
            </div>
          </div>
        </ion-card>
      <div class="shipgroup-details">
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                {{ translate('Destination') }}
              </ion-card-title>
            </ion-card-header>
            <ion-item lines="none">
              <ion-label>
                <h3>{{ order?.shippingAddress?.toName }}</h3>
                <p class="ion-text-wrap">{{ order?.shippingAddress?.address1 }}</p>
                <p class="ion-text-wrap" v-if="order?.shippingAddress?.address2">{{ order.shippingAddress.address2 }}</p>
                <p class="ion-text-wrap">{{ order?.shippingAddress?.city ? order.shippingAddress.city + "," : "" }} {{ order.shippingAddress?.postalCode }}</p>
                <p class="ion-text-wrap">{{ order?.shippingAddress?.stateName ? order.shippingAddress.stateName + "," : "" }} {{ order.shippingAddress?.countryName }}</p>
                <p class="ion-text-wrap" v-if="order?.telecomNumber?.contactNumber">{{ order?.telecomNumber?.contactNumber }}</p>
              </ion-label>
            </ion-item>
            <ion-item color="light" lines="none" v-if="order?.shippingInstructions">
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ translate("Handling Instructions") }}</p>
                <p>{{ order?.shippingInstructions ? order.shippingInstructions : 'Sample Handling instructions' }}</p>
              </ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Payment") }}</ion-card-title>
            </ion-card-header>
            <div v-if="order.paymentPreferences?.length">
              <ion-list v-for="(orderPayment, index) in order.paymentPreferences" :key="`${order.orderId}-${orderPayment.orderPaymentPreferenceId}`">
                <ion-item lines="none">
                  <ion-label class="ion-text-wrap">
                    <p class="overline">{{ orderPayment.paymentMethodTypeId }}</p>
                    <ion-label>{{ translate(getPaymentMethodDesc(orderPayment.paymentMethodTypeId)) || orderPayment.paymentMethodTypeId }}</ion-label>
                    <ion-note :color="commonUtil.getColorByDesc(getStatusDesc(orderPayment.statusId))">{{ translate(getStatusDesc(orderPayment.statusId)) }}</ion-note>
                  </ion-label>
                  <div slot="end" class="ion-text-end">
                    <ion-badge v-if="order.paymentPreferences.length > 1 && index === 0" color="dark">{{ translate("Latest") }}</ion-badge>
                    <ion-label slot="end">{{ commonUtil.formatCurrency(orderPayment.maxAmount, order.currencyUom) }}</ion-label>
                  </div>
                </ion-item>
              </ion-list>
            </div>
            <p v-else class="empty-state">
              {{ translate("No payments found") }}
            </p>
          </ion-card>

          <ion-card v-if="['in-progress', 'completed'].includes(order.category)">
            <ion-card-header>
              <ion-card-title>
                {{ translate('Shipment method') }}
              </ion-card-title>
            </ion-card-header>
            <ion-item v-if="isCODPaymentPending">
              <ion-label>{{ translate("Cash on delivery order") }}</ion-label>
              <ion-icon slot="end" color="success" :icon="checkmarkCircleOutline" />
            </ion-item>
            <ion-item button v-if="isOrderAdjustmentPending" @click="openOrderAdjustmentInfo">
              <ion-label>{{ translate("This shipping label will include order level charges because it is the first label.") }}</ion-label>
              <ion-icon slot="end" color="success" :icon="cashOutline" />
            </ion-item>
            <ion-item button v-else-if="isCODPaymentPending" @click="openOrderAdjustmentInfo">
              <ion-label>{{ translate("This shipping label will not include order level charges.") }}</ion-label>
              <ion-icon slot="end" :icon="cashOutline" />
            </ion-item>
            <ion-item>
              <ion-select :disabled="!order.missingLabelImage || !useUserStore().hasPermission('ORDER_SHIPMENT_METHOD_UPDATE')" :label="translate('Carrier')" v-model="carrierPartyId" interface="popover" @ionChange="updateCarrierAndShippingMethod(carrierPartyId, shipmentMethodTypeId)" :selected-text="getSelectedCarrier(carrierPartyId)">
                <ion-select-option v-for="carrier in filteredFacilityCarriers" :key="carrier.partyId" :value="carrier.partyId">{{ translate(carrier.groupName) }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <template v-if="carrierMethods && carrierMethods.length > 0">
                <ion-select :disabled="!order.missingLabelImage || shipmentMethodTypeId === 'SHIP_TO_STORE' || !useUserStore().hasPermission('ORDER_SHIPMENT_METHOD_UPDATE')" :label="translate('Method')" v-model="shipmentMethodTypeId" interface="popover" @ionChange="updateCarrierAndShippingMethod(carrierPartyId, shipmentMethodTypeId)" :selected-text="getSelectedShipmentMethod(shipmentMethodTypeId)">
                  <ion-select-option v-for="method in carrierMethods" :key="method.partyId + method.shipmentMethodTypeId" :value="method.shipmentMethodTypeId">{{ translate(method.description) }}</ion-select-option>
                </ion-select>
              </template>
              <template v-else-if="!isUpdatingCarrierDetail">
                <ion-label>
                  {{ translate('No shipment methods linked to', {carrierName: getCarrierName(carrierPartyId)}) }}
                </ion-label>
                <ion-button @click="openShippingMethodDocumentReference()" fill="clear" color="medium" slot="end">
                  <ion-icon slot="icon-only" :icon="informationCircleOutline" />
                </ion-button>
              </template>
            </ion-item>
            <template v-if="order.missingLabelImage">
              <ion-item lines="none" v-if="shipmentLabelErrorMessage">
                <ion-label class="ion-text-wrap">
                  <p class=overline>{{ translate("Error Log") }}</p>
                  {{ shipmentLabelErrorMessage }}
                </ion-label>
              </ion-item>
              <template v-if="category === 'completed'">
                <ion-button :disabled="!shipmentMethodTypeId || !hasPackedShipments(order)" fill="outline" expand="block" class="ion-margin" @click.stop="regenerateShippingLabel(order)">
                  {{ shipmentLabelErrorMessage ? translate("Retry Label") : translate("Generate Label") }}
                  <ion-spinner color="primary" slot="end" data-spinner-size="medium" v-if="order.isGeneratingShippingLabel" name="crescent" />
                </ion-button>
                <ion-button :disabled="!shipmentMethodTypeId || !carrierPartyId || !hasPackedShipments(order)" fill="clear" expand="block" color="medium" @click="openTrackingCodeModal()">
                  {{ translate("Add tracking code manually") }}
                </ion-button>
              </template>
            </template>
            <ion-item v-else-if="order.trackingCode">
              <ion-label>
                {{ order.trackingCode }}
                <p>{{ translate("tracking code") }}</p>
              </ion-label>        
              <ion-button slot="end" fill="clear" color="medium" @click="shippingLabelActionPopover($event, order)">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </ion-item>
          </ion-card>

          <Component v-if="useUserStore().hasPermission('FF_INVOICING_STATUS_VIEW')" :is="orderInvoiceExt" :category="category" :order="order" :userProfile="userProfile" :maargBaseUrl="commonUtil.getMaargBaseURL()" :userToken="commonUtil.getToken()" />
        </div>
        
        <h4 class="ion-padding-top ion-padding-start" v-if="order.otherShipGroups?.length">{{ translate('Other shipments in this order') }}</h4>
        <div class="shipgroup-details">
          <ion-card v-for="shipGroup in order.otherShipGroups" :key="shipGroup.shipmentId">
            <ion-card-header>
              <div>
                <ion-card-subtitle class="overline">{{ useUtilStore().getFacilityTypeDesc(shipGroup.facilityTypeId)}}</ion-card-subtitle>
                <ion-card-title>{{ shipGroup.facilityName ?  shipGroup.facilityName : shipGroup.facilityId}}</ion-card-title>
                {{ shipGroup.primaryShipGroupSeqId ? shipGroup.primaryShipGroupSeqId : shipGroup.shipGroupSeqId }}
              </div>
              <ion-badge :color="shipGroup.category ? 'primary' : 'medium'">
                {{
                  shipGroup.category
                    ? shipGroup.category === 'open'
                      ? translate('Open')
                      : shipGroup.category === 'in-progress'
                        ? translate('In Progress')
                        : translate('Completed')
                    : translate('Pending allocation')
                }}
              </ion-badge>

            </ion-card-header>
    
            <ion-item v-if="shipGroup.carrierPartyId">
              {{ useUtilStore().getPartyName(shipGroup.carrierPartyId) }}
              <ion-label slot="end">{{ shipGroup.trackingCode }}</ion-label>
              <ion-icon slot="end" :icon="locateOutline" />
            </ion-item>
    
            <ion-item v-if="shipGroup.shippingInstructions" color="light" lines="none">
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ translate("Handling Instructions") }}</p>
                <p>{{ shipGroup.shippingInstructions }}</p>
              </ion-label>
            </ion-item>
    
            <ion-item lines="none" v-for="item in shipGroup.items" :key="item">
              <ion-thumbnail slot="start" v-image-preview="getProduct(item.productId)" :key="getProduct(item.productId)?.mainImageUrl">
                <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small"/>
              </ion-thumbnail>
              <ion-label>
                <p class="overline">{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                <div>
                  {{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}
                  <ion-badge class="kit-badge" color="dark" v-if="orderUtil.isKit(item)">{{ translate("Kit") }}</ion-badge>
                </div>
              </ion-label>
              
              <div class="other-shipment-actions">
                <!-- TODO: add a spinner if the api takes too long to fetch the stock -->
                <ion-note slot="end" v-if="getProductStock(item.productId, item.facilityId).qoh">{{ getProductStock(item.productId, item.facilityId).qoh }} {{ translate('pieces in stock') }}</ion-note>
                <ion-button slot="end" fill="clear" v-else-if="['open', 'in-progress', 'completed'].includes(shipGroup.category)" size="small" @click.stop="fetchProductStock(item.productId, item.facilityId)">
                  <ion-icon color="medium" slot="icon-only" :icon="cubeOutline"/>
                </ion-button>
              </div>
            </ion-item>
          </ion-card>
        </div>
      </div>
      <div v-else-if="order" class="empty-state">
        <ion-spinner name="crescent" />
        <ion-label>{{ translate("Loading...") }}</ion-label>
      </div>
      <div v-else class="empty-state">
        <p>{{ translate("Unable to fetch the order details. Either the order has been shipped or something went wrong. Please try again after some time.")}}</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonBadge, IonButton, IonCard, IonCheckbox, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonNote, IonPage, IonRow, IonSkeletonText, IonTitle, IonToolbar, IonThumbnail, alertController, popoverController, modalController, onIonViewDidEnter } from "@ionic/vue";
import { computed, defineProps, onMounted, ref } from "vue";
import { addOutline, archiveOutline, bagCheckOutline, cashOutline, caretDownOutline, checkmarkCircleOutline, chevronUpOutline, closeCircleOutline, cubeOutline, documentTextOutline, ellipsisVerticalOutline, fileTrayOutline, gift, giftOutline, informationCircleOutline, listOutline, locateOutline, personAddOutline, pricetagOutline, ribbonOutline, trashBinOutline } from "ionicons/icons";
import { cookieHelper, commonUtil, DxpShopifyImg, emitter, logger, moduleFederationUtil, translate } from "@common";
import { useProductStore } from "@/store/productStore";

import { DateTime } from "luxon";
import Popover from "@/views/ShippingPopover.vue";
import PackagingPopover from "@/views/PackagingPopover.vue";
import AssignPickerModal from "@/views/AssignPickerModal.vue";
import ShipmentBoxTypePopover from "@/components/ShipmentBoxTypePopover.vue";
import ShipmentBoxPopover from "@/components/ShipmentBoxPopover.vue";
import ReportIssuePopover from "@/components/ReportIssuePopover.vue";
import { orderUtil } from "@/utils/orderUtil";
import ScanOrderItemModal from "@/components/ScanOrderItemModal.vue";
import GenerateTrackingCodeModal from "@/components/GenerateTrackingCodeModal.vue";
import GiftCardActivationModal from "@/components/GiftCardActivationModal.vue";
import { useOrderStore } from "@/store/order";
import { useProductStore as useProduct } from "@/store/product";
import { useStockStore } from "@/store/stock";
import { useUtilStore } from "@/store/util";
import { useCarrierStore } from "@/store/carrier";
import { useUserStore } from "@/store/user";
import OrderAdjustmentModal from "@/components/OrderAdjustmentModal.vue";
import ShippingLabelActionPopover from "@/components/ShippingLabelActionPopover.vue";
import TrackingCodeModal from "@/components/TrackingCodeModal.vue";
import router from "@/router";

const props = defineProps(["category", "orderId", "shipGroupSeqId", "shipmentId"]);

const userStore = useUserStore();
const orderStore = useOrderStore();
const carrierStore = useCarrierStore();

const addingBoxForShipmentIds = ref([] as any);
const isUpdatingCarrierDetail = ref(false);
const defaultShipmentBoxType = ref({} as any);
const statusColor = ref({
  PAYMENT_AUTHORIZED: "",
  PAYMENT_CANCELLED: "warning",
  PAYMENT_DECLINED: "warning",
  PAYMENT_NOT_AUTH: "warning",
  PAYMENT_NOT_RECEIVED: "warning",
  PAYMENT_RECEIVED: "",
  PAYMENT_REFUNDED: "warning",
  PAYMENT_SETTLED: ""
} as any);
const rejectEntireOrderReasonId = "REJ_AVOID_ORD_SPLIT";
const shipmentLabelErrorMessage = ref("");
const shipmentMethodTypeId = ref("");
const initialShipmentMethodTypeId = ref("");
const carrierPartyId = ref("");
const carrierMethods = ref([] as any);
const orderInvoicingInfo = ref({} as any);
const orderInvoiceExt = ref("" as any);
const isCODPaymentPending = ref(false);
const isOrderAdjustmentPending = ref(false);
const orderAdjustments = ref([] as any);
const orderHeaderAdjustmentTotal = ref(0);
const adjustmentsByGroup = ref({} as any);
const orderAdjustmentShipmentId = ref("");
const printDocumentsExt = ref("" as any);
const productCategoryFilter = ref("" as any);
const shippingManifest = ref("" as any);

const boxTypeDesc = (id: string) => useUtilStore().getShipmentBoxDesc(id);
const getProduct = (productId: string) => useProduct().getProduct(productId);
const getProductStock = (productId: string, facilityId = "") => useStockStore().getProductStock(productId, facilityId);
const inProgressOrders = computed(() => useOrderStore().getInProgressOrders);
const order = computed(() => useOrderStore().getCurrent);
const rejectReasonOptions = computed(() => useUtilStore().getRejectReasonOptions);
const userPreference = computed(() => useUserStore().getUserPreferenceState);
const getPaymentMethodDesc = (paymentMethodTypeId: string) => useUtilStore().getPaymentMethodDesc(paymentMethodTypeId);
const getStatusDesc = (statusId: string) => useUtilStore().getStatusDesc(statusId);
const isProductStoreSettingEnabled = computed(() => (settingTypeEnumId: string) => useProductStore().isProductStoreSettingEnabled(settingTypeEnumId));
const excludeOrderBrokerDays = computed(() => useProductStore().getSettings.excludeOrderBrokerDays);
const productStoreShipmentMethods = computed(() => useCarrierStore().getProductStoreShipmentMethods);
const facilityCarriers = computed(() => useCarrierStore().getFacilityCarriers);
const productStoreShipmentMethCount = computed(() => useProductStore().getProductStoreShipmentMethCount);
const filteredFacilityCarriers = computed(() => {
  if (initialShipmentMethodTypeId.value === 'SHIP_TO_STORE') {
    const allowedPartyIds = new Set(productStoreShipmentMethods.value
      .filter((method: any) => method.shipmentMethodTypeId === 'SHIP_TO_STORE')
      .map((method: any) => method.partyId));
    return facilityCarriers.value.filter((carrier: any) => allowedPartyIds.has(carrier.partyId));
  }
  return facilityCarriers.value;
})
const userProfile = computed(() => useUserStore().getUserProfile);
const carrierShipmentBoxTypes = computed(() => useUtilStore().getCarrierShipmentBoxTypes);
const getShipmentMethodDesc = (shipmentMethodId: string) => useUtilStore().getShipmentMethodDesc(shipmentMethodId);
const productIdentificationPref = computed(() => useProductStore().getProductIdentificationPref);
const currentFacility = computed(() => useProductStore().getCurrentFacility as any);

const getTime = (time: any) => {
  return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
};

const fetchShipmentLabelError = async () => {
  const shipmentId = order.value?.shipmentId;
  const labelError = await orderStore.fetchShipmentLabelError(shipmentId) as any;

  if (labelError) {
    shipmentLabelErrorMessage.value = labelError;
  }
};

const getProductStoreShipmentMethods = async (carrierPartyIdValue: string) => {
  return productStoreShipmentMethods.value?.filter((method: any) => method.partyId === carrierPartyIdValue && (initialShipmentMethodTypeId.value === "SHIP_TO_STORE" || method.shipmentMethodTypeId !== "SHIP_TO_STORE")) || [];
};

const updateCarrierShipmentDetails = async (carrierPartyIdValue: string, shipmentMethodTypeIdValue: string) => {
  carrierPartyId.value = carrierPartyIdValue;
  shipmentMethodTypeId.value = shipmentMethodTypeIdValue;
  carrierMethods.value = await getProductStoreShipmentMethods(carrierPartyIdValue);
  shipmentLabelErrorMessage.value = "";
};

const fetchKitComponent = async (orderItem: any, isOtherShipment = false) => {
  await useProduct().fetchProductComponents({ productId: orderItem.productId });

  if (isOtherShipment) {
    const updatedShipGroup = order.value?.shipGroups.find((shipGroup: any) => shipGroup.shipGroupSeqId === orderItem.shipGroupSeqId);
    if (updatedShipGroup) {
      const updatedItem = updatedShipGroup?.items.find((item: any) => item.orderItemSeqId === orderItem.orderItemSeqId);
      updatedItem.showKitComponents = orderItem.showKitComponents ? false : true;
    }
  } else {
    const updatedItem = order.value.items.find((item: any) => item.orderItemSeqId === orderItem.orderItemSeqId);
    updatedItem.showKitComponents = orderItem.showKitComponents ? false : true;
    if (!updatedItem.kitComponents) {
      updatedItem.kitComponents = getProduct(updatedItem.productId).productComponents.map((productComponent: any) => productComponent.productIdTo);
    }
  }
};

const getRejectionReasonDescription = (rejectionReasonId: string) => {
  const reason = rejectReasonOptions.value?.find((reason: any) => reason.enumId === rejectionReasonId);
  return reason?.description ? reason.description : reason?.enumDescription ? reason.enumDescription : reason?.enumId;
};

const isEntierOrderRejectionEnabled = (currentOrder: any) => {
  return !isProductStoreSettingEnabled.value("FULFILL_PART_ODR_REJ") && currentOrder.hasRejectedItem;
};

const openShipmentBoxPopover = async (ev: Event, item: any, currentOrder: any) => {
  const popover = await popoverController.create({
    component: ShipmentBoxPopover,
    componentProps: {
      shipmentPackages: currentOrder.shipmentPackages
    },
    showBackdrop: false,
    event: ev
  });

  popover.present();

  const result = await popover.onDidDismiss();

  if (result.data && item.selectedBox !== result.data) {
    currentOrder.items.map((orderItem: any) => {
      if (orderItem.orderItemSeqId === item.orderItemSeqId) {
        orderItem.selectedBox = result.data;
      }
    });
  }
  return result.data;
};

const fetchProductStock = (productId: string, facilityId = "") => {
  useStockStore().fetchStock({ productId, facilityId });
};

const packOrder = async (currentOrder: any) => {
  if (currentOrder.hasRejectedItem) {
    const itemsToReject = currentOrder.items.filter((item: any) => item.rejectReason);
    reportIssue(currentOrder, itemsToReject);
    return;
  }
  initiatePackOrder(currentOrder);
};

const initiatePackOrder = async (currentOrder: any, updateParameter?: string) => {
  let forceScan = isProductStoreSettingEnabled.value("FULFILL_FORCE_SCAN");
  if (isEntierOrderRejectionEnabled(currentOrder)) {
    forceScan = false;
  } else if (forceScan) {
    forceScan = !currentOrder.items.every((item: any) => item.rejectReason);
  }

  if (currentOrder.hasAllRejectedItem) {
    const isSuccess = await rejectEntireOrder(currentOrder, updateParameter);
    if (isSuccess) {
      router.push("/in-progress");
    }
  } else if (forceScan) {
    await scanOrder(currentOrder, updateParameter);
  } else {
    await confirmPackOrder(currentOrder, updateParameter);
  }
};

const rejectEntireOrder = async (currentOrder: any, updateParameter?: string) => {
  emitter.emit("presentLoader");
  try {
    const updatedOrderDetail = await getUpdatedOrderDetail(currentOrder, updateParameter);
    const params = {
      shipmentId: currentOrder.shipmentId,
      orderId: currentOrder.orderId,
      facilityId: currentOrder.originFacilityId,
      rejectedOrderItems: updatedOrderDetail.rejectedOrderItems
    };
    const resp = await orderStore.packOrder(params) as any;


    if (commonUtil.hasError(resp)) {
      throw resp.data;
    }

    commonUtil.showToast(translate("Order rejected successfully"));
    return true;
  } catch (err) {
    logger.error("Failed to reject order", err);
    commonUtil.showToast(translate("Failed to reject order"));
  } finally {
    emitter.emit("dismissLoader");
  }
  return false;
};

const confirmPackOrder = async (currentOrder: any, updateParameter?: string, trackingCode?: string) => {
  const confirmPackOrder = await alertController
    .create({
      header: translate("Pack order"),
      message: translate("You are packing an order. Select additional documents that you would like to print.", { space: "<br /><br />" }),
      inputs: [{
        name: "printShippingLabel",
        type: "checkbox",
        label: translate("Shipping labels"),
        value: "printShippingLabel",
        checked: userPreference.value.printShippingLabel
      }, {
        name: "printPackingSlip",
        type: "checkbox",
        label: translate("Packing slip"),
        value: "printPackingSlip",
        checked: userPreference.value.printPackingSlip
      }],
      buttons: [{
        text: translate("Cancel"),
        role: "cancel"
      }, {
        text: translate("Pack"),
        role: "confirm",
        handler: async (data) => {
          const packingResponse = await executePackOrder(currentOrder, updateParameter, trackingCode, data);
          if (!packingResponse.isPacked) {
            const updatedOrder = await useOrderStore().updateShipmentPackageDetail(currentOrder);
            await generateTrackingCodeForPacking(updatedOrder, updateParameter, data, packingResponse.errors);
          }
        }
      }]
    });
  return confirmPackOrder.present();
};

const executePackOrder = async (currentOrder: any, updateParameter?: string, trackingCode?: string, documentOptions?: any) => {
  emitter.emit("presentLoader");
  let toast: any;
  const shipmentIds = [currentOrder.shipmentId];
  const manualTrackingCode = trackingCode;

  try {
    const updatedOrderDetail = await getUpdatedOrderDetail(currentOrder, updateParameter) as any;
    const params = {
      shipmentId: currentOrder.shipmentId,
      orderId: currentOrder.primaryOrderId,
      facilityId: currentOrder.originFacilityId,
      rejectedOrderItems: updatedOrderDetail.rejectedOrderItems,
      shipmentPackageContents: updatedOrderDetail.shipmentPackageContents,
      trackingCode: manualTrackingCode
    };

    const resp = await orderStore.packOrder(params) as any;

    if (commonUtil.hasError(resp)) {
      throw resp.data;
    }
    await useOrderStore().updateShipmentPackageDetail(order.value);
    const shippingLabelPdfUrls: string[] = Array.from(
      new Set(
        (order.value.shipmentPackages ?? [])
          .filter((shipmentPackage: any) => shipmentPackage.labelImageUrl)
          .map((shipmentPackage: any) => shipmentPackage.labelImageUrl)
      )
    );

    emitter.emit("dismissLoader");

    if (documentOptions.length) {
      toast = await commonUtil.showToast(translate("Order packed successfully. Document generation in process"), { canDismiss: true, manualDismiss: true });
      toast.present();

      if (documentOptions.includes("printPackingSlip") && documentOptions.includes("printShippingLabel")) {
        if (shippingLabelPdfUrls && shippingLabelPdfUrls.length > 0) {
          await orderStore.printPackingSlip(shipmentIds);
          await orderStore.printShippingLabel(shipmentIds, shippingLabelPdfUrls, currentOrder.shipmentPackages);
        } else {
          await orderStore.printShippingLabelAndPackingSlip(shipmentIds, currentOrder.shipmentPackages);
        }
      } else if (documentOptions.includes("printPackingSlip")) {
        await orderStore.printPackingSlip(shipmentIds);
      } else if (documentOptions.includes("printShippingLabel") && !manualTrackingCode && !order.value.missingLabelImage) {
        await orderStore.printShippingLabel(shipmentIds, shippingLabelPdfUrls, currentOrder.shipmentPackages);
      }
      if (currentOrder.shipmentPackages?.[0].internationalInvoiceUrl) {
        await orderStore.printCustomDocuments([currentOrder.shipmentPackages?.[0].internationalInvoiceUrl]);
      }


      toast.dismiss();
    } else {
      commonUtil.showToast(translate("Order packed successfully"));
    }
    router.replace(`/completed/shipment-detail/${props.orderId}/${props.shipmentId}`);
    return { isPacked: true };
  } catch (err: any) {
    if (toast) toast.dismiss();
    emitter.emit("dismissLoader");
    commonUtil.showToast(translate("Failed to pack order"));
    logger.error("Failed to pack order", err);
    return { isPacked: false, errors: err?.response?.data?.errors };
  } finally {
    emitter.emit("dismissLoader");
  }
};


const packagingPopover = async (ev: Event) => {
  const popover = await popoverController.create({
    component: PackagingPopover,
    event: ev,
    translucent: true,
    showBackdrop: false
  });
  return popover.present();
};

const openRejectReasonPopover = async (ev: Event, item: any, currentOrder: any) => {
  const reportIssuePopover = await popoverController.create({
    component: ReportIssuePopover,
    event: ev,
    translucent: true,
    showBackdrop: false
  });

  reportIssuePopover.present();

  const result = await reportIssuePopover.onDidDismiss();

  if (result.data) {
    currentOrder.items.map((orderItem: any) => {
      if (orderItem.orderItemSeqId === item.orderItemSeqId) {
        orderItem.rejectReason = result.data;
      }
    });
    currentOrder.hasRejectedItem = true;
    currentOrder.hasAllRejectedItem = isEntierOrderRejectionEnabled(currentOrder) || currentOrder.items.every((item: any) => item.rejectReason);
  }
};

const removeRejectionReason = async (ev: Event, item: any, currentOrder: any) => {
  delete item["rejectReason"];
  delete item["kitComponents"];

  item.rejectReason = "";
  currentOrder.items.map((orderItem: any) => {
    if (orderItem.orderItemSeqId === item.orderItemSeqId) {
      delete orderItem["rejectReason"];
      delete orderItem["kitComponents"];
    }
  });
  currentOrder.hasRejectedItem = currentOrder.items.some((item: any) => item.rejectReason);
  currentOrder.hasAllRejectedItem = isEntierOrderRejectionEnabled(currentOrder) || currentOrder.items.every((item: any) => item.rejectReason);
};

const rejectKitComponent = (currentOrder: any, item: any, componentProductId: string) => {
  let kitComponents = item.kitComponents ? item.kitComponents : [];
  if (kitComponents.includes(componentProductId)) {
    kitComponents = kitComponents.filter((rejectedComponent: any) => rejectedComponent !== componentProductId);
  } else {
    kitComponents.push(componentProductId);
  }
  item.kitComponents = kitComponents;
  currentOrder.items.map((orderItem: any) => {
    if (orderItem.orderItemSeqId === item.orderItemSeqId) {
      orderItem.kitComponents = kitComponents;
    }
  });
};

const assignPickers = async () => {
  const assignPickerModal = await modalController.create({
    component: AssignPickerModal,
    componentProps: { order: order.value }
  });

  assignPickerModal.onDidDismiss().then((result: any) => {
    popoverController.dismiss();
    if (result?.data?.value?.picklistId && result?.data?.value?.shipmentIds && result?.data?.value?.shipmentIds.length) {
      let newShipmentId = props.shipmentId;
      if (!newShipmentId) {
        newShipmentId = result?.data?.value?.shipmentIds[0];
      }
      router.replace(`/in-progress/shipment-detail/${props.orderId}/${newShipmentId}`);
    }
  });

  return assignPickerModal.present();
};

const getShipmentPackageType = (currentOrder: any, shipmentPackage: any) => {
  let packageType = shipmentPackage.shipmentBoxTypeId;
  if (!packageType) {
    const shipmentBoxTypes = getShipmentBoxTypes(currentOrder.carrierPartyId);
    packageType = shipmentBoxTypes[0];
  }
  return packageType;
};

const getShipmentBoxTypes = (carrierPartyIdValue: string) => {
  return carrierShipmentBoxTypes.value[carrierPartyIdValue] ? carrierShipmentBoxTypes.value[carrierPartyIdValue] : [];
};


const shippingPopover = async (ev: Event) => {
  const popover = await popoverController.create({
    component: Popover,
    event: ev,
    translucent: true,
    showBackdrop: false
  });
  return popover.present();
};

const addShipmentBox = async (currentOrder: any) => {
  addingBoxForShipmentIds.value.push(currentOrder.shipmentId);

  const { carrierPartyId: carrierId, shipmentMethodTypeId: shipmentMethodId } = currentOrder;

  if (!Object.keys(defaultShipmentBoxType.value).length) {
    defaultShipmentBoxType.value = await fetchDefaultShipmentBox();
  }

  let packageName = "A";
  const packageNames = currentOrder?.shipmentPackages
    .filter((shipmentPackage: any) => shipmentPackage.packageName)
    .map((shipmentPackage: any) => shipmentPackage.packageName);
  if (packageNames && packageNames.length) {
    packageNames.sort((a: any, b: any) => b.localeCompare(a));
    packageName = String.fromCharCode(packageNames[0].charCodeAt(0) + 1);
  }

  const params = {
    shipmentId: currentOrder.shipmentId,
    shipmentBoxTypeId: defaultShipmentBoxType.value?.shipmentBoxTypeId,
    boxLength: defaultShipmentBoxType.value?.boxLength,
    boxHeight: defaultShipmentBoxType.value?.boxHeight,
    boxWidth: defaultShipmentBoxType.value?.boxWidth,
    weightUomId: defaultShipmentBoxType.value?.weightUomId,
    dimensionUomId: defaultShipmentBoxType.value?.dimensionUomId,
    packageName,
    dateCreated: DateTime.now().toMillis()
  } as any;

  carrierId && (params["carrierPartyId"] = carrierId);
  shipmentMethodId && (params["shipmentMethodTypeId"] = shipmentMethodId);

  try {
    const resp = await orderStore.addShipmentBox(params) as any;


    if (!commonUtil.hasError(resp)) {
      commonUtil.showToast(translate("Box added successfully"));
      await useOrderStore().getInProgressOrder({ orderId: props.orderId, shipmentId: props.shipmentId });
      useOrderStore().updateInProgressOrder(order.value);
    } else {
      throw resp.data;
    }
  } catch (err) {
    commonUtil.showToast(translate("Failed to add box"));
    logger.error("Failed to add box", err);
  }
  addingBoxForShipmentIds.value.splice(addingBoxForShipmentIds.value.indexOf(currentOrder.shipmentId), 1);
};

const updateShipmentBoxType = async (shipmentPackage: any, currentOrder: any, ev: CustomEvent) => {
  const shipmentBoxTypes = getShipmentBoxTypes(currentOrder.carrierPartyId);
  if (!shipmentBoxTypes.length) {
    logger.error("Failed to fetch shipment box types");
    return;
  }

  const popover = await popoverController.create({
    component: ShipmentBoxTypePopover,
    event: ev,
    showBackdrop: false,
    componentProps: { shipmentBoxTypes }
  });

  popover.present();

  const result = await popover.onDidDismiss();

  if (result.data) {
    shipmentPackage.shipmentBoxTypeId = result.data;
    useOrderStore().updateInProgressOrder(currentOrder);
  }
};

const fetchDefaultShipmentBox = async () => {
  let defaultBoxTypeId = "YOURPACKNG";
  let defaultBoxType = {};

  try {
    let resp = await carrierStore.fetchDefaultShipmentBox({
      systemResourceId: "shipment",
      systemPropertyId: "shipment.default.boxtype",
      fieldsToSelect: ["systemPropertyValue", "systemResourceId"],
      pageSize: 1
    });

    if (!commonUtil.hasError(resp)) {
      defaultBoxTypeId = resp.data?.[0].systemPropertyValue;
    } else {
      throw resp.data;
    }

    const payload = {
      shipmentBoxTypeId: defaultBoxTypeId,
      pageSize: 1
    };
    resp = await carrierStore.fetchShipmentBoxType(payload);
    if (!commonUtil.hasError(resp)) {
      defaultBoxType = resp.data[0];
    }
  } catch (err) {
    logger.error("Failed to fetch default shipment box type information", err);
  }

  return defaultBoxType;
};

const reportIssue = async (currentOrder: any, itemsToReject: any) => {
  let message;
  const rejectedItem = itemsToReject[0];
  const productName = rejectedItem.productName;

  let ordersCount = 0;

  if (isProductStoreSettingEnabled.value("FF_COLLATERAL_REJ")) {
    ordersCount = inProgressOrders.value.list.map((inProgressOrder: any) => inProgressOrder.items.filter((item: any) => itemsToReject.some((itemToReject: any) => itemToReject.productId === item.productId) && item.shipmentId !== currentOrder.shipmentId))?.filter((item: any) => item.length).length;
  }

  if (itemsToReject.length === 1 && ordersCount) {
    message = translate("is identified as unfulfillable. other containing this product will be unassigned from this store and sent to be rebrokered.", { productName, space: "<br /><br />", orders: ordersCount, orderText: ordersCount > 1 ? "orders" : "order" });
  } else if (itemsToReject.length === 1 && !ordersCount) {
    message = translate("is identified as unfulfillable. This order item will be unassigned from this store and sent to be rebrokered.", { productName, space: "<br /><br />" });
  } else if (itemsToReject.length > 1 && ordersCount) {
    message = translate(", and other products are identified as unfulfillable. other containing these products will be unassigned from this store and sent to be rebrokered.", { productName, products: itemsToReject.length - 1, space: "<br /><br />", orders: ordersCount, orderText: ordersCount > 1 ? "orders" : "order" });
  } else {
    message = translate(", and other products are identified as unfulfillable. These order items will be unassigned from this store and sent to be rebrokered.", { productName, products: itemsToReject.length - 1, space: "<br /><br />" });
  }
  const alert = await alertController
    .create({
      header: translate("Report an issue"),
      message,
      buttons: [{
        text: translate("Cancel"),
        role: "cancel"
      }, {
        text: translate("Report"),
        role: "confirm",
        handler: async () => {
          await initiatePackOrder(currentOrder, "report");
        }
      }]
    });

  return alert.present();
};

const getUpdatedOrderDetail = async (currentOrder: any, updateParameter?: string) => {
  const items = JSON.parse(JSON.stringify(currentOrder.items));
  const rejectedOrderItems = [] as any;
  const shipmentPackageContents = [] as any;
  items.map((item: any) => {
    const shipmentPackage = currentOrder.shipmentPackages.find((shipmentPackage: any) => shipmentPackage.packageName === item.selectedBox);
    if (updateParameter === "report" && item.rejectReason) {
      const rejectedItemInfo = {
        orderId: item.orderId,
        orderItemSeqId: item.orderItemSeqId,
        shipmentId: item.shipmentId,
        shipmentItemSeqId: item.shipmentItemSeqId,
        productId: item.productId,
        facilityId: currentFacility.value?.facilityId,
        updateQOH: isProductStoreSettingEnabled.value("AFFECT_QOH_ON_REJ") || false,
        maySplit: isEntierOrderRejectionEnabled(currentOrder) ? "N" : "Y",
        cascadeRejectByProduct: isProductStoreSettingEnabled.value("FF_COLLATERAL_REJ") ? "Y" : "N",
        rejectionReasonId: item.rejectReason,
        kitComponents: item.kitComponents,
        comments: "Store Rejected Inventory"
      } as any;

      if (excludeOrderBrokerDays.value !== undefined) {
        rejectedItemInfo["excludeOrderFacilityDuration"] = excludeOrderBrokerDays.value;
      }
      rejectedOrderItems.push(rejectedItemInfo);
    } else if (item.selectedBox !== item.currentBox) {
      shipmentPackageContents.push({
        shipmentId: item.shipmentId,
        shipmentItemSeqId: item.shipmentItemSeqId,
        shipmentPackageSeqId: shipmentPackage.shipmentPackageSeqId,
        quantity: item.quantity
      });
    }
  });
  return { rejectedOrderItems, shipmentPackageContents };
};

const hasPackedShipments = (currentOrder: any) => {
  return currentOrder.statusId === "SHIPMENT_PACKED";
};

const shipOrder = async (currentOrder: any) => {
  emitter.emit("presentLoader");
  try {
    const resp = await orderStore.shipOrder({ shipmentId: currentOrder.shipmentId }) as any;

    if (!commonUtil.hasError(resp)) {
      commonUtil.showToast(translate("Order shipped successfully"));
      router.push("/completed");
    } else {
      throw resp.data;
    }
  } catch (err) {
    commonUtil.showToast(translate("Something went wrong, could not ship the order"));
    logger.error("Failed to ship the order.", err);
  } finally {
    emitter.emit("dismissLoader");
  }
};

const fetchOrderInvoicingStatus = async () => {
  let orderInvoicingInfoValue = {} as any, resp;

  const params = {
    customParametersMap: {
      orderId: order.value.orderId,
      orderByField: "-entryDate",
      pageSize: 1
    },
    dataDocumentId: "ApiCommunicationEventOrder"
  };

  try {
    resp = await orderStore.findOrderInvoicingInfo(params) as any;


    if (!commonUtil.hasError(resp) && resp.data?.entityValueList?.length) {
      const response = resp.data?.entityValueList[0];

      const content = Object.keys(response.content).length ? JSON.parse(response.content) : {};

      const invoicingFacility = userProfile.value.facilities.find((facility: any) => facility.facilityId === content?.request?.InvoicingStore);

      orderInvoicingInfoValue = {
        id: response.orderId,
        createdDate: getInvoicingConfirmationDate(response.entryDate),
        response: Object.keys(content.response).length ? content?.response : {},
        status: content.status,
        statusCode: content.statusCode,
        invoicingFacility
      };

      const retailProStatus = order.value.attributes.find((attribute: any) => attribute.attrName === "retailProStatus");
      if (Object.keys(retailProStatus).length && retailProStatus?.attrValue === "Invoiced") {
        orderInvoicingInfoValue["invoicingConfirmationDate"] = retailProStatus?.lastUpdatedStamp;
      }
    } else {
      throw resp.data;
    }
  } catch (error: any) {
    logger.error(error);
  }

  orderInvoicingInfo.value = orderInvoicingInfoValue;
};

const getInvoicingConfirmationDate = (date: any) => {
  return DateTime.fromMillis(date).setZone(userProfile.value.userTimeZone).toFormat("dd MMMM yyyy hh:mm a ZZZZ");
};


const isTrackingRequiredForAnyShipmentPackage = (currentOrder: any) => {
  return currentOrder.isTrackingRequired === "Y";
};

const scanOrder = async (currentOrder: any, updateParameter?: string) => {
  const modal = await modalController.create({
    component: ScanOrderItemModal,
    componentProps: { order: currentOrder }
  });

  modal.onDidDismiss().then((result: any) => {
    if (result.data?.packOrder) {
      confirmPackOrder(currentOrder, updateParameter);
    }
  });

  modal.present();
};

const generateTrackingCodeForPacking = async (currentOrder: any, updateParameter?: string, documentOptions?: any, packingError?: string) => {
  const modal = await modalController.create({
    component: GenerateTrackingCodeModal,
    componentProps: { order: currentOrder, updateCarrierShipmentDetails, executePackOrder, rejectEntireOrder, updateParameter, documentOptions, packingError, isDetailPage: "Y", initialShipmentMethodTypeId: initialShipmentMethodTypeId.value }
  });
  modal.present();
};


const openGiftCardActivationModal = async (item: any) => {
  const modal = await modalController.create({
    component: GiftCardActivationModal,
    componentProps: { item }
  });

  modal.onDidDismiss().then((result: any) => {
    if (result.data?.isGCActivated) {
      useOrderStore().updateCurrentItemGCActivationDetails({ item, category: props.category, isDetailsPage: true });
    }
  });

  modal.present();
};

const fetchCODPaymentInfo = async () => {
  try {
    const isPendingCODPayment = order.value?.paymentPreferences?.some((paymentPref: any) => paymentPref.paymentMethodTypeId === "EXT_SHOP_CASH_ON_DEL" && paymentPref.statusId === "PAYMENT_NOT_RECEIVED");
    if (isPendingCODPayment) {
      isCODPaymentPending.value = true;
      orderHeaderAdjustmentTotal.value = 0;
      orderAdjustments.value = order.value?.adjustments.filter((adjustment: any) => {
        if ((adjustment.orderItemSeqId === "_NA_" || !adjustment.orderItemSeqId) && !adjustment.billingShipmentId) {
          orderHeaderAdjustmentTotal.value += adjustment.amount;
          return true;
        } else {
          adjustmentsByGroup.value[adjustment.shipGroupSeqId] ? (adjustmentsByGroup.value[adjustment.shipGroupSeqId].push(adjustment)) : (adjustmentsByGroup.value[adjustment.shipGroupSeqId] = [adjustment]);
          return false;
        }
      });
      isOrderAdjustmentPending.value = order.value?.adjustments.some((adjustment: any) => !adjustment.billingShipmentId);

      if (!isOrderAdjustmentPending.value) {
        const adjustment = order.value?.adjustments.find((adjustment: any) => adjustment.billingShipmentId);
        orderAdjustmentShipmentId.value = adjustment.billingShipmentId;
      }
    }
  } catch (err) {
    logger.error(err);
  }
};

  
const unpackOrder = async(order: any) => {
  const unpackOrderAlert = await alertController
    .create({
        header: translate("Unpack"),
        message: translate("Unpacking this order will send it back to 'In progress' and it will have to be repacked."),
        buttons: [{
        role: "cancel",
        text: translate("Cancel"),
      }, {
        text: translate("Unpack"),
        handler: async () => {
          try {
            const resp = await useOrderStore().unpackOrder({shipmentId: order.shipmentId, statusId: 'SHIPMENT_APPROVED'})

            if(resp.status == 200 && !commonUtil.hasError(resp)) {
              commonUtil.showToast(translate('Order unpacked successfully'))
              router.replace(`/in-progress/shipment-detail/${props.orderId}/${props.shipmentId}`)
            } else {
              throw resp.data
            }
          } catch(err) {
            logger.error('Failed to unpack the order', err)
            commonUtil.showToast(translate('Failed to unpack the order'))
          }
        }
      }]
    });
  return unpackOrderAlert.present();
}

const openOrderAdjustmentInfo = async () => {
  if(isCODPaymentPending.value && !isOrderAdjustmentPending.value) {
    let message = "Order level charges like shipping fees and taxes were already charged to the customer on the first label generated for this order."
    let facilityName = ""
    let trackingCode = ""
    let buttons = [
      {
        text: translate("Dismiss"),
        role: "cancel"
      }
    ] as any

    if(orderAdjustmentShipmentId.value) {
      const shipGroup = order.value.otherShipGroups.find((group: any) => group.shipmentId == orderAdjustmentShipmentId.value)
      facilityName = shipGroup.facilityName || shipGroup.facilityId
      trackingCode = shipGroup.trackingCode

      // As mentioned above, if shipGroup is not found we won't have facility and trackingCode, thus not displaying the second para in that case.
      if(trackingCode) {
        message += "Label was generated by facility with tracking code"
        buttons.push({
          text: translate("Copy tracking code"),
          handler: () => {
            commonUtil.copyToClipboard(trackingCode, "Copied to clipboard")
          }
        })
      }
    }

    const alert = await alertController.create({
      message: translate(message, { space: "<br/><br/>", facilityName, trackingCode }),
      header: translate("COD calculation"),
      buttons
    })

    return alert.present();
  } else {
    const modal = await modalController.create({
      component: OrderAdjustmentModal,
      componentProps: {
        order: order.value,
        orderId: props.orderId,
        orderAdjustments: orderAdjustments.value,
        orderHeaderAdjustmentTotal: orderHeaderAdjustmentTotal.value,
        adjustmentsByGroup: adjustmentsByGroup.value
      }
    })

    return modal.present();
  }
}

const updateCarrierAndShippingMethod = async (carrierPartyId: string, shipmentMethodTypeId: string) => {
  let resp;
  try {
    emitter.emit("presentLoader");
    isUpdatingCarrierDetail.value = true;
    const carrierShipmentMethods = await getProductStoreShipmentMethods(carrierPartyId);
    const isCurrentMethodSupported = shipmentMethodTypeId && carrierShipmentMethods.some((method: any) => method.shipmentMethodTypeId === shipmentMethodTypeId);
    shipmentMethodTypeId = isCurrentMethodSupported ? shipmentMethodTypeId : (carrierShipmentMethods?.[0]?.shipmentMethodTypeId || "");
    const shipmentRouteSegmentId = order.value?.shipmentPackageRouteSegDetails[0]?.shipmentRouteSegmentId
    const isTrackingRequired = carrierShipmentMethods.find((method: any) => method.shipmentMethodTypeId === shipmentMethodTypeId)?.isTrackingRequired

    const params = {
      shipmentId: order.value.shipmentId,
      shipmentRouteSegmentId,
      shipmentMethodTypeId : shipmentMethodTypeId ? shipmentMethodTypeId : "",
      carrierPartyId,
      isTrackingRequired: isTrackingRequired ? isTrackingRequired : "Y"
    }

    resp = await useOrderStore().updateShipmentCarrierAndMethod(params)
    if (!commonUtil.hasError(resp)) {
      shipmentMethodTypeId = shipmentMethodTypeId
      emitter.emit("dismissLoader");
      commonUtil.showToast(translate("Shipment method detail updated successfully."))
      
      //fetching updated shipment packages
      await useOrderStore().updateShipmentPackageDetail(order.value) 
      carrierMethods.value = carrierShipmentMethods;
      isUpdatingCarrierDetail.value = false;
    } else {
      throw resp.data;
    }
    
  } catch (err) {
    isUpdatingCarrierDetail.value = false;
    carrierPartyId = order.value.shipmentPackages?.[0].carrierPartyId;
    shipmentMethodTypeId = order.value.shipmentPackages?.[0].shipmentMethodTypeId;

    emitter.emit("dismissLoader");
    logger.error('Failed to update carrier and method', err);
    commonUtil.showToast(translate("Failed to update shipment method detail."));
  }
}

const printShippingLabel = async (order: any) => {
  const shipmentIds = [order.shipmentId];
  const shippingLabelPdfUrls: string[] = Array.from(
    new Set(
      (order.shipmentPackages ?? [])
        .filter((shipmentPackage: any) => shipmentPackage.labelImageUrl)
        .map((shipmentPackage: any) => shipmentPackage.labelImageUrl)
    )
  );

  const internationalInvoiceUrls: string[] = Array.from(
    new Set(
      order.shipmentPackages
        ?.filter((shipmentPackage: any) => shipmentPackage.internationalInvoiceUrl)
        .map((shipmentPackage: any) => shipmentPackage.internationalInvoiceUrl) || []
    )
  );

  if(!shipmentIds?.length) {
    commonUtil.showToast(translate('Failed to generate shipping label'))
    return;
  }

  await orderStore.printShippingLabel(shipmentIds, shippingLabelPdfUrls, order.shipmentPackages)
  if (internationalInvoiceUrls.length) {
    await orderStore.printCustomDocuments([internationalInvoiceUrls[0]]);
  }
}

const regenerateShippingLabel = async (order: any) => {
  // If there are no product store shipment method configured, then not generating the label and displaying an error toast
  if(productStoreShipmentMethCount.value <= 0) {
    commonUtil.showToast(translate('Unable to generate shipping label due to missing product store shipping method configuration'))
    return;
  }


  // if the request to print shipping label is not yet completed, then clicking multiple times on the button
  // should not do anything
  if(order.isGeneratingShippingLabel) {
    return;
  }

  order.isGeneratingShippingLabel = true;

  if(order.missingLabelImage) {
    const response = await orderUtil.retryShippingLabel(order)
    if(response?.isGenerated) {
      await printShippingLabel(response.order)
    } else {
      fetchShipmentLabelError()
    }
  } else {
    await printShippingLabel(order)
  }

  order.isGeneratingShippingLabel = false;
}

const getCarrierName = (carrierPartyId: string) => {
  const selectedCarrier = facilityCarriers.value.find((carrier: any) => carrier.partyId === carrierPartyId)
  return selectedCarrier && selectedCarrier.groupName ? selectedCarrier.groupName : carrierPartyId
}

const getSelectedCarrier = (carrierPartyId: string) => {
  const facilityCarrier = facilityCarriers.value.find((carrier: any) => carrier.partyId === carrierPartyId)
  return facilityCarrier ? facilityCarrier.groupName : carrierPartyId;
}

const getSelectedShipmentMethod = (shipmentMethodTypeId: string) => {
  const shippingMethod = carrierMethods.value.find((method: any) => method.shipmentMethodTypeId === shipmentMethodTypeId);
  return shippingMethod ? shippingMethod.description : shipmentMethodTypeId;
}

const openShippingMethodDocumentReference = () => {
  window.open('https://docs.hotwax.co/documents/v/system-admins/fulfillment/shipping-methods/carrier-and-shipment-methods', '_blank');
}

const shippingLabelActionPopover = async(ev: Event, currentOrder: any) => {
  const popover = await popoverController.create({
    component: ShippingLabelActionPopover,
    componentProps: {
      currentOrder: currentOrder,
    },
    event: ev,
    showBackdrop: false
  });

  return popover.present()
}

const openTrackingCodeModal = async() => {
  const addTrackingCodeModal = await modalController.create({
    component: TrackingCodeModal,
    componentProps: { carrierPartyId: carrierPartyId }
  });

  return addTrackingCodeModal.present();
}

const printPackingSlip = async (order: any) => {
  // if the request to print packing slip is not yet completed, then clicking multiple times on the button
  // should not do anything
  if(order.isGeneratingPackingSlip) {
    return;
  }

  order.isGeneratingPackingSlip = true;
  await orderStore.printPackingSlip([order.shipmentId]);
  order.isGeneratingPackingSlip = false;
}
const printPicklist = async(order: any) => {
  await orderStore.printPicklist(order.picklistId)
}

onIonViewDidEnter(async () => {
  await useUtilStore().fetchRejectReasonOptions();
  if (props.category === "open") {
    await useOrderStore().getOpenOrder({ orderId: props.orderId, shipGroupSeqId: props.shipGroupSeqId });
  } else if (props.category === "in-progress") {
    await useOrderStore().getInProgressOrder({ orderId: props.orderId, shipmentId: props.shipmentId });
  } else {
    await useOrderStore().getCompletedOrder({ orderId: props.orderId, shipmentId: props.shipmentId });
  }
  initialShipmentMethodTypeId.value = order.value?.shipmentMethodTypeId;
  await Promise.all([useUtilStore().fetchCarrierShipmentBoxTypes(), useCarrierStore().fetchFacilityCarriers(), useCarrierStore().fetchProductStoreShipmentMeths(), fetchOrderInvoicingStatus()]);
  if (facilityCarriers.value) {
    const shipmentPackageRouteSegDetail = order.value.shipmentPackageRouteSegDetails?.[0];
    carrierPartyId.value = shipmentPackageRouteSegDetail?.carrierPartyId ? shipmentPackageRouteSegDetail?.carrierPartyId : facilityCarriers.value[0].partyId;
    carrierMethods.value = await getProductStoreShipmentMethods(carrierPartyId.value);
    shipmentMethodTypeId.value = shipmentPackageRouteSegDetail?.shipmentMethodTypeId;
  }

  await fetchShipmentLabelError();

  isCODPaymentPending.value = false;
  isOrderAdjustmentPending.value = false;
  fetchCODPaymentInfo();
});

onMounted(async () => {
  const instance = commonUtil.getOmsURL().split("-")[0].replace(new RegExp("^(https|http)://"), "").replace(new RegExp("/api.*"), "").replace(new RegExp(":.*"), "");
  printDocumentsExt.value = await moduleFederationUtil.useDynamicImport({ scope: "fulfillment_extensions", module: `${instance}_PrintDocument` });
  orderInvoiceExt.value = await moduleFederationUtil.useDynamicImport({ scope: "fulfillment_extensions", module: `${instance}_OrderInvoice` });
  if (instance) {
    productCategoryFilter.value = await moduleFederationUtil.useDynamicImport({ scope: "fulfillment_extensions", module: `${instance}_ProductCategoryFilter` })
    shippingManifest.value = await moduleFederationUtil.useDynamicImport({ scope: "fulfillment_extensions", module: `${instance}_ShippingManifest` })
  }
});
</script>

<style scoped>
ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0px;
}

.box-type {
  display: flex;
  gap: var(--spacer-sm);
  border-bottom: var(--border-medium);
  padding: var(--ion-item-like-padding);
  align-items: center;
}

.box-type > ion-skeleton-text {
  width: 10%;
  height: 30px;
}

ion-segment > ion-segment-button > ion-skeleton-text, ion-item > ion-skeleton-text {
  width: 100%;
  height: 30px;
}

.order-item {
  grid-template-columns: repeat(3, 1fr);
}

.other-shipment-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.product-metadata {
  display: flex;
  flex-direction: column;
  align-items: end;
}

.shipgroup-details {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(343px, 1fr));
  gap: 10px;
  align-items: start;
}
</style>
