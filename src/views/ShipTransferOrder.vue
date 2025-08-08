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
      <div class="transfer-order">
        <!-- order details -->
        <ion-card class="order-info">
          <ion-list>
            <ion-item lines="none">
              <ion-label>
                <p class="overline">Order Id</p>
                <h1>Order name</h1>
              </ion-label>
            </ion-item>
            <ion-item lines="full">
              <ion-icon :icon="storefrontOutline" slot="start"/>
              <ion-label>
                <p class="overline">Sending to</p>
                Store name
                <p>50 miles</p>
              </ion-label>
            </ion-item>
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
            <ion-item lines="none">
              <ion-button fill="clear">Edit</ion-button>
            </ion-item>
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
              <ion-thumbnail>
                <DxpShopifyImg/>
              </ion-thumbnail>
              <ion-label>
                Rate name
                <p>estimated delivery date</p>
              </ion-label>
              <ion-button slot="end" color="primary" fill="outline">Purchase label</ion-button>
            </ion-item>
            <ion-item>
              <ion-thumbnail>
                <DxpShopifyImg/>
              </ion-thumbnail>
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
            <ion-item lines="none">
              <ion-input label="Tracking code" placeholder="enter code" />
            </ion-item>
            <hr/>
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
              <ion-thumbnail>
                <DxpShopifyImg/>
              </ion-thumbnail>
              <ion-label>
                Rate name
                <p>estimated delivery date</p>
              </ion-label>
              <ion-note class="ion-margin">tracking code</ion-note>
              <ion-icon :icon="openOutline"/>
            </ion-item>
            <ion-card-content>
              <ion-button fill="outline" color="primary">
                <ion-icon :icon="printOutline" slot="start"/>
                Re-print shipping label
              </ion-button>
              <ion-button fill="outline" color="warning">Void shipping label</ion-button>
            </ion-card-content>
          </ion-card>
        </div>
      </div>
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
import { IonBackButton, IonButton, IonButtons, IonCard, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonPage, IonSegment, IonSegmentButton, IonTitle, IonToggle, IonToolbar } from '@ionic/vue'
import { checkmarkDoneOutline, openOutline, printOutline, storefrontOutline } from 'ionicons/icons'
</script>

<style scoped >
.transfer-order {
  display: grid;
  grid-template-areas: "order-info shipping";
  grid-template-columns: 1fr 3fr;
  gap: var(--spacer-base);
  padding: var(--spacer-base);
}

.transfer-order > * {
  margin: 0;
}

.order-info {
  grid-area: order-info;
}

.shipping {
  grid-area: shipping;
}

hr {
  margin: 0;
}

ion-note {
  align-self: center;
}
</style>