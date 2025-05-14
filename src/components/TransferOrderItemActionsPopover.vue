<template>
  <ion-content>
    <ion-list>
      <ion-list-header v-if="item?.productId">{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}</ion-list-header>
      <ion-item :disabled="item?.noMatchFound" button @click="handleItemAction('bookQOH')">
        {{ translate("Book QoH") }}
      </ion-item>
      <ion-item :disabled="item?.noMatchFound" button @click="handleItemAction('bookATP')">
        {{ translate("Book ATP") }}
      </ion-item>
      <ion-item button lines="none" @click="handleItemAction('remove')">
        {{ translate("Remove from order") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import { IonContent, IonItem, IonList, IonListHeader, popoverController } from "@ionic/vue"
import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { defineComponent } from "vue";
import { mapGetters } from "vuex";

export default defineComponent({
  name: "TransferOrderItemActionsPopover",
  components: {
    IonContent,
    IonItem,
    IonList,
    IonListHeader
  },
  computed: {
    ...mapGetters({
      getProduct: "product/getProduct"
    })
  },
  props: ["item"],
  methods: {
    handleItemAction(action: string) {
      popoverController.dismiss({ action })
    }
  },
  setup() {
    const productIdentificationStore = useProductIdentificationStore();

    return {
      getProductIdentificationValue,
      productIdentificationStore,
      translate
    }
  }
})
</script>