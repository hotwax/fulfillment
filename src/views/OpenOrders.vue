<template>
  <ion-page> 
    <PicklistSize content-id="picklist-size" />
    
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title>10 {{("of")}} 26 {{ $t("orders") }}</ion-title>
     
        <ion-buttons slot="end">
          <ion-menu-button menu="end">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content id="picklist-size">
      <ion-searchbar /> 

      <div class="filters">
        <ion-item lines="none">
          <ion-checkbox slot="start"/>
          <ion-label>
            Same Day
            <p>37 {{ $t("orders") }}, 40 {{ $t("items") }}</p>
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-checkbox slot="start"/>
          <ion-label>
            Next day
            <p>37 {{ $t("orders") }}, 40 {{ $t("items") }}</p>
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-checkbox slot="start"/>
          <ion-label>
            Loyalty
            <p>37 {{ $t("orders") }}, 40 {{ $t("items") }}</p>
          </ion-label>
        </ion-item>
      </div> 

      <ion-button class="desktop-only" fill="outline" @click="assignPickers">{{ $t("Print Picksheet") }}</ion-button>

      <ion-card>
        <div class="card-header">
          <div class="order-primary-info">
            <ion-label>
              Darooty Magwood
              <p>{{ $t("Ordered") }} 27th January 2020 9:24 PM EST</p>
            </ion-label>
          </div>

          <div class="order-tags">
            <ion-chip outline>
              <ion-icon :icon="pricetagOutline" />
              <ion-label>NN10584</ion-label>
            </ion-chip>
            <ion-button fill="clear" class="mobile-only" color="danger">
              <ion-icon slot="icon-only" :icon="refreshCircleOutline" />
            </ion-button>
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
            <ion-note>49 {{ $t("pieces in stock") }}</ion-note>
          </div>
        </div>

        <div class="actions">  
          <div class="positive-action"></div>
          <div class="negative-action">
            <ion-button fill="outline" color="danger">{{ $t("Recycle") }}</ion-button>
          </div>
        </div>
      </ion-card>

      <ion-fab class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="assignPickers">
          <ion-icon :icon="printOutline" />
        </ion-fab-button>
      </ion-fab> 
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { 
  IonButton, 
  IonButtons, 
  IonCard, 
  IonChip, 
  IonCheckbox, 
  IonContent, 
  IonFab, 
  IonFabButton, 
  IonHeader, 
  IonLabel, 
  IonIcon, 
  IonItem, 
  IonMenuButton, 
  IonNote, 
  IonPage, 
  IonSearchbar, 
  IonThumbnail, 
  IonTitle, 
  IonToolbar, 
  modalController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { optionsOutline, pricetagOutline, printOutline, refreshCircleOutline } from 'ionicons/icons';
import AssignPickerModal from '@/views/AssignPickerModal.vue';
import PicklistSize from '@/components/PicklistSize.vue';

export default defineComponent({
  name: 'OpenOrders',
  components: {
    IonButton,
    IonButtons,  
    IonCard,
    IonChip,
    IonCheckbox,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonLabel,
    IonIcon,
    IonItem,
    IonMenuButton,
    IonNote,
    IonPage,
    IonSearchbar,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    PicklistSize
  },
  methods: {
    async assignPickers() {
      const bgjobmodal = await modalController.create({
        component: AssignPickerModal
      });
      return bgjobmodal.present();
    }
  },
  setup() {
    return{
      optionsOutline,
      pricetagOutline,
      printOutline,
      refreshCircleOutline
    }
  }
});
</script>

<style scoped>

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: none;
}

</style>