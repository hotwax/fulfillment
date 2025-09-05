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
            <ion-chip outline @click="copyToClipboard(order.orderId, 'Copied to clipboard')">
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
                <p>{{ translate("Ordered") }} {{ category === 'open' ? formatUtcDate(order.orderDate, 'dd MMMM yyyy hh:mm a ZZZZ') : getTime(order.orderDate) }}</p>
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
                <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ formatUtcDate(order.reservedDatetime, 'dd MMMM yyyy hh:mm a ZZZZ') }}</p>
              </ion-label>
            </div>
          </div>

          <div v-if="category === 'in-progress'">
            <div class="box-type desktop-only" v-if="!order.shipmentPackages">
              <ion-skeleton-text animated />
              <ion-skeleton-text animated />
            </div>
            <div class="box-type desktop-only" v-else-if="order.shipmentPackages">
              <ion-button :disabled="addingBoxForShipmentIds.includes(order.orderId)" @click.stop="addShipmentBox(order)" fill="outline" shape="round" size="small"><ion-icon :icon="addOutline" />
                {{ translate("Add Box") }}
              </ion-button>
              <ion-row>
                <ion-chip v-for="shipmentPackage in order.shipmentPackages" :key="shipmentPackage.shipmentId" @click.stop="updateShipmentBoxType(shipmentPackage, order, $event)">
                  {{ `Box ${shipmentPackage?.packageName}` }} {{ `| ${boxTypeDesc(getShipmentPackageType(order, shipmentPackage))}`}}
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
                  <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small"/>
                </ion-thumbnail>
                <ion-label>
                  <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                  <div>
                    {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}
                    <ion-badge class="kit-badge" color="dark" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
                  </div>
                  <p>{{ getFeatures(getProduct(item.productId).productFeatures)}}</p>
                </ion-label>
              </ion-item>
            </div>

            <div v-if="category === 'in-progress'" class="desktop-only ion-text-center" >
              <template v-if="item.rejectReason">
                <ion-chip outline color="danger" >
                  <ion-label> {{ getRejectionReasonDescription(item.rejectReason) }}</ion-label>
                  <ion-icon :icon="closeCircleOutline" @click.stop="removeRejectionReason($event, item, order)"/>
                </ion-chip>
              </template>
              <template v-else-if="isEntierOrderRejectionEnabled(order)">
                <ion-chip outline color="danger">
                  <ion-label> {{ getRejectionReasonDescription(rejectEntireOrderReasonId) ? getRejectionReasonDescription(rejectEntireOrderReasonId) : translate('Reject to avoid order split (no variance)')}}</ion-label>
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

            <!-- In completed and inprogress category we only have two items in product item while css needs 3 hence adding an empty div. -->
            <div v-else></div>

            <!-- TODO: add a spinner if the api takes too long to fetch the stock -->
             <!--Adding checks to avoid any operations if order has missing info, mostly when after packing Solr is not updaing immediately-->
            <div class="product-metadata">
              <ion-note v-if="getProductStock(item.productId).qoh" class="ion-padding-end">{{ getProductStock(item.productId).qoh }} {{ translate('pieces in stock') }}</ion-note>
              <ion-button color="medium" fill="clear" v-else size="small" @click="fetchProductStock(item.productId)">
                {{ translate('Check stock') }}
                <ion-icon slot="end" :icon="cubeOutline"/>
              </ion-button>
              <!-- TODO make functional -->
              <ion-button v-if="category === 'in-progress'" @click="openRejectReasonPopover($event, item, order)" class="desktop-only" color="danger" fill="clear" size="small">
                {{ translate('Report an issue') }}
                <ion-icon slot="end" :icon="trashBinOutline"/>
              </ion-button>
              <ion-button v-if="isKit(item)" fill="clear" color="medium" size="small" @click.stop="fetchKitComponent(item)">
                {{ translate('Components') }}
                <ion-icon v-if="item.showKitComponents" color="medium" slot="end" :icon="chevronUpOutline"/>
                <ion-icon v-else color="medium" slot="end" :icon="listOutline"/>
              </ion-button>
              <ion-button v-if="item.productTypeId === 'GIFT_CARD'" fill="clear" color="medium" size="small" @click="openGiftCardActivationModal(item)">
                {{ translate('Gift card') }}
                <ion-icon color="medium" slot="end" :icon="item.isGCActivated ? gift : giftOutline"/>
              </ion-button>
            </div>
            </div>
            <div v-if="item.showKitComponents && getProduct(item.productId)?.productComponents" class="kit-components">
              <ion-card v-for="(productComponent, index) in getProduct(item.productId).productComponents" :key="index">
                <ion-item lines="none">
                  <ion-thumbnail slot="start" v-image-preview="getProduct(productComponent.productIdTo)" :key="getProduct(productComponent.productIdTo)?.mainImageUrl">
                    <DxpShopifyImg :src="getProduct(productComponent.productIdTo).mainImageUrl" size="small"/>
                  </ion-thumbnail>
                  <ion-label>
                    <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(productComponent.productIdTo)) }}</p>
                    <div>
                      {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) : productComponent.productIdTo }}
                    </div>
                    <p>{{ getFeatures(getProduct(productComponent.productIdTo).productFeatures)}}</p>
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
              <ion-button :disabled="isShipNowDisabled || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || ((isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode) && !hasPermission(Actions.APP_FORCE_SHIP_ORDER))" fill="clear" >{{ translate("Ship Now") }}</ion-button>
              <ion-button slot="end" fill="clear" color="medium" @click.stop="shippingPopover">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </ion-item>
          </div>

          <div class="actions">
            <!-- positive -->
            <div>
              <template v-if="category === 'in-progress'">
                <ion-button :color="order.hasAllRejectedItem ? 'danger' : ''" @click="packOrder(order)">
                  <ion-icon slot="start" :icon="archiveOutline" />
                  {{ translate(order.hasAllRejectedItem ? "Reject order" : order.hasRejectedItem ? "Save and Pack Order" : "Pack order") }}
                </ion-button>
                <Component :is="printDocumentsExt" :category="category" :order="order" :currentFacility="currentFacility" :hasMissingInfo="order.missingLabelImage"/>
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
                <ion-button v-else :disabled="isShipNowDisabled || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || ((isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode) && !hasPermission(Actions.APP_FORCE_SHIP_ORDER))" @click.stop="shipOrder(order)">
                  <ion-icon slot="start" :icon="bagCheckOutline" />
                  {{ translate("Ship order") }}
                </ion-button>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" fill="outline" @click.stop="printPackingSlip(order)">
                  {{ translate("Print Customer Letter") }}
                  <ion-spinner data-spinner-size="medium" color="primary" slot="end" v-if="order.isGeneratingPackingSlip" name="crescent" />
                </ion-button>
              </div>
            </div>
            <!-- negative -->
            <div class="desktop-only" v-if="category === 'completed'">
              <ion-button :disabled="isUnpackDisabled || !hasPermission(Actions.APP_UNPACK_ORDER) || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || !hasPackedShipments(order)" fill="outline" color="danger" @click.stop="unpackOrder(order)">{{ translate("Unpack") }}</ion-button>
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
              <ion-select :disabled="!order.missingLabelImage || !hasPermission(Actions.APP_ORDER_SHIPMENT_METHOD_UPDATE)" :label="translate('Carrier')" v-model="carrierPartyId" interface="popover" @ionChange="updateCarrierAndShippingMethod(carrierPartyId, '')" :selected-text="getSelectedCarrier(carrierPartyId)">
                <ion-select-option v-for="carrier in facilityCarriers" :key="carrier.partyId" :value="carrier.partyId">{{ translate(carrier.groupName) }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <template v-if="carrierMethods && carrierMethods.length > 0">
                <ion-select :disabled="!order.missingLabelImage || !hasPermission(Actions.APP_ORDER_SHIPMENT_METHOD_UPDATE)" :label="translate('Method')" v-model="shipmentMethodTypeId" interface="popover" @ionChange="updateCarrierAndShippingMethod(carrierPartyId, shipmentMethodTypeId)" :selected-text="getSelectedShipmentMethod(shipmentMethodTypeId)">
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
              <ion-item lines="none" v-if="shipmentLabelErrorMessages">
                <ion-label class="ion-text-wrap">
                  <p class=overline>{{ translate("Error Log") }}</p>
                  {{ shipmentLabelErrorMessages }}
                </ion-label>
              </ion-item>
              <template v-if="category === 'completed'">
                <ion-button :disabled="!shipmentMethodTypeId || !hasPackedShipments(order)" fill="outline" expand="block" class="ion-margin" @click.stop="regenerateShippingLabel(order)">
                  {{ shipmentLabelErrorMessages ? translate("Retry Label") : translate("Generate Label") }}
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

          <Component v-if="hasPermission(Actions.APP_INVOICING_STATUS_VIEW)" :is="orderInvoiceExt" :category="category" :order="order" :userProfile="userProfile" :maargBaseUrl="getMaargBaseUrl" :userToken="getUserToken" />
        </div>
        
        <h4 class="ion-padding-top ion-padding-start" v-if="order.otherShipGroups?.length">{{ translate('Other shipments in this order') }}</h4>
        <div class="shipgroup-details">
          <ion-card v-for="shipGroup in order.otherShipGroups" :key="shipGroup.shipmentId">
            <ion-card-header>
              <div>
                <ion-card-subtitle class="overline">{{ getfacilityTypeDesc(shipGroup.facilityTypeId) }}</ion-card-subtitle>
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
              {{ getPartyName(shipGroup.carrierPartyId) }}
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
                <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                <div>
                  {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}
                  <ion-badge class="kit-badge" color="dark" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
                </div>
              </ion-label>
              
              <div class="other-shipment-actions">
                <!-- TODO: add a spinner if the api takes too long to fetch the stock -->
                <ion-note slot="end" v-if="getProductStock(item.productId, item.facilityId).qoh">{{ getProductStock(item.productId, item.facilityId).qoh }} {{ translate('pieces in stock') }}</ion-note>
                <ion-button slot="end" fill="clear" v-else size="small" @click.stop="fetchProductStock(item.productId, item.facilityId)">
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

<script lang="ts">
import {
  alertController,
  IonBadge,
  IonBackButton,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCheckbox,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonNote,
  IonPage,
  IonRow,
  IonSkeletonText,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  IonThumbnail,
  modalController,
  popoverController
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import { useRouter } from 'vue-router'
import {
  addOutline,
  archiveOutline,
  bagCheckOutline,
  caretDownOutline,
  cashOutline,
  chevronUpOutline,
  closeCircleOutline,
  cubeOutline,
  documentTextOutline,
  ellipsisVerticalOutline,
  fileTrayOutline,
  gift,
  giftOutline,
  informationCircleOutline,
  listOutline,
  locateOutline,
  personAddOutline,
  pricetagOutline,
  trashBinOutline,
  ribbonOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';
import { getProductIdentificationValue, translate, DxpShopifyImg, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components';
import { copyToClipboard, formatUtcDate, getFeatures, getFacilityFilter, showToast } from '@/utils'
import { Actions, hasPermission } from '@/authorization'
import OrderActionsPopover from '@/components/OrderActionsPopover.vue'
import emitter from '@/event-bus';
import { OrderService } from "@/services/OrderService";
import { hasError } from "@/adapter";
import logger from '@/logger';
import { UtilService } from "@/services/UtilService";
import { DateTime } from 'luxon';
import { prepareOrderQuery, prepareSolrQuery } from '@/utils/solrHelper';
import Popover from '@/views/ShippingPopover.vue'
import PackagingPopover from "@/views/PackagingPopover.vue";
import AssignPickerModal from '@/views/AssignPickerModal.vue';
import ShipmentBoxTypePopover from '@/components/ShipmentBoxTypePopover.vue'
import ShipmentBoxPopover from '@/components/ShipmentBoxPopover.vue'
import ReportIssuePopover from '@/components/ReportIssuePopover.vue'
import { isKit, retryShippingLabel } from '@/utils/order'
import ScanOrderItemModal from "@/components/ScanOrderItemModal.vue";
import ShippingLabelActionPopover from '@/components/ShippingLabelActionPopover.vue';
import GenerateTrackingCodeModal from '@/components/GenerateTrackingCodeModal.vue';
import TrackingCodeModal from '@/components/TrackingCodeModal.vue';
import GiftCardActivationModal from '@/components/GiftCardActivationModal.vue';
import { useDynamicImport } from "@/utils/moduleFederation";
import OrderAdjustmentModal from "@/components/OrderAdjustmentModal.vue";

export default defineComponent({
  name: "OrderDetail",
  props: ['category', 'orderId', 'shipGroupSeqId', 'shipmentId'],
  components: {
    DxpShopifyImg,
    IonBackButton,
    IonBadge,
    IonButton,
    IonCard,
    IonCheckbox,
    IonChip,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonNote,
    IonPage,
    IonRow,
    IonSkeletonText,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTitle,
    IonToolbar,
    IonThumbnail
  },
  computed: {
    ...mapGetters({
      boxTypeDesc: 'util/getShipmentBoxDesc',
      completedOrders: 'order/getCompletedOrders',
      getProduct: 'product/getProduct',
      getProductStock: 'stock/getProductStock',
      inProgressOrders: 'order/getInProgressOrders',
      order: "order/getCurrent",
      rejectReasonOptions: 'util/getRejectReasonOptions',
      userPreference: 'user/getUserPreference',
      getPartyName: 'util/getPartyName',
      getfacilityTypeDesc: 'util/getFacilityTypeDesc',
      getPaymentMethodDesc: 'util/getPaymentMethodDesc',
      getStatusDesc: 'util/getStatusDesc',
      productStoreShipmentMethCount: 'util/getProductStoreShipmentMethCount',
      partialOrderRejectionConfig: 'user/getPartialOrderRejectionConfig',
      collateralRejectionConfig: 'user/getCollateralRejectionConfig',
      affectQohConfig: 'user/getAffectQohConfig',
      excludeOrderBrokerDays: "util/getExcludeOrderBrokerDays",
      isForceScanEnabled: 'util/isForceScanEnabled',
      productStoreShipmentMethods: 'carrier/getProductStoreShipmentMethods',
      facilityCarriers: 'carrier/getFacilityCarriers',
      userProfile: 'user/getUserProfile',
      isShipNowDisabled: 'user/isShipNowDisabled',
      isUnpackDisabled: 'user/isUnpackDisabled',
      instanceUrl: "user/getInstanceUrl",
      carrierShipmentBoxTypes: 'util/getCarrierShipmentBoxTypes',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc',
      getUserToken: 'user/getUserToken',
      getMaargBaseUrl: 'user/getMaargBaseUrl'
    })
  },
  data() {
    return {
      carrierPartyIds: [] as Array<any>,
      shipmentMethods: [] as Array<any>,
      picklists: [] as any,
      addingBoxForShipmentIds: [] as any,
      defaultShipmentBoxType: {} as any,
      itemsIssueSegmentSelected: [] as any,
      statusColor: {
        'PAYMENT_AUTHORIZED': '',
        'PAYMENT_CANCELLED': 'warning',
        'PAYMENT_DECLINED': 'warning',
        'PAYMENT_NOT_AUTH': 'warning',
        'PAYMENT_NOT_RECEIVED': 'warning',
        'PAYMENT_RECEIVED': '',
        'PAYMENT_REFUNDED': 'warning',
        'PAYMENT_SETTLED': ''
      } as any,
      rejectEntireOrderReasonId: "REJ_AVOID_ORD_SPLIT",
      shipmentLabelErrorMessages: "",
      shipmentMethodTypeId: "",
      carrierPartyId: "",
      carrierMethods:[] as any,
      isUpdatingCarrierDetail: false,
      orderInvoicingInfo: {} as any,
      orderInvoiceExt: "" as any,
      isCODPaymentPending: false,
      isOrderAdjustmentPending: false,
      orderAdjustments: [],
      orderHeaderAdjustmentTotal: 0,
      adjustmentsByGroup: {} as any,
      orderAdjustmentShipmentId: "",
      printDocumentsExt: "" as any
    }
  },
  async ionViewDidEnter() {
    this.store.dispatch('util/fetchRejectReasonOptions')
    this.category === 'open'
    ? await this.store.dispatch('order/getOpenOrder', { orderId: this.orderId, shipGroupSeqId: this.shipGroupSeqId})
    : this.category === 'in-progress'
    ? await this.store.dispatch('order/getInProgressOrder', { orderId: this.orderId, shipmentId: this.shipmentId })
    : await this.store.dispatch('order/getCompletedOrder', { orderId: this.orderId, shipmentId: this.shipmentId })
    await Promise.all([this.store.dispatch('util/fetchCarrierShipmentBoxTypes'), this.store.dispatch('carrier/fetchFacilityCarriers'), this.store.dispatch('carrier/fetchProductStoreShipmentMeths'), this.fetchOrderInvoicingStatus()]);
    if (this.facilityCarriers) {
      const shipmentPackageRouteSegDetail = this.order.shipmentPackageRouteSegDetails?.[0];
      this.carrierPartyId = shipmentPackageRouteSegDetail?.carrierPartyId ? shipmentPackageRouteSegDetail?.carrierPartyId : this.facilityCarriers[0].partyId;
      this.carrierMethods = await this.getProductStoreShipmentMethods(this.carrierPartyId);
      this.shipmentMethodTypeId = shipmentPackageRouteSegDetail?.shipmentMethodTypeId;
    }
    
    // Fetching shipment label errors 
    await this.fetchShipmentLabelError()

    this.isCODPaymentPending = false
    this.isOrderAdjustmentPending = false
    this.fetchCODPaymentInfo();
},
  async mounted() {
    // Remove http://, https://, /api, or :port
    const instance = this.instanceUrl.split("-")[0].replace(new RegExp("^(https|http)://"), "").replace(new RegExp("/api.*"), "").replace(new RegExp(":.*"), "")
    this.printDocumentsExt = await useDynamicImport({ scope: "fulfillment_extensions", module: `${instance}_PrintDocument`})
    this.orderInvoiceExt = await useDynamicImport({ scope: "fulfillment_extensions", module: `${instance}_OrderInvoice`})
  },
  methods: {
    getTime(time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
    async fetchShipmentLabelError() {
      const shipmentId = this.order?.shipmentId
      const labelErrors = await OrderService.fetchShipmentLabelError(shipmentId);
      if (labelErrors && labelErrors.length) {
        this.shipmentLabelErrorMessages = labelErrors.join(', ');
      }
    },
    getCarrierName(carrierPartyId: string) {
      const selectedCarrier = this.facilityCarriers.find((carrier: any) => carrier.partyId === carrierPartyId)
      return selectedCarrier && selectedCarrier.groupName ? selectedCarrier.groupName : carrierPartyId
    },
    openShippingMethodDocumentReference() {
      window.open('https://docs.hotwax.co/documents/v/system-admins/fulfillment/shipping-methods/carrier-and-shipment-methods', '_blank');
    },
    async getProductStoreShipmentMethods(carrierPartyId: string) { 
      return this.productStoreShipmentMethods?.filter((method: any) => method.partyId === carrierPartyId) || [];
    },
    async shippingLabelActionPopover(ev: Event, currentOrder: any) {
      const popover = await popoverController.create({
        component: ShippingLabelActionPopover,
        componentProps: {
          currentOrder: currentOrder,
        },
        event: ev,
        showBackdrop: false
      });

      return popover.present()
    },
    async updateCarrierAndShippingMethod(carrierPartyId: string, shipmentMethodTypeId: string) {
      let resp;
      try {
        emitter.emit("presentLoader");
        this.isUpdatingCarrierDetail = true;
        const carrierShipmentMethods = await this.getProductStoreShipmentMethods(carrierPartyId);
        shipmentMethodTypeId = shipmentMethodTypeId ? shipmentMethodTypeId : carrierShipmentMethods?.[0]?.shipmentMethodTypeId;
        const shipmentRouteSegmentId = this.order?.shipmentPackageRouteSegDetails[0]?.shipmentRouteSegmentId
        const isTrackingRequired = carrierShipmentMethods.find((method: any) => method.shipmentMethodTypeId === shipmentMethodTypeId)?.isTrackingRequired

        const params = {
          shipmentId: this.order.shipmentId,
          shipmentRouteSegmentId,
          shipmentMethodTypeId : shipmentMethodTypeId ? shipmentMethodTypeId : "",
          carrierPartyId,
          isTrackingRequired: isTrackingRequired ? isTrackingRequired : "Y"
        }

        resp = await OrderService.updateShipmentCarrierAndMethod(params)
        if (!hasError(resp)) {
          this.shipmentMethodTypeId = shipmentMethodTypeId
          emitter.emit("dismissLoader");
          showToast(translate("Shipment method detail updated successfully."))
          
          //fetching updated shipment packages
          await this.store.dispatch('order/updateShipmentPackageDetail', this.order) 
          this.carrierMethods = carrierShipmentMethods;
          this.isUpdatingCarrierDetail = false;
        } else {
          throw resp.data;
        }
        
      } catch (err) {
        this.isUpdatingCarrierDetail = false;
        this.carrierPartyId = this.order.shipmentPackages?.[0].carrierPartyId;
        this.shipmentMethodTypeId = this.order.shipmentPackages?.[0].shipmentMethodTypeId;

        emitter.emit("dismissLoader");
        logger.error('Failed to update carrier and method', err);
        showToast(translate("Failed to update shipment method detail."));
      }
    },
    async updateCarrierShipmentDetails(carrierPartyId: string, shipmentMethodTypeId: string) {
      this.carrierPartyId = carrierPartyId
      this.shipmentMethodTypeId = shipmentMethodTypeId
      this.carrierMethods = await this.getProductStoreShipmentMethods(carrierPartyId);
      this.shipmentLabelErrorMessages = ""
    },
    async fetchKitComponent(orderItem: any, isOtherShipment = false ) {
      await this.store.dispatch('product/fetchProductComponents', { productId: orderItem.productId })
      
      //update the order in order to toggle kit components section
      if (isOtherShipment) {
        const updatedShipGroup = this.order?.shipGroups.find((shipGroup: any) => shipGroup.shipGroupSeqId === orderItem.shipGroupSeqId)
        if (updatedShipGroup){
          const updatedItem = updatedShipGroup?.items.find((item: any) => item.orderItemSeqId === orderItem.orderItemSeqId)
          updatedItem.showKitComponents = orderItem.showKitComponents ? false : true
        }
      } else {
        const updatedItem = this.order.items.find((item: any) => item.orderItemSeqId === orderItem.orderItemSeqId)
        updatedItem.showKitComponents = orderItem.showKitComponents ? false : true
        if (!updatedItem.kitComponents) {
          updatedItem.kitComponents = this.getProduct(updatedItem.productId).productComponents.map((productComponent: any) => productComponent.productIdTo)
        }
      }
    },
    getRejectionReasonDescription (rejectionReasonId: string) {
      const reason = this.rejectReasonOptions?.find((reason: any) => reason.enumId === rejectionReasonId)
      return reason?.description ? reason.description : reason?.enumDescription ? reason.enumDescription : reason?.enumId;
    },
    isEntierOrderRejectionEnabled(order: any) {
      return (!this.partialOrderRejectionConfig || !this.partialOrderRejectionConfig.settingValue || !JSON.parse(this.partialOrderRejectionConfig.settingValue)) && order.hasRejectedItem
    },
    async printPicklist (order: any) {
      await OrderService.printPicklist(order.picklistId)
    },
    async openShipmentBoxPopover(ev: Event, item: any, order: any, kitProducts?: any, orderItemSeqId?: number) {
      const popover = await popoverController.create({
        component: ShipmentBoxPopover,
        componentProps: { 
          shipmentPackages: order.shipmentPackages
        },
        showBackdrop: false,
        event: ev
      });

      popover.present();

      const result = await popover.onDidDismiss();

      if (result.data && item.selectedBox !== result.data) {
        order.items.map((orderItem: any) => {
          if(orderItem.orderItemSeqId === item.orderItemSeqId) {
            orderItem.selectedBox = result.data
          }
        })
        }
      return result.data;
    },
    async orderActionsPopover(order: any, ev: Event) {
      const popover = await popoverController.create({
        component: OrderActionsPopover,
        componentProps: { order },
        showBackdrop: false,
        event: ev
      });
      return popover.present();
    },
    fetchProductStock(productId: string, facilityId = '') {
      this.store.dispatch('stock/fetchStock', { productId, facilityId })
    },
    async packOrder(order: any) {
      if (order.hasRejectedItem) {
        const itemsToReject = order.items.filter((item: any) => item.rejectReason)
        this.reportIssue(order, itemsToReject);
        return;
      }
      this.initiatePackOrder(order);
    },
    async initiatePackOrder(order: any, updateParameter?: string) {
      let forceScan = this.isForceScanEnabled;
      if (this.isEntierOrderRejectionEnabled(order)) {
        //no need to scan when all the items are going to reject when partial order rejection is not allowed
        forceScan = false
      } else if (forceScan) {
        //no need to scan when all the items are going to reject
        forceScan = !order.items.every((item: any) => item.rejectReason)
      }

      if (order.hasAllRejectedItem) {
        const isSuccess = await this.rejectEntireOrder(order, updateParameter)
        if (isSuccess) {
          this.router.push('/in-progress')
        }
      } else if (forceScan) {
        await this.scanOrder(order, updateParameter)
      } else {
        await this.confirmPackOrder(order, updateParameter);
      }
    },
    async rejectEntireOrder(order: any, updateParameter?: string) {
      emitter.emit('presentLoader');
      try {
        const updatedOrderDetail = await this.getUpdatedOrderDetail(order, updateParameter)
        const params = {
          shipmentId: order.shipmentId,
          orderId: order.orderId,
          facilityId: order.originFacilityId,
          rejectedOrderItems: updatedOrderDetail.rejectedOrderItems
        }
        const resp = await OrderService.packOrder(params);

        if (hasError(resp)) {
          throw resp.data
        }

        // await Promise.all([this.fetchPickersInformation(), this.updateOrderQuery("", "", true)]);
        showToast(translate('Order rejected successfully'));
        return true;
      } catch (err) {
        logger.error('Failed to reject order', err)
        showToast(translate('Failed to reject order'))
      } finally {
        emitter.emit("dismissLoader");
      }
      return false
    },
    async confirmPackOrder(order: any, updateParameter?: string, trackingCode?: string) {
      const confirmPackOrder = await alertController
        .create({
          header: translate("Pack order"),
          message: translate("You are packing an order. Select additional documents that you would like to print.", {space: '<br /><br />'}),
          inputs: [{
            name: 'printShippingLabel',
            type: 'checkbox',
            label: translate('Shipping labels'),
            value: 'printShippingLabel',
            checked: this.userPreference.printShippingLabel,
          }, {
            name: 'printPackingSlip',
            type: 'checkbox',
            label: translate('Packing slip'),
            value: 'printPackingSlip',
            checked: this.userPreference.printPackingSlip
          }],
          buttons: [{
            text: translate("Cancel"),
            role: 'cancel'
          }, {
            text: translate("Pack"),
            role: 'confirm',
            handler: async (data) => {
              const packingResponse = await this.executePackOrder(order, updateParameter, trackingCode, data)
              if (!packingResponse.isPacked) {
                //On error in packing, fetching update detail expecially to fetch carrier, shipment method, gteway message etc. If there is error (gatewayMessage not empty) opening Generate tracking code modal to enter tracking detail manually
                const updatedOrder = await this.store.dispatch('order/updateShipmentPackageDetail', order)
                await this.generateTrackingCodeForPacking(updatedOrder, updateParameter, data, packingResponse.errors)
              }
            }
          }]
        });
      return confirmPackOrder.present();
    },
    async executePackOrder(order: any, updateParameter?: string, trackingCode?: string, documentOptions?: any) {
      emitter.emit('presentLoader');
      let toast: any;
      const shipmentIds = [order.shipmentId]
      const manualTrackingCode = trackingCode

      try {
        const updatedOrderDetail = await this.getUpdatedOrderDetail(order, updateParameter) as any
        const params = {
          shipmentId: order.shipmentId,
          orderId: order.primaryOrderId,
          facilityId: order.originFacilityId,
          rejectedOrderItems: updatedOrderDetail.rejectedOrderItems,
          shipmentPackageContents: updatedOrderDetail.shipmentPackageContents,
          trackingCode: manualTrackingCode
        }

        const resp = await OrderService.packOrder(params);
        if (hasError(resp)) {
          throw resp.data
        }
        await this.store.dispatch('order/updateShipmentPackageDetail', this.order)
        const shippingLabelPdfUrls: string[] = Array.from(
          new Set(
            (this.order.shipmentPackages ?? [])
              .filter((shipmentPackage: any) => shipmentPackage.labelImageUrl)
              .map((shipmentPackage: any) => shipmentPackage.labelImageUrl)
          )
        );

        emitter.emit('dismissLoader');

        if (documentOptions.length) {
          // additional parameters for dismiss button and manual dismiss ability
          toast = await showToast(translate('Order packed successfully. Document generation in process'), { canDismiss: true, manualDismiss: true })
          toast.present()

          if (documentOptions.includes('printPackingSlip') && documentOptions.includes('printShippingLabel')) {
            if (shippingLabelPdfUrls && shippingLabelPdfUrls.length > 0) {
              await OrderService.printPackingSlip(shipmentIds)
              await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls, order.shipmentPackages);
            } else {
              await OrderService.printShippingLabelAndPackingSlip(shipmentIds, order.shipmentPackages)
            }
          } else if (documentOptions.includes('printPackingSlip')) {
            await OrderService.printPackingSlip(shipmentIds)
          } else if (documentOptions.includes('printShippingLabel') && !manualTrackingCode && !this.order.missingLabelImage) {
            await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls, order.shipmentPackages);
          }
          if (order.shipmentPackages?.[0].internationalInvoiceUrl) {
            await OrderService.printCustomDocuments([order.shipmentPackages?.[0].internationalInvoiceUrl]);
          }

          toast.dismiss()
        } else {
          showToast(translate('Order packed successfully'));
        }
        this.router.replace(`/completed/shipment-detail/${this.orderId}/${this.shipmentId}`)
        return {isPacked: true}
      } catch (err: any) {
        // in case of error, if loader and toast are not dismissed above
        if (toast) toast.dismiss()
        emitter.emit('dismissLoader');
        showToast(translate('Failed to pack order'))
        logger.error('Failed to pack order', err)
        return {isPacked: false, errors: err?.response?.data?.errors}
      } finally {
        emitter.emit("dismissLoader");
      }
    },
    async fetchPickersInformation() {
      const payload = {
          shipmentMethodTypeId: 'STOREPICKUP',
          shipmentMethodTypeId_not: 'Y',
          shipmentMethodTypeId_op: 'equals',
          facilityId: this.currentFacility?.facilityId,
          statusId: 'PICKLIST_ASSIGNED',
          pageIndex: 0,
          pageSize: 50
      }
      try {
        const resp = await OrderService.fetchPicklists(payload);
        if(!hasError(resp)) {

          this.picklists = resp.data.map((picklist: any) => {
            picklist.roles = picklist.roles.filter((role: any) => !role.thruDate)

            let pickersName = (picklist?.roles ?? [])
              .map((role:any) => {
                if (role?.person) {
                  return `${role.person.firstName} ${role.person.lastName}`;
                } else if (role?.partyGroup) {
                  return role.partyGroup.groupName;
                }
                return null;
              })
              .filter(Boolean)
              .join(", ") ?? ""; 

            let pickerIds = (picklist?.roles ?? []).map((role:any) => role?.partyId) ?? [];

            return {
              ...picklist,
              id: picklist.picklistId,
              pickersName,
              pickerIds,
              date: picklist.picklistDate ? DateTime.fromMillis(picklist?.picklistDate).toLocaleString(DateTime.TIME_SIMPLE) : null,
            };
          });
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Failed to fetch picklists', err)
      }
    },
    async updateOrderQuery(size?: any, queryString?: any) {
      const inProgressOrdersQuery = JSON.parse(JSON.stringify(this.inProgressOrders.query))

      size && (inProgressOrdersQuery.viewSize = size)
      queryString && (inProgressOrdersQuery.queryString = '')
      inProgressOrdersQuery.viewIndex = 0 // If the size changes, list index should be reintialised
      await this.store.dispatch('order/updateInProgressQuery', { ...inProgressOrdersQuery })
    },
    async packagingPopover(ev: Event) {
      const popover = await popoverController.create({
        component: PackagingPopover,
        event: ev,
        translucent: true,
        showBackdrop: false,
      });
      return popover.present();
    },
    async openRejectReasonPopover(ev: Event, item: any, order: any, kitProducts?: any) {
      const reportIssuePopover = await popoverController.create({
        component: ReportIssuePopover,
        event: ev,
        translucent: true,
        showBackdrop: false,
      });

      reportIssuePopover.present();

      const result = await reportIssuePopover.onDidDismiss();

      if(result.data) {
        order.items.map((orderItem: any) => {
          if(orderItem.orderItemSeqId === item.orderItemSeqId) {
            orderItem.rejectReason = result.data
          }
        })
        order.hasRejectedItem = true
        order.hasAllRejectedItem = this.isEntierOrderRejectionEnabled(order) || order.items.every((item: any) => item.rejectReason)

        /*
        Commenting this out to avoid directly updating items. Now user need to click on the save button to save the detail.
        const itemsToReject = order.items.filter((item: any) => item.rejectReason)
        this.reportIssue(order, itemsToReject)*/
      }
    },
    async removeRejectionReason(ev: Event, item: any, order: any) {
      delete item["rejectReason"];
      delete item["kitComponents"];

      item.rejectReason = "";
        order.items.map((orderItem: any) => {
          if(orderItem.orderItemSeqId === item.orderItemSeqId) {
            delete orderItem["rejectReason"];
            delete orderItem["kitComponents"];
          }
        })
        order.hasRejectedItem = order.items.some((item:any) => item.rejectReason);
        order.hasAllRejectedItem = this.isEntierOrderRejectionEnabled(order) || order.items.every((item: any) => item.rejectReason)
    },
    rejectKitComponent(order: any, item: any, componentProductId: string) {
      let kitComponents = item.kitComponents ? item.kitComponents : []
      if (kitComponents.includes(componentProductId)) {
        kitComponents = kitComponents.filter((rejectedComponent: any) => rejectedComponent !== componentProductId)
      } else {
        kitComponents.push(componentProductId);
      }
      item.kitComponents = kitComponents;
      order.items.map((orderItem: any) => {
        if (orderItem.orderItemSeqId === item.orderItemSeqId) {
          orderItem.kitComponents = kitComponents;
        }
      })
    },
    async assignPickers() {
      const assignPickerModal = await modalController.create({
        component: AssignPickerModal,
        componentProps: { order: this.order }
      });

      // dismissing the popover once the picker modal is closed
      assignPickerModal.onDidDismiss().then((result: any) => {
        popoverController.dismiss();
        // redirect to in-progress page only when we have picklist created successfully for the order
        if (result?.data?.value?.picklistId && result?.data?.value?.shipmentIds && result?.data?.value?.shipmentIds.length) {
          let newShipmentId = this.shipmentId
          if (!newShipmentId) {
            newShipmentId = result?.data?.value?.shipmentIds[0]
          }
          this.router.replace(`/in-progress/shipment-detail/${this.orderId}/${newShipmentId}`)
        }
      });

      return assignPickerModal.present();
    },
    getShipmentPackageType(order: any, shipmentPackage: any) {
      let packageType = shipmentPackage.shipmentBoxTypeId;
      if (!packageType) {
        const shipmentBoxTypes = this.getShipmentBoxTypes(order.carrierPartyId);
        packageType = shipmentBoxTypes[0];
      }
      return packageType;
    },
    getShipmentBoxTypes(carrierPartyId: string) {
      return this.carrierShipmentBoxTypes[carrierPartyId] ? this.carrierShipmentBoxTypes[carrierPartyId] : [];
    },
    async regenerateShippingLabel(order: any) {
      // If there are no product store shipment method configured, then not generating the label and displaying an error toast
      if(this.productStoreShipmentMethCount <= 0) {
        showToast(translate('Unable to generate shipping label due to missing product store shipping method configuration'))
        return;
      }


      // if the request to print shipping label is not yet completed, then clicking multiple times on the button
      // should not do anything
      if(order.isGeneratingShippingLabel) {
        return;
      }

      order.isGeneratingShippingLabel = true;

      if(order.missingLabelImage) {
        const response = await this.retryShippingLabel(order)
        if(response?.isGenerated) {
          await this.printShippingLabel(response.order)
        } else {
          this.fetchShipmentLabelError()
        }
      } else {
        await this.printShippingLabel(order)
      }

      this.order.isGeneratingShippingLabel = false;
    },
    async initialiseOrderQuery() {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))
      completedOrdersQuery.viewIndex = 0 // If the size changes, list index should be reintialised
      completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      await this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
    },
    async shippingPopover(ev: Event) {
      const popover = await popoverController.create({
        component: Popover,
        event: ev,
        translucent: true,
        showBackdrop: false,
      });
      return popover.present();
    },
    async printShippingLabel(order: any) {
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
        showToast(translate('Failed to generate shipping label'))
        return;
      }

      await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls, order.shipmentPackages)
      if (internationalInvoiceUrls.length) {
        await OrderService.printCustomDocuments([internationalInvoiceUrls[0]]);
      }
    },
    async addShipmentBox(order: any) {
      this.addingBoxForShipmentIds.push(order.shipmentId)

      const { carrierPartyId, shipmentMethodTypeId } = order
      
      if(!Object.keys(this.defaultShipmentBoxType).length) {
        this.defaultShipmentBoxType = await this.fetchDefaultShipmentBox();
      }

      let packageName = "A";
      const packageNames = order?.shipmentPackages.
          filter((shipmentPackage:any) => shipmentPackage.packageName).
          map((shipmentPackage:any) => shipmentPackage.packageName);
      if (packageNames && packageNames.length) {
          packageNames.sort((a:any, b:any) => b.localeCompare(a));
          packageName = String.fromCharCode(packageNames[0].charCodeAt(0) + 1);
      }

      const params = {
        shipmentId: order.shipmentId,
        shipmentBoxTypeId: this.defaultShipmentBoxType?.shipmentBoxTypeId,
        boxLength	: this.defaultShipmentBoxType?.boxLength,
        boxHeight	: this.defaultShipmentBoxType?.boxHeight,
        boxWidth	: this.defaultShipmentBoxType?.boxWidth,
        weightUomId :	this.defaultShipmentBoxType?.weightUomId,
        dimensionUomId : this.defaultShipmentBoxType?.dimensionUomId,
        packageName,
        dateCreated: DateTime.now().toMillis()
      } as any

      carrierPartyId && (params['carrierPartyId'] = carrierPartyId)
      shipmentMethodTypeId && (params['shipmentMethodTypeId'] = shipmentMethodTypeId)

      try {
        const resp = await OrderService.addShipmentBox(params)

        if(!hasError(resp)) {
          showToast(translate('Box added successfully'))
          await this.store.dispatch('order/getInProgressOrder', { orderId: this.orderId, shipmentId: this.shipmentId})
          this.store.dispatch('order/updateInProgressOrder', this.order);
        } else {
          throw resp.data
        }
      } catch (err) {
        showToast(translate('Failed to add box'))
        logger.error('Failed to add box', err)
      }
      this.addingBoxForShipmentIds.splice(this.addingBoxForShipmentIds.indexOf(order.shipmentId), 1)
    },
    async updateShipmentBoxType(shipmentPackage: any, order: any, ev: CustomEvent) {
      // Don't open popover when not having shipmentBoxTypes available
      const shipmentBoxTypes = this.getShipmentBoxTypes(order.carrierPartyId)
      if (!shipmentBoxTypes.length) {
        logger.error('Failed to fetch shipment box types')
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
        this.store.dispatch('order/updateInProgressOrder', order);
      }
    },
    async fetchDefaultShipmentBox() {
      let defaultBoxTypeId = 'YOURPACKNG'
      let defaultBoxType = {}

      try {
        let resp = await UtilService.fetchDefaultShipmentBox({
          systemResourceId: "shipment",
          systemPropertyId: "shipment.default.boxtype",
          fieldsToSelect: ["systemPropertyValue", "systemResourceId"],
          pageSize: 1
        })

        if(!hasError(resp)) {
          defaultBoxTypeId = resp.data?.[0].systemPropertyValue
        } else {
          throw resp.data
        }
        
        const payload = {
          "shipmentBoxTypeId": defaultBoxTypeId,
          "pageSize": 1
        }
        resp = await UtilService.fetchShipmentBoxType(payload);
        if (!hasError(resp)) {
          defaultBoxType = resp.data[0];
        }
      } catch (err) {
        logger.error('Failed to fetch default shipment box type information', err)
      }

      return defaultBoxType;
    },
    async reportIssue(order: any, itemsToReject: any) {
      // finding is there any item that is `out of stock` as we need to display the message accordingly
      const outOfStockItem = itemsToReject.find((item: any) => item.rejectReason === 'NOT_IN_STOCK')

      // TODO: update alert message when itemsToReject contains a single item and also in some specific conditions
      let message;
      if (!outOfStockItem) {

        // This variable is used in messages to display name of first rejected item from the itemsToReject array
        const rejectedItem = itemsToReject[0];
        if (itemsToReject.length === 1) {
          const rejectionReason = this.getRejectionReasonDescription(rejectedItem.rejectReason)
          message = translate('is identified as. This order item will be unassigned from the store and sent to be rebrokered.', { productName: rejectedItem.productName, rejectReason: rejectionReason?.toLowerCase() });
        } else {
          message = translate(', and other products were identified as unfulfillable. These items will be unassigned from this store and sent to be rebrokered.', { productName: rejectedItem.productName, products: itemsToReject.length - 1, space: '<br /><br />' });
        }
      } else {
        const productName = outOfStockItem.productName
        const itemsToRejectNotInStock = itemsToReject.filter((item: any) => item.rejectReason === 'NOT_IN_STOCK');
        
        // TODO: ordersCount is not correct as current we are identifying orders count by only checking items visible on UI and not other orders        
        const ordersCount = this.inProgressOrders.list.map((inProgressOrder: any) => inProgressOrder.items.filter((item: any) => itemsToRejectNotInStock.some((outOfStockItem: any) => outOfStockItem.productSku === item.productSku) && item.shipmentId !== order.shipmentId))?.filter((item: any) => item.length).length;

        if (itemsToReject.length === 1 && ordersCount) {
          message = translate("is identified as unfulfillable. other containing this product will be unassigned from this store and sent to be rebrokered.", { productName, space: '<br /><br />', orders: ordersCount, orderText: ordersCount > 1 ? 'orders' : 'order' })
        } else if (itemsToReject.length === 1 && !ordersCount) {
          message = translate("is identified as unfulfillable. This order item will be unassigned from this store and sent to be rebrokered.", { productName, space: '<br /><br />' })
        } else if (itemsToReject.length > 1 && ordersCount) {
          message = translate(", and other products are identified as unfulfillable. other containing these products will be unassigned from this store and sent to be rebrokered.", { productName, products: itemsToReject.length - 1, space: '<br /><br />', orders: ordersCount, orderText: ordersCount > 1 ? 'orders' : 'order' })
        } else {
          message = translate(", and other products are identified as unfulfillable. These order items will be unassigned from this store and sent to be rebrokered.", { productName, products: itemsToReject.length - 1, space: '<br /><br />' })
        }
      }
      const alert = await alertController
        .create({
          header: translate("Report an issue"),
          message,
          buttons: [{
            text: translate("Cancel"),
            role: 'cancel'
          }, {
            text: translate("Report"),
            role: 'confirm',
            handler: async() => {
              await this.initiatePackOrder(order, 'report')
            }
          }]
        });
      
      return alert.present();
    },
    async getUpdatedOrderDetail(order: any, updateParameter?: string) {
      const items = JSON.parse(JSON.stringify(order.items));
      
      // creating updated data for items
      const rejectedOrderItems = [] as any;
      const shipmentPackageContents = [] as any;
      items.map((item: any, index: number) => {
        const shipmentPackage = order.shipmentPackages.find((shipmentPackage: any) => shipmentPackage.packageName === item.selectedBox)
        if (updateParameter === 'report' && item.rejectReason) {
          const rejectedItemInfo = {
            "orderId": item.orderId,
            "orderItemSeqId": item.orderItemSeqId,
            "shipmentId": item.shipmentId,
            "shipmentItemSeqId": item.shipmentItemSeqId,
            "productId": item.productId,
            "facilityId": this.currentFacility?.facilityId,
            "updateQOH": this.affectQohConfig && this.affectQohConfig?.settingValue ? this.affectQohConfig?.settingValue : false,
            "maySplit": this.isEntierOrderRejectionEnabled(order) ? "N" : "Y",
            "cascadeRejectByProduct": this.collateralRejectionConfig?.settingValue === 'true' ? "Y" : "N",
            "rejectionReasonId": item.rejectReason,
            "kitComponents": item.kitComponents,
            "comments": "Store Rejected Inventory"
          } as any

          if (this.excludeOrderBrokerDays !== undefined) {
            rejectedItemInfo["excludeOrderFacilityDuration"] = this.excludeOrderBrokerDays
          }
          rejectedOrderItems.push(rejectedItemInfo)
        } else if (item.selectedBox !== item.currentBox) {
          shipmentPackageContents.push({
            shipmentId: item.shipmentId,
            shipmentItemSeqId: item.shipmentItemSeqId,
            shipmentPackageSeqId: shipmentPackage.shipmentPackageSeqId,
            quantity: item.quantity
          })
        }
      })
      return {rejectedOrderItems, shipmentPackageContents}
    },
    hasPackedShipments(order: any) {
      // TODO check if ternary check is needed or we could handle on UI
      return order.statusId === 'SHIPMENT_PACKED'
    },
    async shipOrder(order: any) {
      try {
        const resp = await OrderService.shipOrder({shipmentId: order.shipmentId})

        if (!hasError(resp)) {
          showToast(translate('Order shipped successfully'))

          // updating order locally after ship action is success, as solr takes some time to update
          order.statusId = 'SHIPMENT_SHIPPED'
          this.store.dispatch('order/updateCurrent', order)
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('Failed to ship order', err)
        showToast(translate('Failed to ship order'))
      }
    },
    async fetchOrderInvoicingStatus() {
      let orderInvoicingInfo = {} as any, resp;

      const params = {
        customParametersMap:{
          "orderId": this.order.orderId,
          "orderByField": "-entryDate",
          "pageSize": 1
        },
        dataDocumentId: "ApiCommunicationEventOrder"
      }

      try {
        resp = await OrderService.findOrderInvoicingInfo(params);

        if(!hasError(resp) && resp.data?.entityValueList?.length) {
          const response = resp.data?.entityValueList[0]

          const content = Object.keys(response.content).length ? JSON.parse(response.content) : {}

          const invoicingFacility = this.userProfile.facilities.find((facility: any) => facility.facilityId === content?.request?.InvoicingStore)

          orderInvoicingInfo = {
            id: response.orderId,
            createdDate: this.getInvoicingConfirmationDate(response.entryDate),
            response : Object.keys(content.response).length ? content?.response : {},
            status: content.status,
            statusCode: content.statusCode,
            invoicingFacility
          }

          const params = {
            orderId: this.order.orderId,
            attrName: "retailProStatus"
          }

          const retailProStatus = this.order.attributes.find((attribute: any) => attribute.attrName === "retailProStatus");
          if (Object.keys(retailProStatus).length && retailProStatus?.attrValue === "Invoiced") {
            orderInvoicingInfo["invoicingConfirmationDate"] = retailProStatus?.lastUpdatedStamp
          }
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        logger.error(error);
      }

      this.orderInvoicingInfo = orderInvoicingInfo
    },
    getOrderInvoicingMessage() {
      let message = "";
      let isMessageRequired = false;

      if(this.orderInvoicingInfo.status === "success") {
        message = "Successfully sent to Retail Pro Server."
      } else {
        if(!this.orderInvoicingInfo.statusCode && !Object.keys(this.orderInvoicingInfo.response).length) {
          message = "Failed to send to Retail Pro Server due to connection issues with Retail Pro, please try again."
        } else {
          message = "Failed to send to Retail Pro Server due to the following error, please contact support:."
          isMessageRequired = true;
        }
      }

      return isMessageRequired ? translate(message, { message: this.orderInvoicingInfo.response.Message }) : translate(message);
    },
    getInvoicingConfirmationDate(date: any) {
      return DateTime.fromMillis(date).setZone(this.userProfile.userTimeZone).toFormat('dd MMMM yyyy hh:mm a ZZZZ')
    },
    async printPackingSlip(order: any) {
      // if the request to print packing slip is not yet completed, then clicking multiple times on the button
      // should not do anything
      if(order.isGeneratingPackingSlip) {
        return;
      }

      order.isGeneratingPackingSlip = true;
      await OrderService.printPackingSlip([order.shipmentId]);
      order.isGeneratingPackingSlip = false;
    },
    async unpackOrder(order: any) {
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
                const resp = await OrderService.unpackOrder({shipmentId: order.shipmentId, statusId: 'SHIPMENT_APPROVED'})

                if(resp.status == 200 && !hasError(resp)) {
                  showToast(translate('Order unpacked successfully'))
                  this.router.replace(`/in-progress/shipment-detail/${this.orderId}/${this.shipmentId}`)
                } else {
                  throw resp.data
                }
              } catch(err) {
                logger.error('Failed to unpack the order', err)
                showToast(translate('Failed to unpack the order'))
              }
            }
          }]
        });
      return unpackOrderAlert.present();
    },
    isTrackingRequiredForAnyShipmentPackage(order: any) {
      return order.isTrackingRequired === 'Y'
    },
    async scanOrder(order: any, updateParameter?: string) {
      const modal = await modalController.create({
        component: ScanOrderItemModal,
        componentProps: { order }
      })

      modal.onDidDismiss().then((result: any) => {
        if(result.data?.packOrder) {
          this.confirmPackOrder(order, updateParameter);
        }
      })

      modal.present();
    },
    async generateTrackingCodeForPacking(order: any, updateParameter?: string, documentOptions?: any, packingError?: string) {
      const modal = await modalController.create({
        component: GenerateTrackingCodeModal,
        componentProps: { order, updateCarrierShipmentDetails: this.updateCarrierShipmentDetails, executePackOrder: this.executePackOrder, rejectEntireOrder: this.rejectEntireOrder, updateParameter, documentOptions, packingError, isDetailPage: "Y" }
      })
      modal.present();
    },
    async openTrackingCodeModal() {
      const addTrackingCodeModal = await modalController.create({
        component: TrackingCodeModal,
        componentProps: { carrierPartyId: this.carrierPartyId }
      });

      return addTrackingCodeModal.present();
    },
    async openGiftCardActivationModal(item: any) {
      const modal = await modalController.create({
        component: GiftCardActivationModal,
        componentProps: { item }
      })

      modal.onDidDismiss().then((result: any) => {
        if(result.data?.isGCActivated) {
          this.store.dispatch("order/updateCurrentItemGCActivationDetails", { item, category: this.category, isDetailsPage: true })
        }
      })

      modal.present();
    },
    async fetchCODPaymentInfo() {
      try {
        const isPendingCODPayment = this.order?.paymentPreferences?.some((paymentPref: any) => paymentPref.paymentMethodTypeId === "EXT_SHOP_CASH_ON_DEL" && paymentPref.statusId === "PAYMENT_NOT_RECEIVED")
        if (isPendingCODPayment) {
          this.isCODPaymentPending = true
          this.orderHeaderAdjustmentTotal = 0
          this.orderAdjustments = this.order?.adjustments.filter((adjustment: any) => {
            // Considered that the adjustment will not be made at shipGroup level
            if((adjustment.orderItemSeqId === "_NA_" || !adjustment.orderItemSeqId) && !adjustment.billingShipmentId) {
              this.orderHeaderAdjustmentTotal += adjustment.amount
              return true;
            } else {
              this.adjustmentsByGroup[adjustment.shipGroupSeqId] ? (this.adjustmentsByGroup[adjustment.shipGroupSeqId].push(adjustment)) : (this.adjustmentsByGroup[adjustment.shipGroupSeqId] = [adjustment])
              return false;
            }
          })
          this.isOrderAdjustmentPending = this.order?.adjustments.some((adjustment: any) => !adjustment.billingShipmentId)

          if(!this.isOrderAdjustmentPending) {
            const adjustment = this.order?.adjustments.find((adjustment: any) => adjustment.billingShipmentId)
            this.orderAdjustmentShipmentId = adjustment.billingShipmentId
          }
        }
      } catch(err) {
        logger.error(err);
      }
    },
    async openOrderAdjustmentInfo() {
      if(this.isCODPaymentPending && !this.isOrderAdjustmentPending) {
        let message = "Order level charges like shipping fees and taxes were already charged to the customer on the first label generated for this order."
        let facilityName = ""
        let trackingCode = ""
        let buttons = [
          {
            text: translate("Dismiss"),
            role: "cancel"
          }
        ] as any

        if(this.orderAdjustmentShipmentId) {
          const shipGroup = this.order.otherShipGroups.find((group: any) => group.shipmentId == this.orderAdjustmentShipmentId)
          facilityName = shipGroup.facilityName || shipGroup.facilityId
          trackingCode = shipGroup.trackingCode

          // As mentioned above, if shipGroup is not found we won't have facility and trackingCode, thus not displaying the second para in that case.
          if(trackingCode) {
            message += "Label was generated by facility with tracking code"
            buttons.push({
              text: translate("Copy tracking code"),
              handler: () => {
                copyToClipboard(trackingCode, "Copied to clipboard")
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
            order: this.order,
            orderId: this.orderId,
            orderAdjustments: this.orderAdjustments,
            orderHeaderAdjustmentTotal: this.orderHeaderAdjustmentTotal,
            adjustmentsByGroup: this.adjustmentsByGroup
          }
        })

        return modal.present();
      }
    },
    getSelectedCarrier(carrierPartyId: string) {
      const facilityCarrier = this.facilityCarriers.find((carrier: any) => carrier.partyId === carrierPartyId)
      return facilityCarrier ? facilityCarrier.groupName : carrierPartyId;
    },
    getSelectedShipmentMethod(shipmentMethodTypeId: string) {
      const shippingMethod = this.carrierMethods.find((method: any) => method.shipmentMethodTypeId === shipmentMethodTypeId);
      return shippingMethod ? shippingMethod.description : shipmentMethodTypeId;
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const userStore = useUserStore()
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 
    let currentEComStore: any = computed(() => userStore.getCurrentEComStore)

    return {
      addOutline,
      archiveOutline,
      Actions,
      bagCheckOutline,
      cashOutline,
      caretDownOutline,
      checkmarkCircleOutline,
      chevronUpOutline,
      closeCircleOutline,
      copyToClipboard,
      cubeOutline,
      currentEComStore,
      currentFacility,
      documentTextOutline,
      ellipsisVerticalOutline,
      fileTrayOutline,
      formatUtcDate,
      getFeatures,
      getFacilityFilter,
      getProductIdentificationValue,
      gift,
      giftOutline,
      hasPermission,
      isKit,
      informationCircleOutline,
      listOutline,
      locateOutline,
      personAddOutline,
      pricetagOutline,
      productIdentificationPref,
      retryShippingLabel,
      router,
      store,
      trashBinOutline,
      translate,
      ribbonOutline
    };
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
