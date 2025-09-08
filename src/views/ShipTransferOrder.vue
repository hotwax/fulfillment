<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start"/>
        <ion-title>Ship transfer order</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <!--Transfer order cards -->
      <main>
        <!-- order details -->
        <ion-card class="desktop only order-info">
          <ion-card-header>
            <ion-card-subtitle>
              Order Id
            </ion-card-subtitle>
            <ion-card-title>
              Order name
            </ion-card-title>
          </ion-card-header>
          <ion-item lines="full">
            <ion-icon :icon="storefrontOutline" slot="start"/>
            <ion-label>
              <p class="overline">Sending to</p>
              Store name
              <p>50 miles</p>
            </ion-label>
          </ion-item>
          <ion-list>
            <ion-list-header>Items</ion-list-header>
            <ion-item>
              <ion-thumbnail>
                <DxpShopifyImg/>
              </ion-thumbnail>
              <ion-label>
                primary identifier
                <p>secondary identifer</p>
              </ion-label>
              <ion-label slot="end">Qty</ion-label>
            </ion-item>
            <div actions>
              <ion-button fill="clear">Edit</ion-button>
            </div>
          </ion-list>
        </ion-card>

        <!-- Shipping label  -->
        <div class="shipping">
          <ion-segment>
            <ion-segment-button value="first" content-id="first">Purchase shipping label</ion-segment-button>
            <ion-segment-button value="second" content-id="second">Manual tracking</ion-segment-button>
          </ion-segment>
          <!-- purchase shipping segment -->
          <!-- <ion-list>
            <ion-item>
              <ion-avatar slot="start">
                <img src="" alt="carrier-logo" />
              </ion-avatar>
              <ion-label>
                Rate name
                <p>estimated delivery date</p>
              </ion-label>
              <ion-button slot="end" color="primary" fill="outline">Purchase label</ion-button>
            </ion-item>
          </ion-list> -->

          <!-- manual tracking segment -->
          <!-- <ion-list>
            <ion-item>
              <ion-select label="Carrier" interface="popover" placeholder="Select">
                <ion-select-option>Fedex</ion-select-option>
                <ion-select-option>DHL</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-select label="Method" interface="popover" placeholder="Select">
                <ion-select-option>Ground</ion-select-option>
                <ion-select-option>DHL</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="full">
              <ion-input label="Tracking code" placeholder="enter code" />
            </ion-item>
            <ion-item lines="none">
              Tracking URL: fedex.com/tracking/12344
              <ion-button slot="end" color="primary" fill="clear">
                Test
                <ion-icon :icon="openOutline" slot="end"/>
              </ion-button>
            </ion-item>
          </ion-list> -->

          <!-- card after purchase shipping label generated -->
          <ion-card>
            <ion-item lines="full">
              <ion-avatar slot="start">
                <img src="" alt="carrier-logo" />
              </ion-avatar>
              <ion-label>
                Rate name
                <p>estimated delivery date</p>
              </ion-label>
              <ion-note slot="end" class="ion-margin">tracking code</ion-note>
              <ion-icon slot="end" :icon="openOutline"/>
            </ion-item>
            <ion-card-content>
              <ion-button fill="outline" color="primary">
                <ion-icon :icon="printOutline" slot="start"  size="small"/>
                Re-print shipping label
              </ion-button>
              <ion-button fill="outline" color="warning">Void shipping label</ion-button>
            </ion-card-content>
          </ion-card>
        </div>
      </main>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button fill="outline" color="primary">
            Ship later
          </ion-button>
          <ion-button fill="solid" color="primary">
            Ship order
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup>
import { IonAvatar, IonBackButton, IonButton, IonButtons, IonCard, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonPage, IonSegment, IonSegmentButton, IonTitle, IonToolbar } from '@ionic/vue'
import { openOutline, printOutline, storefrontOutline } from 'ionicons/icons'
</script>

<style scoped >

main {
  display: flex;
  align-items: start;
  gap: var(--spacer-base);
  padding: var(--spacer-base);
}

.transfer-order > * {
  margin: 0;
}

.order-info {
  flex: 1;
}

.shipping {
  flex: 3;
}

hr {
  margin: 0;
}

ion-note {
  align-self: center;
}
</style>