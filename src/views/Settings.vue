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
          <ion-button color="danger" @click="logout()">{{ translate("Logout") }}</ion-button>
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

        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ translate("Product Store") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ translate("Store") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('A store represents a company or a unique catalog of products. If your OMS is connected to multiple eCommerce stores selling different collections of products, you may have multiple Product Stores set up in HotWax Commerce.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-select :label="translate('Select store')" interface="popover" :value="currentEComStore.productStoreId" @ionChange="setEComStore($event)">
              <ion-select-option v-for="store in (userProfile ? userProfile.stores : [])" :key="store.productStoreId" :value="store.productStoreId" >{{ store.storeName }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Facility") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Specify which facility you want to operate from. Order, inventory and other configuration data will be specific to the facility you select.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-select :label="translate('Select facility')" interface="popover" :value="currentFacility?.facilityId" @ionChange="setFacility($event)">
              <ion-select-option v-for="facility in (userProfile ? userProfile.facilities : [])" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.facilityName }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>

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
          <ion-card-content>
            {{ translate("Control whether the store requires the force scan during order packing or not.") }}
          </ion-card-content>
          <ion-item lines="none" >
            <ion-toggle label-placement="start" :disabled="!hasPermission(Actions.APP_UPDT_FULFILL_FORCE_SCAN_CONFIG)" :checked="isForceScanEnabled" @click.prevent="updateForceScanStatus($event)">{{ translate("Require scan") }}</ion-toggle>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Allow partial rejections") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Rejecting any items in an order will automatically reject other items of an order.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :disabled="!hasPermission(Actions.APP_PARTIAL_ORDER_REJECTION_CONFIG_UPDATE)" :checked="partialOrderRejectionConfig.settingValue" @click.prevent="confirmPartialOrderRejection(partialOrderRejectionConfig, $event)">{{ translate("Partial rejections") }}</ion-toggle>
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
          <ion-item lines="none">
            <ion-toggle label-placement="start" :disabled="!hasPermission(Actions.APP_COLLATERAL_REJECTION_CONFIG_UPDATE)" :checked="'true' === collateralRejectionConfig.settingValue" @click.prevent="confirmCollateralRejection(collateralRejectionConfig, $event)">{{ translate("Auto reject related items") }}</ion-toggle>
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
import { defineComponent } from 'vue';
import { codeWorkingOutline, ellipsisVerticalOutline, globeOutline, openOutline, timeOutline } from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { UserService } from '@/services/UserService';
import { showToast } from '@/utils';
import { hasError, removeClientRegistrationToken, subscribeTopic, unsubscribeTopic } from '@/adapter'
import { initialiseFirebaseApp, translate } from '@hotwax/dxp-components';
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
      isEComInvEnabled: false
    };
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentFacility: 'user/getCurrentFacility',
      instanceUrl: 'user/getInstanceUrl',
      currentEComStore: 'user/getCurrentEComStore',
      userPreference: 'user/getUserPreference',
      locale: 'user/getLocale',
      notificationPrefs: 'user/getNotificationPrefs',
      allNotificationPrefs: 'user/getAllNotificationPrefs',
      firebaseDeviceId: 'user/getFirebaseDeviceId',
      isForceScanEnabled: 'util/isForceScanEnabled',
      partialOrderRejectionConfig: 'user/getPartialOrderRejectionConfig',
      collateralRejectionConfig: 'user/getCollateralRejectionConfig',
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
    async getCurrentFacilityDetails() {
      let resp: any;
      try {        
        resp = await UserService.getFacilityDetails({
          "entityName": "Facility",
          "inputFields": {
            "facilityId": this.currentFacility.facilityId
          },
          "viewSize": 1,
          "fieldList": ["maximumOrderLimit", "facilityId"]
        })

        if(!hasError(resp) && resp.data.count) {
          // using index 0 as we will only get a single record
          this.currentFacilityDetails = {
            ...this.currentFacilityDetails,
            ...resp.data.docs[0]
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
          "entityName": "FacilityOrderCount",
          "inputFields": {
            "facilityId": this.currentFacility.facilityId,
            "entryDate": DateTime.now().toFormat('yyyy-MM-dd'),
          },
          "viewSize": 1,
          "fieldList": ["entryDate", "lastOrderCount"],
        })
        if (!hasError(resp) && resp.data.count) {          
          // using index 0 as we will only get a single record
          this.currentFacilityDetails.orderCount = resp.data.docs[0].lastOrderCount
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
          "entityName": "FacilityGroup",
          "inputFields": {
            "facilityGroupTypeId": 'SHOPIFY_GROUP_FAC'
          },
          "fieldList": ["facilityGroupId", "facilityGroupTypeId"],
          "viewSize": 1,
        })

        if (!hasError(resp)) {
          // using facilityGroupId as a flag for getting data from getFacilityGroupDetails
          this.facilityGroupDetails.facilityGroupId = resp.data.docs[0].facilityGroupId
          resp = await UserService.getFacilityGroupAndMemberDetails({
            "entityName": "FacilityGroupAndMember",
            "inputFields": {
              "facilityId": this.currentFacility.facilityId,
              "facilityGroupId": this.facilityGroupDetails.facilityGroupId
            },
            "fieldList": ["facilityId", "fromDate"],
            "viewSize": 1,
            "filterByDate": 'Y'
          })

          if (!hasError(resp)) {
            this.facilityGroupDetails = { ...this.facilityGroupDetails, ...resp.data.docs[0] }

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
          window.location.href = `${process.env.VUE_APP_LOGIN_URL}?isLoggedOut=true&redirectUrl=${redirectUrl}`
        }
      })
    },
    goToLaunchpad() {
      window.location.href = `${process.env.VUE_APP_LOGIN_URL}`
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
        await this.updateFacility(result.data)
        this.updateOrderLimitType()
      }
    },
    async setFacility (event: any) {
      // not updating the facility when an empty value is given (on logout)
      if (!event.detail.value) {
        return;
      }

      if (this.userProfile){
        await this.store.dispatch('user/setFacility', {
          'facility': this.userProfile.facilities.find((fac: any) => fac.facilityId == event.detail.value)
        });
        await this.store.dispatch('user/fetchNotificationPreferences')
        this.store.dispatch('order/clearOrders')
        this.getCurrentFacilityDetails();
        this.getFacilityOrderCount();
        this.getEcomInvStatus();
      }
    },
    async timeZoneUpdated(tzId: string) {
      await this.store.dispatch("user/setUserTimeZone", tzId)
    },
    async updateFacility(maximumOrderLimit: number | string) {
      let resp;

      try {
        resp = await UserService.updateFacility({
          "facilityId": this.currentFacility.facilityId,
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
          "facilityId": this.currentFacility.facilityId,
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
          "facilityId": this.currentFacility.facilityId,
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
        header: translate(header, { facilityName: this.currentFacility.facilityName }),
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
    async setEComStore(event: any) {
      // not updating the ecomstore when an empty value is given (on logout)
      if (!event.detail.value) {
        return;
      }
      if(this.userProfile) {
        await this.store.dispatch('user/setEComStore', {
          'eComStore': this.userProfile.stores.find((str: any) => str.productStoreId == event.detail.value)
        })
      }
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
        const facilityId = (this.currentFacility as any).facilityId
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
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      codeWorkingOutline,
      ellipsisVerticalOutline,
      globeOutline,
      openOutline,
      timeOutline,
      router,
      store,
      hasPermission,
      translate
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