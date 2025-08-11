<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start"/>
        <ion-title>Create transfer order</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <!--Transfer order cards -->
      <div class="transfer-order">
        <!-- order details -->
        <ion-card class="order-info">
          <ion-list lines="none">
            <ion-item>
              <ion-label>
                <p class="overline">Order Id</p>
                <h1>Order name</h1>
              </ion-label>
              <ion-button slot="end" color="medium" fill="outline">Edit</ion-button>
            </ion-item>
            <ion-item>
              <ion-icon :icon="storefrontOutline" slot="start"/>
              <ion-label>Store name</ion-label>
              <ion-button slot="end" color="medium" fill="outline" size="small">Edit</ion-button>
            </ion-item>
            <ion-item>
              <ion-icon :icon="checkmarkDoneOutline" slot="start"/>
              <ion-toggle>Complete order on fulfillment</ion-toggle>
            </ion-item>
          </ion-list>
        </ion-card>

        <!-- adding product card -->
        <ion-card class="add-items">
          <div class="search-type">
            <h4>Add items</h4>
            <ion-segment>
              <ion-segment-button value="scan" content-id="scan">
                <ion-icon :icon="barcodeOutline"/>
              </ion-segment-button>
              <ion-segment-button value="search" content-id="search">
                <ion-icon :icon="searchOutline"/>
              </ion-segment-button>
            </ion-segment>
          </div>
          <!-- for barcode scanning -->
          <ion-item lines="full">
            <ion-input label="Scan barcode" placeholder="UPC" />
          </ion-item>
          <!-- before start scanning -->
          <ion-item lines="none">
            <ion-thumbnail>
              <DxpShopifyImg/>
            </ion-thumbnail>
            <ion-label>
              Your scanner isn’t focused yet.
              <p>Scanning is set to UPC</p>
              <p>Swap to SKU from the settings page</p>
            </ion-label>
            <ion-button slot="end" color="warning" size="small">
              <ion-icon slot="start" :icon="locateOutline"/>
              Focus scanning
            </ion-button>
          </ion-item>
              
          <!-- during scanning -->
          <!-- <ion-item lines="none">
            <ion-thumbnail>
              <DxpShopifyImg/>
            </ion-thumbnail>
            <ion-label>
              Begin scanning products to add them to this transfer
              <p>Scanning is set to UPC</p>
              <p>Swap to SKU from the settings page</p>
            </ion-label>
            <ion-badge slot="end" color="success">
              start scanning
            </ion-badge> 
          </ion-item> -->

          <!-- product found after scan -->
          <!-- <ion-item lines="none">
            <ion-thumbnail>
              <DxpShopifyImg/>
            </ion-thumbnail>
            <ion-label>
              Scanning identifier field
              <p>primary identifier</p>
              <p>secondary identifer</p>
            </ion-label>
            <ion-icon :icon="checkmarkDoneOutline" color="success" slot="end"/>
          </ion-item> -->

          <!-- when product does not match -->
          <!-- <ion-item lines="none">
            <ion-icon :icon="cloudOfflineOutline" slot="start"/>
            <ion-label>
              Scanned value not found
              <p>Try searching using a keyword instead</p>
            </ion-label>
            <ion-button size="small" slot="end" color="primary">
              <ion-icon slot="start" :icon="searchOutline"/>
              Search
            </ion-button>
          </ion-item> -->

          <!-- for searching products -->
          <!-- <ion-searchbar/> -->

          <!-- before searching -->
          <!-- <ion-item lines="none">
            <ion-icon :icon="shirtOutline" slot="start"/>
            Search for products by their Parent name, SKU or UPC
          </ion-item> -->

          <!-- after searching -->
          <!-- <ion-item lines="none">
            <ion-thumbnail>
              <DxpShopifyImg/>
            </ion-thumbnail>
            <ion-label>
              primary identifier
              <p>secondary identifer</p>
            </ion-label>
            <ion-button slot="end" fill="outline" color="primary">Add to transfer</ion-button>
          </ion-item>
          <ion-item lines="none" detail>
            View result count more results
          </ion-item> -->
        </ion-card>
      </div>

      <!-- content below the card before searching -->
      <!-- do we have an empty state class which automatically does this cenetering logic? -->
      <div class="ion-text-center">
        <p>Add items to this transfer by scanning or searching for products using keywords</p>
        <ion-button color="primary" fill="solid">
          <ion-icon :icon="barcodeOutline" slot="start"/>
          Starts scanning
        </ion-button>
        <ion-button fill="outline">
          <ion-icon :icon="searchOutline" slot="start"/>
          Search products
        </ion-button>
      </div>

      <div>
        <!-- <h1>Transfer items</h1>
        <template>
          <TransferOrderItem />
        </template> -->
      </div>
    </ion-content>
    <!-- footer -->
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button size="small" color="danger" fill="outline">
            Discard order
          </ion-button>
          <ion-button size="small" fill="outline">
            Ship later
          </ion-button>
          <ion-button size="small" color="primary" fill="solid">
            Pack and ship order          
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { defineComponent } from 'vue';
import { IonBackButton, IonCard, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonPage, IonSegment, IonSegmentButton, IonTitle, IonToolbar, IonChip } from '@ionic/vue';
import { barcodeOutline, checkmarkDoneOutline, cloudOfflineOutline, informationCircleOutline, locateOutline, mailOpenOutline, mailUnreadOutline, searchOutline, sendOutline, shirtOutline, storefrontOutline } from 'ionicons/icons';
import { DxpShopifyImg } from '@hotwax/dxp-components';

</script>

<style scoped>

/* add media query for desktop only */
.transfer-order {
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

.add-items {
  flex: 3;
}

.search-type {
  display: flex;
}
</style>