<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <div class="user-profile">
        <ion-card>
          <ion-item lines="full">
            <ion-avatar slot="start" v-if="userProfile?.partyImageUrl">
              <Image :src="userProfile.partyImageUrl"/>
            </ion-avatar>
            <!-- ion-no-padding to remove extra side/horizontal padding as additional padding 
            is added on sides from ion-item and ion-padding-vertical to compensate the removed
            vertical padding -->
            <ion-card-header class="ion-no-padding ion-padding-vertical">
              <ion-card-subtitle>{{ userProfile?.userLoginId }}</ion-card-subtitle>
              <ion-card-title>{{ userProfile?.partyName }}</ion-card-title>
            </ion-card-header>
          </ion-item>
          <ion-button color="danger" v-if="!authStore.isEmbedded" @click="logout()">{{ translate("Logout") }}</ion-button>
          <ion-button fill="outline" @click="goToLaunchpad()">
            {{ translate("Go to Launchpad") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
          <!-- Commenting this code as we currently do not have reset password functionality -->
          <!-- <ion-button fill="outline" color="medium">{{ translate("Reset password") }}</ion-button> -->
        </ion-card>
      </div>

      <div class="section-header">
        <h1>{{ translate('OMS') }}</h1>
      </div>

      <section>
        <DxpOmsInstanceNavigator />
        <DxpProductStoreSelector @updateEComStore="updateEComStore($event)"/>
        <DxpFacilitySwitcher @updateFacility="updateFacility($event)"/>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Online Order Fulfillment") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Configure the order fulfillment capacity of your facility.') }}
            <br/><br/>
            {{ translate("Setting fulfillment capacity to 0 disables new order from being allocated to this facility. Leave this empty if this facility's fulfillment capacity is unrestricted.") }}
          </ion-card-content>
          <ion-item lines="none" v-if="orderLimitType === 'custom'">
            <ion-text>{{ currentFacilityDetails?.orderCount }}</ion-text>
            <ion-progress-bar class="ion-margin" :value="currentFacilityDetails?.orderCount / fulfillmentOrderLimit"></ion-progress-bar>
            <ion-chip :disabled="!hasPermission(Actions.APP_UPDT_STR_FULFLMNT_CONFIG)" :outline="true" @click="changeOrderLimitPopover">{{currentFacilityDetails?.maximumOrderLimit}}</ion-chip>
          </ion-item>      
          <ion-item lines="none" v-else-if="orderLimitType === 'unlimited'">
            <ion-label>{{ translate("orders allocated today", {orderCount: currentFacilityDetails?.orderCount}) }}</ion-label>
            <ion-chip :disabled="!hasPermission(Actions.APP_UPDT_STR_FULFLMNT_CONFIG)" :outline="true" @click="changeOrderLimitPopover">{{ translate("Unlimited") }}</ion-chip>
          </ion-item>      
          <ion-item lines="none" v-else>
            <ion-label>{{ translate("orders in fulfillment queue", {orderCount: currentFacilityDetails?.orderCount}) }}</ion-label>
            <ion-chip :disabled="!hasPermission(Actions.APP_UPDT_STR_FULFLMNT_CONFIG)" :outline="true" @click="changeOrderLimitPopover" color="danger" fill="outline">{{ fulfillmentOrderLimit }}</ion-chip>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Sell inventory online") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate("Control whether the store's inventory should be made available for online sales or not.") }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_UPDT_ECOM_INV_CONFIG) || !facilityGroupDetails?.facilityGroupId">
            <ion-toggle label-placement="start" v-model="isEComInvEnabled" @click.prevent="updateEComInvStatus($event)">{{ translate("Sell online") }}</ion-toggle>
          </ion-item>
        </ion-card>
      </section>

      <hr />

      <DxpAppVersionInfo />

      <section>
        <DxpProductIdentifier />
        <DxpTimeZoneSwitcher @timeZoneUpdated="timeZoneUpdated" />
        <DxpLanguageSwitcher />

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Additional documents") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Print supplementary documents with the shipment for package identification.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :checked="userPreference.printShippingLabel" @ionChange="setPrintShippingLabelPreference($event)">{{ translate("Generate shipping label") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :checked="userPreference.printPackingSlip" @ionChange="setPrintPackingSlipPreference($event)">{{ translate("Generate packing slip") }}</ion-toggle>
          </ion-item>
        </ion-card>

        <ion-card v-if="notificationPrefs.length">
          <ion-card-header>
            <ion-card-title>
              {{ translate("Notification Preference") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Select the notifications you want to receive.') }}
          </ion-card-content>
          <ion-list>
            <ion-item :key="pref.enumId" v-for="pref in notificationPrefs" lines="none">
              <ion-toggle label-placement="start" @click.prevent="confirmNotificationPrefUpdate(pref.enumId, $event)" :checked="pref.isEnabled">{{ pref.description }}</ion-toggle>
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Force scan") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content v-html="barcodeContentMessage"></ion-card-content>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_UPDT_FULFILL_FORCE_SCAN_CONFIG)">
            <ion-toggle label-placement="start" :checked="isForceScanEnabled" @click.prevent="updateForceScanStatus($event)">{{ translate("Require scan") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_BARCODE_IDENTIFIER_UPDATE)">
            <ion-select :label="translate('Barcode Identifier')" interface="popover" :placeholder="translate('Select')" :value="barcodeIdentificationPref" @ionChange="setBarcodeIdentificationPref($event.detail.value)">
              <ion-select-option v-for="identification in barcodeIdentificationOptions" :key="identification" :value="identification.goodIdentificationTypeId" >{{ identification.description ? identification.description : identification.goodIdentificationTypeId }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Allow partial rejections") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate("Individual items within an order will be rejected without affecting the other items in the order.") }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_PARTIAL_ORDER_REJECTION_CONFIG_UPDATE)">
            <ion-toggle label-placement="start" :checked="partialOrderRejectionConfig?.settingValue" @click.prevent="confirmPartialOrderRejection(partialOrderRejectionConfig, $event)">{{ translate("Partial rejections") }}</ion-toggle>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Collateral rejections") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('When rejecting an item, automatically reject all other orders for that item as well.') }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_COLLATERAL_REJECTION_CONFIG_UPDATE)">
            <ion-toggle label-placement="start" :checked="'true' === collateralRejectionConfig?.settingValue" @click.prevent="confirmCollateralRejection(collateralRejectionConfig, $event)">{{ translate("Auto reject related items") }}</ion-toggle>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Affect QOH on rejection") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Adjust the QOH along with ATP on rejection.') }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_AFFECT_QOH_CONFIG_UPDATE)">
            <ion-toggle label-placement="start" :checked="'true' === affectQohConfig?.settingValue" @click.prevent="confirmAffectQohConfig(affectQohConfig, $event)">{{ translate("Affect QOH") }}</ion-toggle>
          </ion-item>
        </ion-card>
      </section>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { 
  IonAvatar,
  IonButton, 
  IonCard, 
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonChip,
  IonContent, 
  IonHeader,
  IonIcon, 
  IonItem, 
  IonLabel,
  IonList,
  IonMenuButton,
  IonPage, 
  IonProgressBar,
  IonSelect, 
  IonSelectOption, 
  IonTitle, 
  IonText,
  IonToggle,
  IonToolbar,
  alertController,
  popoverController
} from '@ionic/vue';
import { computed, defineComponent } from 'vue';
import { codeWorkingOutline, ellipsisVerticalOutline, globeOutline, openOutline, timeOutline } from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { UserService } from '@/services/UserService';
import { showToast } from '@/utils';
import { hasError, removeClientRegistrationToken, subscribeTopic, unsubscribeTopic } from '@/adapter'
import { initialiseFirebaseApp, translate, useProductIdentificationStore, useUserStore, useAuthStore, getAppLoginUrl } from '@hotwax/dxp-components';
import logger from '@/logger';
import { Actions, hasPermission } from '@/authorization'
import { DateTime } from 'luxon';
import Image from '@/components/Image.vue';
import OrderLimitPopover from '@/components/OrderLimitPopover.vue'
import emitter from "@/event-bus"
import { addNotification, generateTopicName, isFcmConfigured, storeClientRegistrationToken } from "@/utils/firebase";



export default defineComponent({
  name: 'Settings',
  components: { 
    IonAvatar,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonChip,
    IonContent, 
    IonHeader, 
    IonIcon,
    IonItem, 
    IonList,
    IonLabel,
    IonMenuButton,
    IonPage, 
    IonProgressBar,
    IonSelect, 
    IonSelectOption,
    IonTitle, 
    IonText,
    IonToggle,
    IonToolbar,
    Image
  },
  data() {
    return {
      baseURL: process.env.VUE_APP_BASE_URL,
      locales: process.env.VUE_APP_LOCALES ? JSON.parse(process.env.VUE_APP_LOCALES) : {"en": "English"},
      currentFacilityDetails: {} as any,
      orderLimitType: 'unlimited',
      fulfillmentOrderLimit: "" as number | string,
      facilityGroupDetails: {} as any,
      isEComInvEnabled: false,
      barcodeContentMessage: translate("Only allow shipped quantity to be incremented by scanning the barcode of products. If the identifier is not found, the scan will default to using the internal name.", { space: '<br /><br />' })
    };
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      instanceUrl: 'user/getInstanceUrl',
      userPreference: 'user/getUserPreference',
      locale: 'user/getLocale',
      notificationPrefs: 'user/getNotificationPrefs',
      allNotificationPrefs: 'user/getAllNotificationPrefs',
      firebaseDeviceId: 'user/getFirebaseDeviceId',
      isForceScanEnabled: 'util/isForceScanEnabled',
      partialOrderRejectionConfig: 'user/getPartialOrderRejectionConfig',
      collateralRejectionConfig: 'user/getCollateralRejectionConfig',
      affectQohConfig: 'user/getAffectQohConfig',
      barcodeIdentificationPref: 'util/getBarcodeIdentificationPref'
    })
  },
  async ionViewWillEnter() {
    Promise.all([this.getCurrentFacilityDetails(), this.getFacilityOrderCount(), this.getEcomInvStatus()]);

    // fetching partial order rejection when entering setting page to have latest information
    await this.store.dispatch('user/getPartialOrderRejectionConfig')
    await this.store.dispatch('user/getCollateralRejectionConfig')
    
    // as notification prefs can also be updated from the notification pref modal,
    // latest state is fetched each time we open the settings page
    await this.store.dispatch('user/fetchNotificationPreferences')
  },
  methods: {
    updateEComStore(selectedProductStore: any) {
      this.store.dispatch('user/setEComStore', selectedProductStore?.productStoreId)
    },
    async getCurrentFacilityDetails() {
      let resp: any;
      try {        
        resp = await UserService.getFacilityDetails({
          "facilityId": this.currentFacility?.facilityId,
          "pageSize": 1,
          "fieldsToSelect": ["maximumOrderLimit", "facilityId"]
        })

        if(!hasError(resp)) {
          // using index 0 as we will only get a single record
          this.currentFacilityDetails = {
            ...this.currentFacilityDetails,
            ...resp.data
          }
          this.updateOrderLimitType()
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Failed to fetch current facility details', err)
      }
    },
    async getFacilityOrderCount() {
      let resp: any;
      try {
        resp = await UserService.getFacilityOrderCount({
          "facilityId": this.currentFacility?.facilityId,
          "entryDate": DateTime.now().toFormat('yyyy-MM-dd'),
          "pageSize": 1,
          "fieldsToSelect": ["entryDate", "lastOrderCount"],
        })
        if (!hasError(resp) && resp.data.length) {          
          // using index 0 as we will only get a single record
          this.currentFacilityDetails.orderCount = resp.data[0]?.lastOrderCount
        } else {
          throw resp.data
        }
      } catch(err) {
        this.currentFacilityDetails.orderCount = 0
        logger.error("Failed to fetch total orders count", err);
      }
    },
    updateOrderLimitType() {
      this.fulfillmentOrderLimit = this.currentFacilityDetails?.maximumOrderLimit
      if (this.fulfillmentOrderLimit === 0) {
        this.orderLimitType = 'no-capacity'
      } else if (this.fulfillmentOrderLimit) {
        this.orderLimitType = 'custom'
      } else {
        this.orderLimitType = 'unlimited'
      }
    },
    async getEcomInvStatus() {
      let resp: any;
      try {
        this.isEComInvEnabled = false
        this.facilityGroupDetails = {}

        resp = await UserService.getFacilityGroupDetails({
          "facilityGroupTypeId": 'SHOPIFY_GROUP_FAC',
          "fieldsToSelect": ["facilityGroupId", "facilityGroupTypeId"],
          "pageSize": 1,
        })

        if (!hasError(resp)) {
          // using facilityGroupId as a flag for getting data from getFacilityGroupDetails
          this.facilityGroupDetails.facilityGroupId = resp.data[0].facilityGroupId
          resp = await UserService.getFacilityGroupAndMemberDetails({
            customParametersMap:{
              "facilityId": this.currentFacility?.facilityId,
              "facilityGroupId": this.facilityGroupDetails.facilityGroupId,
              pageIndex: 0,
              pageSize: 1
            },
            dataDocumentId: "FacilityGroupAndMember",
            filterByDate: true
          })

          if (!hasError(resp)) {
            this.facilityGroupDetails = { ...this.facilityGroupDetails, ...resp.data.entityValueList[0] }

            // When getting data from group member enabling the eCom inventory
            this.isEComInvEnabled = true
          } else {
            throw resp.data
          }
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('Failed to fetch eCom inventory config', err)
      }
    },
    async logout () {

      // remove firebase notification registration token -
      // OMS and auth is required hence, removing it before logout (clearing state)
      try {
        await removeClientRegistrationToken(this.firebaseDeviceId, process.env.VUE_APP_NOTIF_APP_ID as any)
      } catch (error) {
        logger.error(error)
      }

      this.store.dispatch('user/logout', { isUserUnauthorised: false }).then((redirectionUrl) => {
        this.store.dispatch('order/clearOrders')

        // if not having redirection url then redirect the user to launchpad
        if(!redirectionUrl) {
          const redirectUrl = window.location.origin + '/login'
          window.location.href = `${getAppLoginUrl()}?isLoggedOut=true&redirectUrl=${redirectUrl}`
        }
      })
    },
    goToLaunchpad() {
        window.location.href = getAppLoginUrl();
    },
    async changeOrderLimitPopover(ev: Event) {
      const popover = await popoverController.create({
        component: OrderLimitPopover,
        event: ev,
        showBackdrop: false,
        componentProps: {fulfillmentOrderLimit: this.fulfillmentOrderLimit}
      });
      popover.present();

      const result = await popover.onDidDismiss();
      // Note: here result.data returns 0 in some cases that's why it is compared with 'undefined'.
      if(result.data != undefined && result.data !== this.fulfillmentOrderLimit){
        await this.updateFacilityMaximumOrderLimit(result.data)
        this.updateOrderLimitType()
      }
    },
    async updateFacility(facility: any) {
      await this.store.dispatch('user/setFacility', facility);
      await this.store.dispatch('user/fetchNotificationPreferences')
      this.getCurrentFacilityDetails();
      this.getFacilityOrderCount();
      this.getEcomInvStatus();
    },
    async timeZoneUpdated(tzId: string) {
      await this.store.dispatch("user/setUserTimeZone", tzId)
    },
    async updateFacilityMaximumOrderLimit(maximumOrderLimit: number | string) {
      let resp;

      try {
        resp = await UserService.updateFacility({
          "facilityId": this.currentFacility?.facilityId,
          maximumOrderLimit
        })

        if(!hasError(resp)) {
          this.currentFacilityDetails.maximumOrderLimit = maximumOrderLimit === "" ? null : maximumOrderLimit
          showToast(translate('Order fulfillment capacity updated successfully'))
        } else {
          throw resp.data
        }
      } catch(err) {
        showToast(translate('Failed to update facility'))
        logger.error('Failed to update facility', err)
      }
    },
    async updateFacilityToGroup() {
      let resp;
      try {
        resp = await UserService.updateFacilityToGroup({
          "facilityId": this.currentFacility?.facilityId,
          "facilityGroupId": this.facilityGroupDetails.facilityGroupId,
          "fromDate": this.facilityGroupDetails.fromDate,
          "thruDate": DateTime.now().toMillis()
        })

        if (!hasError(resp)) {
          this.isEComInvEnabled = false
          showToast(translate('ECom inventory status updated successfully'))
        } else {
          throw resp.data
        }
      } catch (err) {
        showToast(translate('Failed to update eCom inventory status'))
        logger.error('Failed to update eCom inventory status', err)
      }
    },
    async addFacilityToGroup() {
      let resp;
      try {
        resp = await UserService.addFacilityToGroup({
          "facilityId": this.currentFacility?.facilityId,
          "facilityGroupId": this.facilityGroupDetails.facilityGroupId
        })

        if (!hasError(resp)) {
          this.isEComInvEnabled = true
          showToast(translate('ECom inventory status updated successfully'))
        } else {
          throw resp.data
        }
      } catch (err) {
        showToast(translate('Failed to update eCom inventory status'))
        logger.error('Failed to update eCom inventory status', err)
      }
    },
    async updateEComInvStatus(event: any) {
      event.stopImmediatePropagation();

      // Using `not` as the click event returns the current status of toggle, but on click we want to change the toggle status
      const isChecked = !event.target.checked;
      const header = isChecked ? 'Turn on eCom inventory for ' : 'Turn off eCom inventory for '
      const message = 'Are you sure you want to perform this action?'

      const alert = await alertController.create({
        header: translate(header, { facilityName: this.currentFacility?.facilityName }),
        message: translate(message),
        buttons: [{
          text: translate('Cancel'),
          role: ''
        }, {
          text: translate('Save'),
          role: 'success'
        }],
      });

      await alert.present();

      const { role } = await alert.onDidDismiss();

      if(role) {
        isChecked ? await this.addFacilityToGroup() : await this.updateFacilityToGroup()
      }

    },
    async updateForceScanStatus(event: any) {
      event.stopImmediatePropagation();

      this.store.dispatch("util/setForceScanSetting", !this.isForceScanEnabled)
    },
    setPrintShippingLabelPreference (ev: any) {
      this.store.dispatch('user/setUserPreference', { printShippingLabel: ev.detail.checked })
    },
    setPrintPackingSlipPreference (ev: any){
      this.store.dispatch('user/setUserPreference', { printPackingSlip: ev.detail.checked })
    },
    setLocale(locale: string) {
      this.store.dispatch('user/setLocale',locale)
    },
    async updateNotificationPref(enumId: string) {
      let isToggledOn = false;

      try {
        if (!isFcmConfigured()) {
          logger.error("FCM is not configured.");
          showToast(translate('Notification preferences not updated. Please try again.'))
          return;
        }

        emitter.emit('presentLoader',  { backdropDismiss: false })
        const facilityId = this.currentFacility?.facilityId
        const topicName = generateTopicName(facilityId, enumId)

        const notificationPref = this.notificationPrefs.find((pref: any) => pref.enumId === enumId)
        notificationPref.isEnabled
          ? await unsubscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID as any)
          : await subscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID as any)
          
        notificationPref.isEnabled = !notificationPref.isEnabled
        await this.store.dispatch('user/updateNotificationPreferences', this.notificationPrefs)
        isToggledOn = notificationPref.isEnabled
        showToast(translate('Notification preferences updated.'))
      } catch (error) {
        showToast(translate('Notification preferences not updated. Please try again.'))
      } finally {
        emitter.emit("dismissLoader")
      }
      try {
        if(!this.allNotificationPrefs.length && isToggledOn) {
          await initialiseFirebaseApp(JSON.parse(process.env.VUE_APP_FIREBASE_CONFIG as any), process.env.VUE_APP_FIREBASE_VAPID_KEY, storeClientRegistrationToken, addNotification)
        } else if(this.allNotificationPrefs.length == 1 && !isToggledOn) {
          await removeClientRegistrationToken(this.firebaseDeviceId, process.env.VUE_APP_NOTIF_APP_ID as any)
        }
        await this.store.dispatch("user/fetchAllNotificationPrefs");
      } catch(error) {
        logger.error(error);
      }
    },
    async confirmNotificationPrefUpdate(enumId: string, event: CustomEvent) {
      event.stopImmediatePropagation();

      const message = translate("Are you sure you want to update the notification preferences?");
      const alert = await alertController.create({
        header: translate("Update notification preferences"),
        message,
        buttons: [
          {
            text: translate("Cancel"),
            role: "cancel"
          },
          {
            text: translate("Confirm"),
            handler: async () => {
              alertController.dismiss()
              await this.updateNotificationPref(enumId)
            }
          }
        ],
      });
      return alert.present();
    },
    async confirmPartialOrderRejection(config: any, event: any) {
      event.stopImmediatePropagation();
      const isChecked = !event.target.checked;
      const message = translate("Are you sure you want to perform this action?");
      const header = isChecked ? translate('Allow partial rejections ') : translate('Disallow partial rejections')

      const alert = await alertController.create({
        header,
        message,
        buttons: [
          {
            text: translate("Cancel"),
            role: "cancel"
          },
          {
            text: translate("Confirm"),
            handler: async () => {
              alertController.dismiss()
              await this.updatePartialOrderRejectionConfig(config, isChecked)
            }
          }
        ],
      });
      return alert.present();
    },
    async updatePartialOrderRejectionConfig(config: any, value: any) {
      const params = {
        ...config,
        "settingValue": value
      }
      await this.store.dispatch('user/updatePartialOrderRejectionConfig', params)
    },
    async confirmCollateralRejection(config: any, event: any) {
      event.stopImmediatePropagation();

      const isChecked = !event.target.checked;
      const message = translate("Are you sure you want to perform this action?");
      const header = isChecked ? translate('Allow collateral rejections') : translate('Disallow collateral rejections')

      const alert = await alertController.create({
        header,
        message,
        buttons: [
          {
            text: translate("Cancel"),
            role: "cancel"
          },
          {
            text: translate("Confirm"),
            handler: async () => {
              alertController.dismiss()
              await this.updateCollateralRejectionConfig(config, !event.target.checked)
            }
          }
        ],
      });
      return alert.present();
    },
    async updateCollateralRejectionConfig(config: any, value: any) {
      const params = {
        ...config,
        "settingValue": value
      }
      await this.store.dispatch('user/updateCollateralRejectionConfig', params)
    },
    async confirmAffectQohConfig(config: any, event: any) {
      event.stopImmediatePropagation();

      const isChecked = !event.target.checked;
      const message = translate("Are you sure you want to perform this action?");
      const header = isChecked ? translate('Affect QOH on rejection') : translate('Do not affect QOH on rejection')

      const alert = await alertController.create({
        header,
        message,
        buttons: [
          {
            text: translate("Cancel"),
            role: "cancel"
          },
          {
            text: translate("Confirm"),
            handler: async () => {
              alertController.dismiss()
              await this.updateAffectQohConfig(config, !event.target.checked)
            }
          }
        ],
      });
      return alert.present();
    },
    async updateAffectQohConfig(config: any, value: any) {
      const params = {
        ...config,
        "settingValue": value
      }
      await this.store.dispatch('user/updateAffectQohConfig', params)
    },
    setBarcodeIdentificationPref(value: string) {
      this.store.dispatch('util/setBarcodeIdentificationPref', value)
    },
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const userStore = useUserStore()
    const productIdentificationStore = useProductIdentificationStore();
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 
    let barcodeIdentificationOptions = computed(() => productIdentificationStore.getGoodIdentificationOptions)
    const authStore = useAuthStore();
    return {
      Actions,
      barcodeIdentificationOptions,
      codeWorkingOutline,
      currentFacility,
      ellipsisVerticalOutline,
      globeOutline,
      openOutline,
      timeOutline,
      router,
      store,
      hasPermission,
      translate,
      authStore
    }
  }
});
</script>

<style scoped>
ion-card > ion-button {
  margin: var(--spacer-xs);
}
section {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  align-items: start;
}
.user-profile {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
}
hr {
  border-top: 1px solid var(--ion-color-medium);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacer-xs) 10px 0px;
}

ion-chip {
  flex-shrink: 0;
}

</style>