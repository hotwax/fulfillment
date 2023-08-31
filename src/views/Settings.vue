<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Settings") }}</ion-title>
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
          <ion-button color="danger" @click="logout()">{{ $t("Logout") }}</ion-button>
          <ion-button fill="outline" @click="goToLaunchpad()">
            {{ $t("Go to Launchpad") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
          <!-- Commenting this code as we currently do not have reset password functionality -->
          <!-- <ion-button fill="outline" color="medium">{{ $t("Reset password") }}</ion-button> -->
        </ion-card>
      </div>

      <div class="section-header">
        <h1>{{ $t('OMS') }}</h1>
      </div>

      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ $t("OMS instance") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ instanceUrl }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            {{ $t('This is the name of the OMS you are connected to right now. Make sure that you are connected to the right instance before proceeding.') }}
          </ion-card-content>

          <ion-button @click="goToOms" fill="clear">
            {{ $t('Go to OMS') }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ $t("Product Store") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ $t("Store") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('A store represents a company or a unique catalog of products. If your OMS is connected to multiple eCommerce stores selling different collections of products, you may have multiple Product Stores set up in HotWax Commerce.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label> {{ $t("Select store") }} </ion-label>
            <ion-select interface="popover" :value="currentEComStore.productStoreId" @ionChange="setEComStore($event)">
              <ion-select-option v-for="store in (userProfile ? userProfile.stores : [])" :key="store.productStoreId" :value="store.productStoreId" >{{ store.storeName }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t("Facility") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('Specify which facility you want to operate from. Order, inventory and other configuration data will be specific to the facility you select.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ $t("Select facility") }}</ion-label>
            <ion-select interface="popover" :value="currentFacility?.facilityId" @ionChange="setFacility($event)">
              <ion-select-option v-for="facility in (userProfile ? userProfile.facilities : [])" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.name }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t("Online Order Fulfillment") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('Configure the order fulfillment capacity of your facility.') }}
          </ion-card-content>
          <ion-card-content>
            {{ $t("Setting fulfillment capacity to 0 disables new order from being allocated to this facility. Leave this empty if this facility's fulfillment capacity is unrestricted.") }}
          </ion-card-content>
          <ion-item lines="none" v-if="orderLimitMode === 'custom'">
            <ion-text>{{currentFacilityDetails?.orderCount}}</ion-text>
            <ion-progress-bar class="ion-margin" :value="currentFacilityDetails?.orderCount / fulfillmentOrderLimit"></ion-progress-bar>
            <ion-chip :outline="true" @click="changeOrderLimitPopover">{{currentFacilityDetails?.maximumOrderLimit}}</ion-chip>
          </ion-item>      
          <ion-item lines="none" v-if="orderLimitMode === 'unlimited'">
            <ion-label>{{ $t("orders allocated today", {orderCount: currentFacilityDetails?.orderCount}) }}</ion-label>
            <ion-chip :outline="true" @click="changeOrderLimitPopover">{{ $t("Unlimited") }}</ion-chip>
          </ion-item>      
          <ion-item lines="none" v-if="orderLimitMode === 'no-capacity'">
            <ion-label>{{ $t("orders in fulfillment queue", {orderCount: currentFacilityDetails?.orderCount}) }}</ion-label>
            <ion-chip :outline="true" @click="changeOrderLimitPopover" color="danger" fill="outline">{{ fulfillmentOrderLimit }}</ion-chip>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t("Sell inventory online") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t("Control whether the store's inventory should be made available for online sales or not.") }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ $t("Sell online") }}</ion-label>
            <ion-toggle slot="end" />
          </ion-item>
        </ion-card>
      </section>

      <hr />

      <div class="section-header">
        <h1>
          {{ $t('App') }}
          <p class="overline">{{ "Version: " + appVersion }}</p>
        </h1>
        <p class="overline">{{ "Built: " + getDateTime(appInfo.builtTime) }}</p>
      </div>

      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t('Timezone') }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            {{ $t('The timezone you select is used to ensure automations you schedule are always accurate to the time you select.') }}
          </ion-card-content>

          <ion-item lines="none">
            <ion-label> {{ userProfile && userProfile.userTimeZone ? userProfile.userTimeZone : '-' }} </ion-label>
            <ion-button @click="changeTimeZone()" slot="end" fill="outline" color="dark">{{ $t("Change") }}</ion-button>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t("Language") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('Select your preferred language.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ $t("Choose language") }}</ion-label>
            <ion-select interface="popover" :value="locale" @ionChange="setLocale($event.detail.value)">
              <ion-select-option v-for="locale in Object.keys(locales)" :key="locale" :value="locale" >{{ locales[locale] }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t("Additional documents") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('Print supplementary documents with the shipment for package identification.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ $t("Generate shipping label") }}</ion-label>
            <ion-toggle :checked="userPreference.printShippingLabel" @ionChange="setPrintShippingLabelPreference($event)" slot="end" />
          </ion-item>
          <ion-item lines="none">
            <ion-label>{{ $t("Generate packing slip") }}</ion-label>
            <ion-toggle :checked="userPreference.printPackingSlip" @ionChange="setPrintPackingSlipPreference($event)" slot="end" />
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
  IonMenuButton,
  IonPage, 
  IonProgressBar,
  IonSelect, 
  IonSelectOption, 
  IonTitle, 
  IonText,
  IonToggle,
  IonToolbar,
  modalController,
  alertController,
  popoverController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { codeWorkingOutline, ellipsisVerticalOutline, globeOutline, openOutline, timeOutline } from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import TimeZoneModal from '@/views/timezone-modal.vue'
import { UserService } from '@/services/UserService';
import { showToast } from '@/utils';
import { hasError } from '@/adapter';
import { translate } from '@/i18n';
import logger from '@/logger';
import { Actions, hasPermission } from '@/authorization'
import { DateTime } from 'luxon';
import Image from '@/components/Image.vue';
import OrderLimitPopover from '@/views/OrderLimitPopover.vue'

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
      appInfo: (process.env.VUE_APP_VERSION_INFO ? JSON.parse(process.env.VUE_APP_VERSION_INFO) : {}) as any,
      appVersion: "",
      locales: process.env.VUE_APP_LOCALES ? JSON.parse(process.env.VUE_APP_LOCALES) : {"en": "English"},
      currentFacilityDetails: {} as any,
      orderLimitMode: 'custom',
      fulfillmentOrderLimit: 0
    };
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentFacility: 'user/getCurrentFacility',
      instanceUrl: 'user/getInstanceUrl',
      currentEComStore: 'user/getCurrentEComStore',
      userPreference: 'user/getUserPreference',
      locale: 'user/getLocale'
    }),
    fulfillmentStatus() {
      // considered that if facility details are not available then also fulfillment will be turned on
      return this.currentFacilityDetails.maximumOrderLimit != 0
    }
  },
  mounted() {
    this.appVersion = this.appInfo.branch ? (this.appInfo.branch + "-" + this.appInfo.revision) : this.appInfo.tag;
  },
  async ionViewWillEnter() {
    await this.getCurrentFacilityDetails()
    await this.getCurrentOrdersCount()
  },
  methods: {
    async getCurrentFacilityDetails() {
      let resp: any;
      try {
        this.currentFacilityDetails = {}

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
          this.currentFacilityDetails = resp.data.docs[0]
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Failed to fetch current facility details', err)
      } finally {
        this.updateOrderLimitMode()
      }
    },
    async getCurrentOrdersCount() {
      let resp: any;
      try {
        resp = await UserService.getCurrentOrdersCount({
          "entityName": "FacilityOrderCount",
          "inputFields": {
            "facilityId": this.currentFacility.facilityId
          }
        })
        if(!hasError(resp) && resp.data.count) {
          this.currentFacilityDetails.orderCount = resp.data.count
        } else {
          throw resp.data
        }
      } catch(err) {
        console.error("Failed to fetch total orders count", err);
      }
    },
    updateOrderLimitMode() {
      this.fulfillmentOrderLimit = this.currentFacilityDetails?.maximumOrderLimit
      if(this.currentFacilityDetails?.maximumOrderLimit == 0){
        this.orderLimitMode = 'no-capacity'
      }else if(this.currentFacilityDetails?.maximumOrderLimit == null || this.currentFacilityDetails?.maximumOrderLimit == ""){
        this.orderLimitMode = 'unlimited'
      }else{
        this.orderLimitMode = 'custom'
      }
    },
    logout () {
      this.store.dispatch('user/logout').then(() => {
        this.store.dispatch('order/clearOrders')
        const redirectUrl = window.location.origin + '/login'
        window.location.href = `${process.env.VUE_APP_LOGIN_URL}?isLoggedOut=true&redirectUrl=${redirectUrl}`
      })
    },
    goToLaunchpad() {
      window.location.href = `${process.env.VUE_APP_LOGIN_URL}`
    },
    async changeOrderLimitPopover(ev: Event) {
      const popover = await popoverController.create({
        component: OrderLimitPopover,
        event: ev,
        translucent: true,
        showBackdrop: false,
        componentProps: {fulfillmentOrderLimit: this.fulfillmentOrderLimit}
      });
      popover.present();

      const result = await popover.onDidDismiss(); 
      
      if(result.data != undefined && result.data !== this.fulfillmentOrderLimit){
        const resultData = result.data;
        await this.updateFacility(resultData)
        this.updateOrderLimitMode()
      }
    },
    async setFacility (event: any) {
      // not updating the facility when the current facility in vuex state and the selected facility are same
      // or when an empty value is given (on logout)
      if (this.currentFacility.facilityId === event.detail.value || !event.detail.value) {
        return;
      }

      if (this.userProfile){
        await this.store.dispatch('user/setFacility', {
          'facility': this.userProfile.facilities.find((fac: any) => fac.facilityId == event.detail.value)
        });
        this.store.dispatch('order/clearOrders')
        this.getCurrentFacilityDetails();
      }
    },
    async changeTimeZone() {
      const timeZoneModal = await modalController.create({
        component: TimeZoneModal,
      });
      return timeZoneModal.present();
    },
    async updateFacility(maximumOrderLimit: any) {
      let resp;

      try {
        resp = await UserService.updateFacility({
          "facilityId": this.currentFacility.facilityId,
          maximumOrderLimit: maximumOrderLimit
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
    async updateFulfillmentStatus(event: any) {
      // condition to stop alert from re-popping as ionChange is triggered
      // because isStoreFulfilmentTurnedOn is updated
      if (event.detail.checked === this.fulfillmentStatus) return
    },
    async setEComStore(event: any) {
      // not updating the ecomstore when the current value in vuex state and selected value are same
      // or when an empty value is given (on logout)
      if (this.currentEComStore.productStoreId === event.detail.value || !event.detail.value) {
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
    getDateTime(time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
    setLocale(locale: string) {
      this.store.dispatch('user/setLocale',locale)
    },
    goToOms(){
      window.open(this.instanceUrl.startsWith('http') ? this.instanceUrl.replace('api/', "") : `https://${this.instanceUrl}.hotwax.io/`, '_blank', 'noopener, noreferrer');
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
      hasPermission
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
</style>