<template>
  <ion-menu side="end" type="overlay">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate('Filters') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <!-- Carrier selection -->
        <ion-item lines="full">
          <ion-label>{{ translate('Carrier') }}</ion-label>
        </ion-item>
        <ion-radio-group :value="completedOrders.query.selectedCarrierPartyId" @ionChange="updateSelectedCarrierPartyIds($event.detail.value)">
          <ion-item lines="none">
            <ion-radio label-placement="start" value="">
              <ion-label class="ion-text-wrap">{{ translate('All') }}</ion-label>
            </ion-radio>
          </ion-item>
          <ion-item lines="none" v-for="carrierPartyId in carrierPartyIds" :key="carrierPartyId.id">
            <ion-radio label-placement="start" :value="carrierPartyId.id">
              <ion-label class="ion-text-wrap">{{ getPartyName(carrierPartyId.id) }}</ion-label>
            </ion-radio>
          </ion-item>
        </ion-radio-group>

        <!-- Shipment method selection -->
        <ion-item lines="full">
          <ion-label>{{ translate('Shipment Method') }}</ion-label>
        </ion-item>
        <ion-item button v-for="shipmentMethod in shipmentMethods" :key="shipmentMethod.val" @click="updateSelectedShipmentMethods(shipmentMethod.val)">
          <ion-checkbox label-placement="start" :checked="completedOrders.query.selectedShipmentMethods.includes(shipmentMethod.val)">
            {{ getShipmentMethodDesc(shipmentMethod.val) }}
          </ion-checkbox>
        </ion-item>

        <!-- Result size selection -->
        <ion-item lines="full">
          <ion-label>{{ translate('Result Size') }}</ion-label>
        </ion-item>
        <ion-radio-group :value="completedOrders.query.viewSize" @ionChange="updateViewSize($event.detail.value)">
          <ion-item v-for="count in prepareViewSizeOptions()" :key="count">
            <ion-radio label-placement="start" :value="count">{{ count }} {{ count === 1 ? translate('order') : translate('orders') }}</ion-radio>
          </ion-item>
        </ion-radio-group>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script lang="ts">
import emitter from '@/event-bus';
import {
  IonCheckbox,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonRadio,
  IonRadioGroup,
  IonTitle,
  IonToolbar,
  menuController
} from '@ionic/vue';
import { computed, defineComponent } from 'vue';
import { useStore } from 'vuex';
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: 'CompletedFilters',
  components: {
    IonCheckbox,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonRadio,
    IonRadioGroup,
    IonTitle,
    IonToolbar
  },
  props: {
    carrierPartyIds: {
      type: Array,
      default: () => []
    },
    shipmentMethods: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    completedOrders() {
      return this.store.getters['order/getCompletedOrders']
    },
    getPartyName() {
      return this.store.getters['util/getPartyName']
    },
    getShipmentMethodDesc() {
      return this.store.getters['util/getShipmentMethodDesc']
    }
  },
  methods: {
    prepareViewSizeOptions () {
      const maxViewSize = this.completedOrders.total > 100 ? 100 : this.completedOrders.total
      return [ ...Array(Math.ceil(maxViewSize / 5)).keys() ].map(i => {
        const count = (i + 1) * 5
        return count > maxViewSize ? maxViewSize : count
      })
    },
    async updateViewSize(size: number) {
      if(this.completedOrders.query.viewSize == size) return
      emitter.emit('updateOrderQuery', size)
      await menuController.close()
    },
    async updateSelectedShipmentMethods(method: string) {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))
      const selectedShipmentMethods = completedOrdersQuery.selectedShipmentMethods
      const index = selectedShipmentMethods.indexOf(method)
      if(index < 0) {
        selectedShipmentMethods.push(method)
      } else {
        selectedShipmentMethods.splice(index, 1)
      }
      completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      completedOrdersQuery.selectedShipmentMethods = selectedShipmentMethods
      this.$emit("update-shipment-methods", selectedShipmentMethods)
      await this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
    },
    async updateSelectedCarrierPartyIds(carrierPartyId: string) {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))
      completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      completedOrdersQuery.selectedCarrierPartyId = carrierPartyId
      this.$emit("update-carrier", carrierPartyId)
      await this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
    }
  },
  setup() {
    const store = useStore()
    return { store, translate }
  }
})
</script>
