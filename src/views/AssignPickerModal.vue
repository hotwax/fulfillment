<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="assign-picker-modal-close-button" @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Assign Pickers") }}</ion-title>
    </ion-toolbar>
    <ion-toolbar>
      <ion-searchbar data-testid="assign-picker-modal-searchbar" v-model="queryString" @keyup.enter="queryString = $event.target.value; findPickers()"/>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-row>
      <ion-chip data-testid="assign-picker-modal-selected-picker-chip" v-for="picker in selectedPickers" :key="picker.id">
        <ion-label>{{ picker.name }}</ion-label>
        <ion-icon data-testid="assign-picker-modal-remove-picker-icon" :icon="closeCircle" @click="selectPicker(picker.id)" />
      </ion-chip>
    </ion-row>

    <ion-list>

      <ion-list-header>{{ translate("Staff") }}</ion-list-header>
      <!-- TODO: added click event on the item as when using the ionChange event then it's getting
      called every time the v-for loop runs and then removes or adds the currently rendered picker
      -->
      <div v-if="isLoading" class="empty-state">
        <ion-spinner name="crescent" />
        <ion-label>{{ translate("Fetching pickers") }}</ion-label>
      </div>
      <div class="empty-state" v-else-if="!pickers.length">{{ "No picker found" }}</div>
      <div v-else>
        <ion-item data-testid="assign-picker-modal-picker-item" v-for="(picker, index) in pickers" :key="index" @click="selectPicker(picker.id)">
          <ion-checkbox data-testid="assign-picker-modal-picker-checkbox" :checked="isPickerSelected(picker.id)">
            <ion-label>
              {{ picker.name }}
              <p>{{ picker.externalId ? picker.externalId : picker.id }}</p>
            </ion-label>
          </ion-checkbox>
        </ion-item>
      </div>
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button data-testid="assign-picker-modal-save-button" :disabled="!selectedPickers.length" @click="printPicklist()">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script>
import { 
  IonButtons,
  IonButton,
  IonCheckbox,
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonRow,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
  modalController } from "@ionic/vue";
import { defineComponent, computed } from "vue";
import { closeOutline, closeCircle, saveOutline } from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { showToast } from "@/utils";
import { hasError } from "@/adapter";
import { translate, useUserStore } from '@hotwax/dxp-components'
import { UtilService } from "@/services/UtilService";
import emitter from "@/event-bus";
import logger from "@/logger"
import { OrderService } from '@/services/OrderService';
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: "AssignPickerModal",
  components: { 
    IonButtons,
    IonButton,
    IonCheckbox,
    IonChip,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonRow,
    IonSearchbar,
    IonSpinner,
    IonTitle,
    IonToolbar,
  },
  computed: {
    ...mapGetters({
      openOrders: 'order/getOpenOrders'
    })
  },
  data () {
    return {
      selectedPickers: [],
      queryString: '',
      pickers: [],
      isLoading: false,
    }
  },
  props: ["order"], // if we have order in props then create picklist for this single order only
  methods: {
    isPickerSelected(id) {
      return this.selectedPickers.some((picker) => picker.id == id)
    },
    closeModal(responseData) {
      modalController.dismiss({ dismissed: true, value: responseData });
    },
    selectPicker(id) {
      const picker = this.selectedPickers.some((picker) => picker.id == id)
      if (picker) {
        // if picker is already selected then removing that picker from the list on click
        this.selectedPickers = this.selectedPickers.filter((picker) => picker.id != id)
      } else {
        this.selectedPickers.push(this.pickers.find((picker) => picker.id == id))
      }
    },
    async printPicklist () {
      emitter.emit("presentLoader")
      let resp;
      const orderIdsToPick = []

      // creating picklist for orders that are currently in the list, means those are currently in the selected viewSize
      const orderItems = []

      if(this.order) {
        this.order.items.map((item) => orderItems.push(item))
        orderIdsToPick.push(this.order.orderId)
      } else {
        this.openOrders.list.map((order) => {
          order.items.map((item) => orderItems.push(item))
          orderIdsToPick.push(order.orderId)
        });
      }

      
      const payload = {
        packageName: "A", //default package name
        facilityId: this.currentFacility?.facilityId,
        shipmentMethodTypeId: orderItems[0]?.shipmentMethodTypeId,
        statusId: "PICKLIST_ASSIGNED",
        pickers: this.selectedPickers?.map(selectedPicker => ({
          partyId: selectedPicker.id,
          roleTypeId: "WAREHOUSE_PICKER"
        })) || [],
        orderItems: orderItems.map(({ orderId, orderItemSeqId, shipGroupSeqId, productId, quantity }) => ({
          orderId,
          orderItemSeqId,
          shipGroupSeqId,
          productId,
          quantity
        }))
      };

      try {
        resp = await OrderService.createPicklist(payload);
        if (resp.status === 200 && !hasError(resp)) {
          this.closeModal({picklistId: resp.data.picklistId, shipmentIds: resp.data.shipmentIds});
          showToast(translate('Picklist created successfully'))

          // generating picklist after creating a new picklist
          if (resp.data.picklistId) {
            await OrderService.printPicklist(resp.data.picklistId)
          }

          await this.store.dispatch('order/findOpenOrders')
          //Removing orders if the solr doc is not updated after picking
          if (orderIdsToPick.length) {
            const updatedOpenOrders = this.openOrders?.list.filter(openOrder => !orderIdsToPick.includes(openOrder.orderId))
            const outdatedOpenOrderCount = this.openOrders.list.reduce((count, openOrder) => 
              orderIdsToPick.includes(openOrder.orderId) ? count + 1 : count, 0
            );
            await this.store.dispatch('order/updateOpenOrderQuery', {...this.openOrders.query, viewSize: updatedOpenOrders.length})
            await this.store.dispatch('order/updateOpenOrders', {orders: updatedOpenOrders, total: this.openOrders.total - outdatedOpenOrderCount})
          }
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('Failed to create picklist for orders', err)
        showToast(translate('Failed to create picklist for orders'))
      }

      emitter.emit("dismissLoader")
    },
    async findPickers() {
      this.isLoading = true;
      let query = {}
      this.pickers = []

      if(this.queryString.length > 0) {
        let keyword = this.queryString.trim().split(' ')
        query = `(${keyword.map(key => `*${key}*`).join(' OR ')}) OR "${this.queryString}"^100`;
      }
      else {
        query = `*:*`
      }

      const facilityFilter = [];
      if(!hasPermission(Actions.APP_SHOW_ALL_PICKERS)){
        facilityFilter.push(`facilityIds:${this.currentFacility.facilityId}`)
      }

      const payload = {
        "json": {
          "params": {
            "rows": "50",
            "q": query,
            "defType" : "edismax",
            "qf": "firstName lastName groupName partyId externalId",
            "sort": "firstName asc"
          },
          "filter": ["docType:EMPLOYEE", "statusId:PARTY_ENABLED", "WAREHOUSE_PICKER_role:true", ...facilityFilter]
        }
      }

      try {
        const resp = await UtilService.getAvailablePickers(payload);
        if (resp.status === 200 && !hasError(resp)) {
          this.pickers = resp.data.response.docs.map((picker) => ({
            name: picker.groupName ? picker.groupName : (picker.firstName || picker.lastName)
                ? (picker.firstName ? picker.firstName : '') + (picker.lastName ? ' ' + picker.lastName : '') : picker.partyId,           
            id: picker.partyId,
            externalId: picker.externalId
          }))
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('Failed to fetch the pickers information or there are no pickers available', err)
      }
      this.isLoading = false
    }
  },
  async mounted() {
    // getting picker information on initial load
    await this.findPickers()
  },
  setup() {
    const store = useStore();
    const userStore = useUserStore()
    let currentFacility = computed(() => userStore.getCurrentFacility) 

    return {
      Actions,
      closeOutline,
      currentFacility,
      hasPermission,
      saveOutline,
      closeCircle,
      store,
      translate
    };
  },
});
</script>

<style scoped>
ion-row {
  flex-wrap: nowrap;
  overflow: scroll;
}
ion-chip {
  flex-shrink: 0;
}
</style>
