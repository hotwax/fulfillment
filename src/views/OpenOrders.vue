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
        <ion-row class="filter-scroll">
          <ion-item lines="none">
            <ion-checkbox slot="start"/>
            <ion-label>
              <h5>Same day</h5>
              <p>37 orders, 40 items</p>
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-checkbox slot="start"/>
            <ion-label>
              <h5>Next day</h5>
              <p>37 orders, 40 items</p>
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-checkbox slot="start"/>
            <ion-label>
              <h5>Loyalty</h5>
              <p>37 orders, 40 items</p>
            </ion-label>
          </ion-item>
        </ion-row>
      </div> 

      <ion-button class="desktop-print" fill="outline">Print Picksheet</ion-button>

      <ion-card>
        <div class="card-header">
          <div class="order-primary-info">
            <ion-label>
              <h2>Darooty Magwood</h2>
              <p>Ordered 27th January 2020 9:24 PM EST</p>
            </ion-label>
          </div>

          <div class="order-tags">
            <ion-chip outline>
              <ion-icon :icon="pricetag" />
              <ion-label>NN10584</ion-label>
            </ion-chip>
            <ion-button fill="clear" class="mobile-recycle" color="danger">
              <ion-icon slot="icon-only" :icon="refreshCircleOutline" />
            </ion-button>
          </div>

          <div class="order-metadata">
            <ion-label>
              <h2>Next Day Shipping</h2>
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
                <h6>WJ06-XL-PURPLE</h6>
                <h3>Juno Jacket</h3>
                <p>Blue XL</p>
              </ion-label>
            </ion-item>
          </div>
          <div class="product-metadata">
            <ion-note>49 pieces in stock</ion-note>
          </div>
        </div>

        <div class="positive-action"></div>

        <div class="negative-action">
          <ion-button fill="outline" color="danger">Recycle</ion-button>
        </div>
      </ion-card>

      <ion-fab class="mobile-print" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button>
          <ion-icon :icon="print" />
        </ion-fab-button>
      </ion-fab> 
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonButtons, IonCard, IonChip, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonLabel, IonIcon, IonItem, IonMenuButton, IonNote, IonPage, IonRow, IonSearchbar, IonThumbnail, IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';
import { options, pricetag, print, refreshCircleOutline } from 'ionicons/icons'

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
    IonRow,
    IonSearchbar,
    IonThumbnail,
    IonTitle,
    IonToolbar
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

.filters {
  display: flex;
  overflow: scroll;
}

.filter-scroll {
  flex-wrap: nowrap;
}

.filter-scroll > ion-item {
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

.desktop-recycle {
  display: none;
}

.desktop-print {
  display: none;
}

@media (min-width: 991px) {

  .desktop-print {
    display: block;
    margin: 0 10px;
  }

  .mobile-print {
    display: none;
  }

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

  .mobile-recycle {
    display: none;
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