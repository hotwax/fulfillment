<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Assign Pickers") }}</ion-title>
      <ion-button :disabled="!selectedPickers.length" fill="clear" slot="end" @click="printPicklist()">{{ $t('Print Picklist') }}</ion-button>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; findPickers()"/>
    <ion-row>
      <ion-chip v-for="picker in selectedPickers" :key="picker.id">
        <ion-label>{{ picker.name }}</ion-label>
      </ion-chip>
    </ion-row>

    <ion-list>
      <ion-list-header>{{ $t("Staff") }}</ion-list-header>
      <!-- TODO: added click event on the item as when using the ionChange event then it's getting
      called every time the v-for loop runs and then removes or adds the currently rendered picker
      -->
      <div class="ion-padding" v-if="!pickers.length">{{ 'No picker found' }}</div>
      <div v-else>
        <ion-item v-for="(picker, index) in pickers" :key="index" @click="selectPicker(picker.id)">
          <ion-label>
            {{ picker.name }}
            <p>{{ picker.externalId ? picker.externalId : picker.id }}</p>
          </ion-label>
          <ion-checkbox :checked="isPickerSelected(picker.id)"/>
        </ion-item>
      </div>
    </ion-list>
  </ion-content>
</template>

<script>
import { 
  IonButtons,
  IonButton,
  IonCheckbox,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonRow,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { closeOutline } from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { showToast } from "@/utils";
import { hasError } from "@/adapter";
import { translate } from "@/i18n";
import { UtilService } from "@/services/UtilService";
import emitter from "@/event-bus";
import logger from "@/logger"
import { OrderService } from '@/services/OrderService';

export default defineComponent({
  name: "AssignPickerModal",
  components: { 
    IonButtons,
    IonButton,
    IonCheckbox,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonRow,
    IonSearchbar,
    IonTitle,
    IonToolbar,
  },
  computed: {
    ...mapGetters({
      currentFacility: 'user/getCurrentFacility',
      openOrders: 'order/getOpenOrders'
    })
  },
  data () {
    return {
      selectedPickers: [],
      queryString: '',
      pickers: []
    }
  },
  props: ["order"], // if we have order in props then create picklist for this single order only
  methods: {
    isPickerSelected(id) {
      return this.selectedPickers.some((picker) => picker.id == id)
    },
    closeModal() {
      modalController.dismiss({ dismissed: true });
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

      // creating picklist for orders that are currently in the list, means those are currently in the selected viewSize
      const orderItems = []

      if(this.order) {
        this.order.doclist.docs.map((item) => orderItems.push(item))
      } else {
        this.openOrders.list.map((order) => {
          order.doclist.docs.map((item) => orderItems.push(item))
        });
      }

      const formData = new FormData();
      formData.append("facilityId", this.currentFacility.facilityId);
      orderItems.map((item, index) => {
        formData.append("facilityId_o_"+index, this.currentFacility.facilityId)
        formData.append("shipmentMethodTypeId_o_"+index, item.shipmentMethodTypeId)
        formData.append("itemStatusId_o_"+index, "PICKITEM_PENDING")
        formData.append("shipGroupSeqId_o_"+index, item.shipGroupSeqId)
        formData.append("orderId_o_"+index, item.orderId)
        formData.append("orderItemSeqId_o_"+index, item.orderItemSeqId)
        formData.append("productId_o_"+index, item.productId)
        formData.append("quantity_o_"+index, item.itemQuantity)
        formData.append("inventoryItemId_o_"+index, item.inventoryItemId)
        formData.append("picked_o_"+index, item.itemQuantity)
        formData.append("_rowSubmit_o_"+index, "Y")
      })

      // Adding all the pickers selected in FormData
      // TODO: check if we need to only allow selection of 3 or less pickers as in the current fulfillment app we can only select 3 pickers
      this.selectedPickers.map((picker) => formData.append("pickerIds", picker.id))

      try {
        resp = await UtilService.createPicklist(formData);
        if (resp.status === 200 && !hasError(resp)) {
          this.closeModal();
          showToast(translate('Picklist created successfully'))

          // generating picklist after creating a new picklist
          await OrderService.printPicklist(resp.data.picklistId)

          await this.store.dispatch('order/findOpenOrders')
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
      let inputFields = {}
      this.pickers = []

      if(this.queryString.length > 0) {
        inputFields = {
          firstName_value: this.queryString,
          firstName_op: 'contains',
          firstName_ic: 'Y',
          firstName_grp: '1',
          externalId_value: this.queryString,
          externalId_op: 'contains',
          externalId_ic: 'Y',
          externalId_grp: '2',
          lastName_value: this.queryString,
          lastName_op: 'contains',
          lastName_ic: 'Y',
          lastName_grp: '3',
          partyId_value: this.queryString,
          partyId_op: 'contains',
          partyId_ic: 'Y',
          partyId_grp: '4',
        }
      }

      const payload = {
        inputFields: {
          ...inputFields,
          roleTypeIdTo: 'WAREHOUSE_PICKER'
        },
        viewSize: 50,
        entityName: 'PartyRelationshipAndDetail',
        noConditionFind: 'Y',
        orderBy: "firstName ASC",
        filterByDate: "Y",
        distinct: "Y",
        fieldList: ["firstName", "lastName", "partyId", "externalId"]
      }

      try {
        const resp = await UtilService.getAvailablePickers(payload);
        if (resp.status === 200 && !hasError(resp)) {
          this.pickers = resp.data.docs.map((picker) => ({
            name: picker.firstName+ ' ' +picker.lastName,
            id: picker.partyId,
            externalId: picker.externalId
          }))
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('Failed to fetch the pickers information or there are no pickers available', err)
      }
    }
  },
  async mounted() {
    // getting picker information on initial load
    await this.findPickers()
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      store
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
