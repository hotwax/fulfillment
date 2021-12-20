<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>10 to 26 orders</ion-title>
        <ion-buttons slot="end">
            <ion-button fill="clear" @click="() => router.push('/upload-csv')">Upload Csv</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <ion-searchbar />  

      <div class="filters">
        <ion-item lines="none">
          <ion-checkbox slot="start"/>
          <ion-label>
            Fedex
            <p>30 packages</p>
          </ion-label>
          <ion-icon :icon="printOutline" />
        </ion-item>
        <ion-item lines="none">
          <ion-checkbox slot="start"/>
          <ion-label>
            UPS
            <p>10 packages</p>
          </ion-label>
          <ion-icon :icon="downloadOutline" />
        </ion-item>
      </div> 

      <ion-button expand="block" class="desktop-only" fill="outline" @click="shipOrderAlert">Ship</ion-button>

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
              <ion-icon :icon="pricetagOutline" />
              <ion-label>NN10584</ion-label>
            </ion-chip>
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

          <div class="product-metadata mobile-only">
            <ion-note>49 pieces in stock</ion-note>
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

          <div class="product-metadata mobile-only">
            <ion-note>49 pieces in stock</ion-note>
          </div>
        </div>

        <div class="mobile-only">
          <ion-item>
            <ion-button fill="clear" @click="shipOrderAlert">Ship Now</ion-button>
            <ion-button slot="end" fill="clear" color="medium" @click="shippingPopover">
              <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
            </ion-button>
          </ion-item>
        </div>

        <div class="actions">  
          <div class="desktop-only">
            <ion-button @click="shipOrderAlert">Ship now</ion-button>
            <ion-button fill="outline">Print Shipping Label</ion-button>
            <ion-button fill="outline">Print Customer Letter</ion-button>
          </div>
          <div class="desktop-only">
            <ion-button fill="outline" color="danger">Unpack</ion-button>
          </div>
        </div>
      </ion-card>

      <ion-fab class="mobile-only" vertical="bottom" horizontal="end">
        <ion-fab-button  @click="shipOrderAlert">
          <ion-icon :icon="checkmarkDoneOutline" />
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
  IonContent, 
  IonCheckbox, 
  IonFab, 
  IonFabButton, 
  IonHeader, 
  IonIcon, 
  IonItem, 
  IonLabel, 
  IonNote, 
  IonPage, 
  IonSearchbar, 
  IonThumbnail, 
  IonTitle, 
  IonToolbar, 
  alertController, 
  popoverController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { printOutline, downloadOutline, pricetagOutline, ellipsisVerticalOutline, checkmarkDoneOutline } from 'ionicons/icons'
import Popover from '@/views/ShippingPopover.vue'
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'Home',
  components: {
    IonButton,
    IonButtons, 
    IonCard, 
    IonChip,
    IonContent, 
    IonCheckbox, 
    IonFab, 
    IonFabButton, 
    IonHeader, 
    IonIcon, 
    IonItem, 
    IonLabel, 
    IonNote, 
    IonPage, 
    IonSearchbar,
    IonThumbnail, 
    IonTitle, 
    IonToolbar,
  },
  setup() {
    const router = useRouter();

    return {  
      printOutline, 
      downloadOutline, 
      pricetagOutline, 
      ellipsisVerticalOutline, 
      checkmarkDoneOutline,
      router
    }
  }, 
  methods: {
    async shipOrderAlert() {
      const alert = await alertController
        .create({
           header: 'Ship orders',
           message: 'You are shipping 15 orders. <br> You cannot unpack and edit orders after they have been  shipped. Are you sure you are ready to ship this orders.',       
           buttons: ['Cancel', 'Ship'],
        });
      return alert.present();
    },

    async shippingPopover(ev: Event) {
      const popover = await popoverController.create({
        component: Popover,
        event: ev,
        translucent: true,
        showBackdrop: false,
      });
      return popover.present();
    },
  }
});
</script>

<style scoped>
.order-primary-info {
  grid-area: info;
}

.order-tags {
  grid-area: tags;
  border-bottom: 1px solid black;
}

.order-metadata {
  grid-area: metadata;
  border-bottom: 1px solid black;
}

.card-header {
  display: grid;
  grid: "tags"
        "info"
        "metadata" / 1fr;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid black;
}  

@media (min-width: 991px) {
  .order-tags {
    border-bottom: none;
  }

  .order-metadata {
    text-align: end;
    border-bottom: none
  }

  .card-header {
    grid: "info tags metadata" / max-content 1fr max-content;
    justify-items: center;
    align-items: center;
    border-bottom: 1px solid black;
  }
}
</style>