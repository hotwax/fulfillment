<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>10 of 26 orders</ion-title>
        <ion-buttons  slot="end">
        <ion-menu-button>
          <ion-icon :icon="options" />
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
            <p>37 orders, 40 items</p>
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-checkbox slot="start"/>
          <ion-label>
            Next day
            <p>37 orders, 40 items</p>
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-checkbox slot="start"/>
          <ion-label>
            Loyalty
            <p>37 orders, 40 items</p>
          </ion-label>
        </ion-item>
      </div> 

      <ion-button class="desktop-only" fill="outline" @click="assignPickers">Print Picksheet</ion-button>

      <ion-card>
        <div class="card-header">
          <div class="order-primary-info">
            <ion-label>
              Darooty Magwood
              <p>Ordered 27th January 2020 9:24 PM EST</p>
            </ion-label>
          </div>

          <div class="order-tags">
            <ion-chip outline>
              <ion-icon :icon="pricetag" />
              <ion-label>NN10584</ion-label>
            </ion-chip>
            <ion-button fill="clear" class="mobile-only" color="danger">
              <ion-icon slot="icon-only" :icon="refreshCircleOutline" />
            </ion-button>
          </div>

          <div class="order-metadata">
            <ion-label>
              Next Day Shipping
              <p>Ordered 28th January 2020 2:32 PM EST</p>
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
            <ion-note>49 pieces in stock</ion-note>
          </div>
        </div>

        <div class="actions">  
          <div class="positive-action"></div>
          <div class="negative-action">
            <ion-button class="desktop-only" fill="outline" color="danger">Recycle</ion-button>
          </div>
        </div>
      </ion-card>

      <ion-fab class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="assignPickers">
          <ion-icon :icon="print" />
        </ion-fab-button>
      </ion-fab> 
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonButtons, IonCard, IonChip, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonLabel, IonIcon, IonItem, IonMenuButton, IonNote, IonPage, IonSearchbar, IonThumbnail, IonTitle, IonToolbar, modalController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { options, pricetag, print, refreshCircleOutline } from 'ionicons/icons';
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
      options,
      pricetag,
      print,
      refreshCircleOutline
    }
  }
});
</script>

<style scoped>

.filters > ion-item {
 flex: 1 0 100%;
 max-width: 200px;
 border: 0.01px solid black;
 border-radius: 10px;
}

.card-header {
  display: grid;
  grid: "tags"
        "current"
        "next"/ 1fr;
  justify-content: start;
  border-bottom: 1px solid black;        
}

.order-primary-info {
  grid-area: current;
}

.order-tags {
  grid-area: tags;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid black;
}

.order-metadata {
  grid-area: next;
}  

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}  

ion-thumbnail> img {
  object-fit: contain;
}

@media (min-width: 991px) {
  .card-header {
    grid: "current tags next" / max-content 1fr max-content;
    justify-items: center;
    align-items: center;
  }

  .order-tags {
    border-bottom: none;
  }

  .order-metadata {
    text-align: end;
  }

  .order-item {
    border-bottom: 1px solid black;
  }  

  .desktop-recycle {
    display: flex;
    justify-content: flex-end;
  }
}
</style>