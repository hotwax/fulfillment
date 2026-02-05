<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="edit-packaging-modal-close-button" @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Edit packaging") }}</ion-title>
      <ion-buttons slot="end">
        <ion-button data-testid="edit-packaging-modal-save-button" fill="clear">{{ translate("Save") }}</ion-button>
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
            <p>{{ translate("Ordered") }} 27th January 2020 9:24 PM EST</p>
          </ion-label>
        </div>

        <div class="order-metadata">
          <ion-label>
            Next Day Shipping
            <p>{{ translate("Ordered") }} 28th January 2020 2:32 PM EST</p>
          </ion-label>
        </div>
      </div>

      <div class="order-item">
        <div class="product-info">
          <ion-item lines="none">
            <ion-thumbnail slot="start">
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
            <ion-select data-testid="edit-packaging-modal-product-box-select" :label="translate('Select box')">
              <ion-select-option>Box A Type 3</ion-select-option>
              <ion-select-option>Box B Type 2</ion-select-option>
            </ion-select>
          </ion-item>
        </div>
      </div>
    </ion-card> 

    <ion-list>
      <ion-item lines="none">
        <ion-note slot="start">{{ translate('Boxes') }}</ion-note>
        <ion-button data-testid="edit-packaging-modal-add-box-button" fill="clear" slot="end">
          {{ translate("Add") }}
          <ion-icon :icon="addCircleOutline"/>
        </ion-button>
      </ion-item>
      <ion-item>
        <ion-select data-testid="edit-packaging-modal-box-type-select" label="Box A" value="3">
          <ion-select-option value="1">Type 1</ion-select-option>
          <ion-select-option value="2">Type 2</ion-select-option>
          <ion-select-option value="3">Type 3</ion-select-option>  
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
  IonNote,
  IonSelect,
  IonSelectOption,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { addCircleOutline, closeOutline, pricetag } from "ionicons/icons";
import { translate } from '@hotwax/dxp-components'

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
    IonNote,
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
      addCircleOutline,
      closeOutline,
      pricetag,
      translate
    };
  },
});
</script>