<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Store Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <ion-item>
        <ion-label>{{ $t("Store") }}</ion-label>
        <ion-select :value="currentFacility.facilityId" @ionChange="setFacility($event)">
          <ion-select-option v-for="facility in (userProfile ? userProfile.facilities : [])" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.name }}</ion-select-option>
        </ion-select>
      </ion-item>

      <ion-item>
        <ion-icon :icon="codeWorkingOutline" slot="start"/>
        <ion-label>{{ $t("OMS") }}</ion-label>
        <p slot="end">{{ baseURL ? baseURL : instanceUrl }}</p>
      </ion-item>

      <!-- TODO: Add functionality to make document printing functionality global -->
      <ion-card>
        <ion-item lines="none">
          <ion-label class="text-wrap">{{ $t("Documents to print when packing orders") }}</ion-label>
        </ion-item>
        <ion-item>
          <ion-label>{{ $t("Shipping label") }}</ion-label>
          <ion-checkbox slot="end" />
        </ion-item>
        <ion-item lines="none">
          <ion-label>{{ $t("Packing slip") }}</ion-label>
          <ion-checkbox slot="end" />
        </ion-item>
      </ion-card>

      <ion-card>
        <ion-item lines="none">
          <ion-label>{{ $t("Fulfillment") }} : {{ isStoreFulfillmentTurnOn ? $t("On") : $t("Off") }}</ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-label class="text-wrap">{{ $t("has outstanding orders and in progress orders.", {storeName: "Broadway", outstandingOrder: 47, progressOrder: 77}) }}</ion-label>
        </ion-item>
        <div class="actions">
          <div>
            <ion-button fill="outline" color="secondary" size="medium">{{ $t("Recycle all open orders") }}</ion-button>
            <ion-button fill="outline" color="secondary" size="medium">{{ $t("Recycle all orders") }}</ion-button>
          </div>
          <div>
            <ion-button v-if="isStoreFulfillmentTurnOn" fill="outline" color="danger" size="medium" @click="turnOffFulfillment()">{{ $t("Turn off fulfillment") }}</ion-button>
            <ion-button v-else fill="outline" color="success" size="medium" @click="turnOnFulfillment()">{{ $t("Turn on fulfillment") }}</ion-button>
          </div>
        </div>

        <ion-item class="mobile-only">
          <ion-button fill="clear">{{ $t("Recycle all open orders") }}</ion-button>
          <ion-button slot="end" fill="clear" color="medium" @click="RecyclePopover">
            <ion-icon :icon="ellipsisVerticalOutline" slot="icon-only" />
          </ion-button>
        </ion-item>
      </ion-card>

      <ion-item>
        <ion-icon :icon="timeOutline" slot="start"/>                
        <ion-label> {{ userProfile && userProfile.userTimeZone ? userProfile.userTimeZone : '-' }} </ion-label>
        <ion-button @click="changeTimeZone()" fill="outline" color="dark">{{ $t("Change") }}</ion-button>
      </ion-item>
      <ion-item>
        <ion-label>{{ userProfile !== null ? userProfile.partyName : '' }}</ion-label>
        <ion-button fill="outline" color="medium" @click="logout()">{{ $t("Logout") }}</ion-button>
      </ion-item>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { 
  IonButton, 
  IonCard, 
  IonCheckbox, 
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
  IonToolbar,
  popoverController,
  modalController,
alertController} from '@ionic/vue';
import { defineComponent } from 'vue';
import { codeWorkingOutline, ellipsisVerticalOutline, timeOutline } from 'ionicons/icons'
import Popover from '@/views/RecyclePopover.vue'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import TimeZoneModal from '@/views/timezone-modal.vue'
import { UserService } from '@/services/UserService';
import { hasError, showToast } from '@/utils';
import { translate } from '@/i18n';

export default defineComponent({
  name: 'Settings',
  components: { 
    IonButton,
    IonCard,
    IonCheckbox,
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
    IonToolbar
  },
  data() {
    return {
      baseURL: process.env.VUE_APP_BASE_URL,
      currentFacilityDetails: {} as any
    };
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentFacility: 'user/getCurrentFacility',
      instanceUrl: 'user/getInstanceUrl'
    }),
    isStoreFulfillmentTurnOn() {
      // considered that if facility details are not available then also fulfillment will be turned on
      return this.currentFacilityDetails.maximumOrderLimit != 0
    }
  },
  mounted() {
    this.getCurrentFacilityDetails();
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
          "fieldList": ["maximumOrderLimit"]
        })

        if(resp.status == 200 && !hasError(resp) && resp.data.count) {
          // using index 0 as we will only get a single record
          this.currentFacilityDetails = resp.data.docs[0]
        }
      } catch(err) {
        console.error(err)
      }
    },
    async RecyclePopover(ev: Event) {
      const popover = await popoverController.create({
        component: Popover,
        event: ev,
        translucent: true,
        showBackdrop: false,
      });
      return popover.present();
    },
    logout () {
      this.store.dispatch('user/logout').then(() => {
        this.store.dispatch('picklist/clearPicklist')
        this.router.push('/login');
      })
    },
    setFacility (facility: any) {
      if (this.userProfile){
        this.store.dispatch('user/setFacility', {
          'facility': this.userProfile.facilities.find((fac: any) => fac.facilityId == facility['detail'].value)
        });
        this.getCurrentFacilityDetails();
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

        if(resp.status == 200 && !hasError) {
          this.currentFacilityDetails.maximumOrderLimit = maximumOrderLimit
          showToast(translate('Facility updated successfully'))
        } else {
          showToast(translate('Failed to update facility'))
          console.error(resp.data)
        }
      } catch(err) {
        showToast(translate('Failed to update facility'))
        console.error(err)
      }
    },
    async turnOnFulfillment() {
      const alert = await alertController.create({
        header: translate(`Turn on fulfillment for ${this.currentFacility.name}`),
        buttons: [{
          text: translate('Cancel'),
          role: 'cancel'
        }, {
          text: translate('Save')
        }],
        inputs: [{
          type: 'number',
          placeholder: translate('Set Limit'),
        }],
      });

      alert.onDidDismiss().then((data) => {
        if(data.role !== 'cancel') {
          // using 0 index as we only have a single input in alert
          this.updateFacility(data.data.values[0])
        }
      });

      await alert.present();
    },
    async turnOffFulfillment() {
      const alert = await alertController.create({
        header: translate(`Turn off fulfillment for ${this.currentFacility.name}`),
        message: translate('Are you sure you want perform this action?'),
        buttons: [{
          text: translate('Cancel'),
          role: 'cancel'
        }, {
          text: translate('Save'),
          handler: () => {
            this.updateFacility(0);
          }
        }]
      });

      await alert.present();
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      codeWorkingOutline,
      ellipsisVerticalOutline,
      timeOutline,
      router,
      store
    }
  }
});
</script>

<style scoped>
.text-wrap {
  white-space: normal;
}
</style>