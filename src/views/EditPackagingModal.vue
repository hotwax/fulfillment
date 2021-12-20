<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Edit packaging") }}</ion-title>
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
          <ion-item lines="none">   
            <ion-label>{{ $t("Select box") }}</ion-label>
            <ion-select>
              <ion-select-option>{{ $t("Box A") }} {{ $t("Type 3") }}</ion-select-option>
              <ion-select-option>{{ $t("Box B") }} {{ $t("Type 2") }}</ion-select-option>
            </ion-select>
          </ion-item>
        </div>
      </div>
    </ion-card> 

    <ion-list>
      <ion-list-header>{{ $t("Boxes") }}</ion-list-header>
      <ion-item>
        <ion-label>{{ $t("Box A") }}</ion-label>
        <ion-select value="3">
          <ion-select-option value="1">{{ $t("Type 1") }}</ion-select-option>
          <ion-select-option value="2">{{ $t("Type 2") }}</ion-select-option>
          <ion-select-option value="3">{{ $t("Type 3") }}</ion-select-option>  
        </ion-select>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script>
import { 
  IonButtons,
  IonButton,
  IonCard,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSelect,
  IonSelectOption,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { close, pricetag } from "ionicons/icons";
export default defineComponent({
  name: "EditPackagingModal",
  components: { 
    IonButtons,
    IonButton,
    IonCard,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonSelect,
    IonSelectOption,
    IonThumbnail,
    IonTitle,
    IonToolbar,
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

.order-metadata {
  border-bottom: 1px solid black;
}
.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}  
</style>