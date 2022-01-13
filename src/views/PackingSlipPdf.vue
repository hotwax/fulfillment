<template>
  <ion-page>
    <div id="PDF">
      <h1>Packing Slip</h1>
      <table>
        <tr>
          <th>{{ $t("Shipment #") }}</th>
          <td>10796</td>
        </tr>
        <tr>
          <th>{{ $t("Status") }}</th>
          <td>Shipped</td>
        </tr>
        <tr>
          <th>{{ $t("Order #") }}</th>
          <td>NN10922/00001</td>
        </tr>
      </table>

      <h1>Package 1 out of 1</h1>
      <table>
        <tr>
          <th>{{ $t("Shipping Address") }}</th>
          <th>{{ $t("Shipping Method") }}</th>
        </tr>
        <tr>
          <td>
            <ul style="list-style-type:none;">
              <li>Name</li>
              <li>Address</li>
            </ul>
          </td>
          <td>Fedex Ground</td>
        </tr>
      </table>

      <table>
        <tr>
          <th>{{ $t("Product") }}</th>
          <th>{{ $t("Name") }}</th>
          <th>{{ $t("Quantity") }}</th>
        </tr>
        <tr>
          <td>Product</td>
          <td>Name</td>
          <td>Quantity</td>
        </tr>
      </table>

      <table>
        <tr>
          <th>{{ $t("Weight") }}</th>
          <td>1 lb</td>
        </tr>
        
      </table>
    </div>
  </ion-page>
</template>

<script>
import { IonPage } from '@ionic/vue'
import { defineComponent } from "vue";
import { mapGetters } from 'vuex';

export default defineComponent ({
  components: {
    IonPage
  }
})
</script>