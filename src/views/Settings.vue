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
        <OmsInstanceNavigator />

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
              <ion-select-option v-for="facility in (userProfile ? userProfile.facilities : [])" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.facilityName }}</ion-select-option>
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
            {{ $t('Specify whether the store should fulfill online orders or not.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ $t("Fulfill online orders") }}</ion-label>
            <!-- Using v-model on isStoreFulfilmentTurnedOn for programmatically re-updating the toggle value -->
            <ion-toggle :disabled="!hasPermission(Actions.APP_UPDT_STR_FULFLMNT_CONFIG)" v-model="isStoreFulfilmentTurnedOn" @ionChange="updateFulfillmentStatus($event)" slot="end" />
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
            <ion-toggle :disabled="!hasPermission(Actions.APP_UPDT_ECOM_INV_CONFIG) || !facilityGroupDetails?.facilityGroupId" v-model="isEComInvEnabled" @click="updateEComInvStatus($event)" slot="end" />
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
  IonContent, 
  IonHeader,
  IonIcon, 
  IonItem, 
  IonLabel, 
  IonMenuButton,
  IonPage, 
  IonSelect, 
  IonSelectOption, 
  IonTitle, 
  IonToggle,
  IonToolbar,
  alertController,
  modalController
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
    IonContent, 
    IonHeader, 
    IonIcon,
    IonItem, 
    IonLabel, 
    IonMenuButton,
    IonPage, 
    IonSelect, 
    IonSelectOption,
    IonTitle, 
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
      facilityGroupDetails: {} as any,
      isStoreFulfilmentTurnedOn: true,
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
  ionViewWillEnter() {
    this.getCurrentFacilityDetails()
    this.getEcomInvStatus()
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
        // declaration of isStoreFulfilmentTurnedOn in lifecycle hooks always
        // returns 'true' because of the != 0 condition, hence, updating it here
        this.isStoreFulfilmentTurnedOn = this.currentFacilityDetails?.maximumOrderLimit != 0
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
    logout () {
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
        this.getEcomInvStatus();
      }
    },
    async changeTimeZone() {
      const timeZoneModal = await modalController.create({
        component: TimeZoneModal,
      });
      return timeZoneModal.present();
    },
    async updateFacility(maximumOrderLimit: number) {
      let resp;

      try {
        resp = await UserService.updateFacility({
          "facilityId": this.currentFacility.facilityId,
          maximumOrderLimit
        })

        if(!hasError(resp)) {
          this.currentFacilityDetails.maximumOrderLimit = maximumOrderLimit
          showToast(translate('Facility updated successfully'))
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
    async updateFulfillmentStatus(event: any) {
      // condition to stop alert from re-popping as ionChange is triggered
      // because isStoreFulfilmentTurnedOn is updated
      if (event.detail.checked === this.fulfillmentStatus) return
      event.detail.checked ? this.turnOnFulfillment() : this.turnOffFulfillment()
    },
    async updateEComInvStatus(event: any) {
      event.stopImmediatePropagation();

      // Using `not` as the click event returns the current status of toggle, but on click we want to change the toggle status
      const isChecked = !event.target.checked;
      const header = isChecked ? 'Turn on eCom inventory for ' : 'Turn off eCom inventory for '
      const message = 'Are you sure you want to perform this action?'

      const alert = await alertController.create({
        header: this.$t(header, { facilityName: this.currentFacility.facilityName }),
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
    async turnOnFulfillment() {
      const alert = await alertController.create({
        header: this.$t('Turn on fulfillment for ', { facilityName: this.currentFacility.facilityName }),
        buttons: [{
          text: translate('Cancel'),
          handler: () => {
            this.isStoreFulfilmentTurnedOn = this.fulfillmentStatus
          }
        }, {
          text: translate('Save'),
          handler: (data) => {
            // Adding this extra check as min attribute does not work when providing input using keyboard
            if (data.setLimit <= 0) {
              showToast(translate('Provide a value greater than 0'))
              return;
            }
            this.updateFacility(data.setLimit)
          }
        }],
        inputs: [{
          name: 'setLimit',
          min: 1,
          type: 'number',
          placeholder: translate('Set Limit')
        }],
      });

      await alert.present();
    },
    async turnOffFulfillment() {
      const alert = await alertController.create({
        header: this.$t('Turn off fulfillment for ', { facilityName: this.currentFacility.facilityName }),
        message: translate('Are you sure you want perform this action?'),
        buttons: [{
          text: translate('Cancel'),
          handler: () => {
            this.isStoreFulfilmentTurnedOn = this.fulfillmentStatus
          }
        }, {
          text: translate('Save'),
          handler: () => {
            this.updateFacility(0);
          }
        }]
      });

      await alert.present();
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