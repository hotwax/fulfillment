<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Report an issue") }}</ion-title>
      <ion-buttons slot="end">
        <ion-button fill="clear">{{ $t("Save") }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

 <ion-content>
   <ion-card>
     <div class="card-header">
       <div class="order-tags">
         <ion-chip outline>
           <ion-icon :icon="pricetag" />
           <ion-label>NN10584</ion-label>
         </ion-chip>
       </div>

       <div class="order-primary-info">
         <ion-label>
           Darooty Magwood
           <p>{{ $t("Ordered") }} 27th January 2020 9:24 PM EST</p>
         </ion-label>
       </div>

       <div class="order-metadata">
         <ion-label>
           Next Day Shipping
           <p>{{ $t("Ordered") }} 28th January 2020 2:32 PM EST</p>
         </ion-label>
       </div>
     </div>
    </ion-card>

    <ion-card>
      <div class="order-item">
        <div class="product-info">
          <ion-item lines="none">
            <ion-thumbnail>
              <img src="https://dev-resources.hotwax.io/resources/uploads/images/product/m/j/mj08-blue_main.jpg" />
            </ion-thumbnail>
            <ion-label>
              <p class="overline">WJ06-XL-PURPLE</p>
              Juno Jacket
              <p>Blue XL</p>
            </ion-label>
          </ion-item>
        </div>

        <div class="product-metadata">
          <ion-note>49 {{ $t("pieces in stock") }}</ion-note>
        </div>
      </div>

      <ion-item>
        <ion-label>{{ $t("Select an issue") }}</ion-label>
        <ion-select value="a">
          <ion-select-option value="a">{{ $t("Out of stock") }}</ion-select-option>
          <ion-select-option value="b">{{ $t("Worn display") }}</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-card> 
  </ion-content>
</template>

<script>
import { 
  IonCard,
  IonChip,  
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonThumbnail,
  IonToolbar,
  modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { close, pricetag } from "ionicons/icons";
export default defineComponent({
  name: "ReportIssueModal",
  components: { 
     IonCard,
     IonChip,  
     IonButtons,
     IonButton,
     IonContent,
     IonHeader,
     IonIcon,
     IonItem,
     IonLabel,
     IonNote,
     IonSelect,
     IonSelectOption,
     IonTitle,
     IonThumbnail,
     IonToolbar
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
  },
  setup() {
    return {
      close,
      pricetag
    };
  },
});
</script>

<style scoped>
.order-tags {
    border-bottom: 1px solid black;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}  
</style>