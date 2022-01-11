<template>
<ion-page>
    <div id="PDF">
      <h1>{{ getCurrentFacility.name }}</h1>
      <table>
        <tr>
          <th>{{ $t("Order #") }}</th>
          <th>{{ $t("Product") }}</th>
          <th>{{ $t("To Pick") }}</th>
          <th>{{ $t("Picked") }}</th>
          <th>{{ $t("Assembled") }}</th>
        </tr>
        <div v-for="order in openOrders.list" :key="order.groupValue">
          <tr v-for="product in order.doclist.docs" :key="product.productId">
            <th>{{ product.orderId }}</th>
            <th>
              <ul style="list-style-type:none;">
                <li>{{ product.internalName }}</li>
                <li>{{ product.parentProductName }}</li>
                <li>{{$filters.getFeature(getProduct(product.productId).featureHierarchy, '1/COLOR/')}} {{$filters.getFeature(getProduct(product.productId).featureHierarchy, '1/SIZE/')}}</li>
              </ul>
            </th>
            <th>{{ product.quantity }}</th>
            <th></th>
            <th></th>
          </tr>
        </div>
      </table> 
    </div>
</ion-page>
</template>
<script>
import { IonPage } from '@ionic/vue'
import { defineComponent } from "vue";
import { mapGetters } from 'vuex';
export default defineComponent ({
  props: ['openOrders'],
  components: {
    IonPage
  },
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct',
      getCurrentFacility: 'user/getCurrentFacility'
    })
  }
})
</script> 