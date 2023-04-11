<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>10 {{("to")}} 26 {{ $t("orders") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="() => router.push('/upload-csv')">{{ $t("Upload CSV") }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <ion-searchbar />  

      <div class="filters">
        <ion-item lines="none">
          <ion-checkbox slot="start"/>
          <ion-label>
            Fedex
            <p>30 {{ $t("packages") }}</p>
          </ion-label>
          <ion-icon :icon="printOutline" />
        </ion-item>
        <ion-item lines="none">
          <ion-checkbox slot="start"/>
          <ion-label>
            UPS
            <p>10 {{ $t("packages") }}</p>
          </ion-label>
          <ion-icon :icon="downloadOutline" />
        </ion-item>
      </div> 

      <ion-button expand="block" class="bulk-action desktop-only" fill="outline" @click="shipOrderAlert">{{ $t("Ship") }}</ion-button>

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

          <div class="product-metadata mobile-only">
            <ion-note>49 {{ $t("pieces in stock") }}</ion-note>
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

          <div class="product-metadata mobile-only">
            <ion-note>49 {{ $t("pieces in stock") }}</ion-note>
          </div>
        </div>

        <div class="mobile-only">
          <ion-item>
            <ion-button fill="clear" @click="shipOrderAlert">{{ $t("Ship Now") }}</ion-button>
            <ion-button slot="end" fill="clear" color="medium" @click="shippingPopover">
              <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
            </ion-button>
          </ion-item>
        </div>

        <div class="actions">  
          <div class="desktop-only">
            <ion-button @click="shipOrderAlert">{{ $t("Ship Now") }}</ion-button>
            <ion-button fill="outline">{{ $t("Print Shipping Label") }}</ion-button>
            <ion-button fill="outline">{{ $t("Print Customer Letter") }}</ion-button>
          </div>
          <div class="desktop-only">
            <ion-button fill="outline" color="danger">{{ $t("Unpack") }}</ion-button>
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
  IonMenuButton,
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
    IonMenuButton,
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
           header: this.$t("Ship orders"),
           message: this.$t("You are shipping orders. You cannot unpack and edit orders after they have been  shipped. Are you sure you are ready to ship this orders.", {count: 15, space: '<br /><br />'}),       
           buttons: [this.$t("Cancel"), this.$t("Ship")],
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