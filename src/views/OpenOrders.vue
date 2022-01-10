<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>10 {{("of")}} 26 {{ $t("orders") }}</ion-title>
        <ion-buttons  slot="end">
        <ion-menu-button>
          <ion-icon :icon="optionsOutline" />
        </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
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
    IonToolbar
  },
  methods: {
    async assignPickers() {
      const bgjobmodal = await modalController.create({
        component: AssignPickerModal
      });
      return bgjobmodal.present();
    },
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

.card-header {
  display: grid;
  grid: "tags"
        "info"
        "metadata"/ 1fr;
  justify-content: start;
  border-bottom: 1px solid black;        
}

.order-primary-info {
  grid-area: info;
}

.order-tags {
  grid-area: tags;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid black;
}

.order-metadata {
  grid-area: metadata;
}  

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}  

@media (min-width: 991px) {
  .card-header {
    grid: "info tags metadata" / max-content 1fr max-content;
    align-items: center;
  }

  .order-tags {
    justify-self: center;
    border-bottom: none;
  }

  .order-metadata {
    text-align: end;
  }

  .order-item {
    border-bottom: 1px solid black;
  }  
}
</style>