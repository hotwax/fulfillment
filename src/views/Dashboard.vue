<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Dashboard</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <!-- Fill Rate Card -->
      <div class="header">
        <div>
          <ion-card>
            <ion-item lines="none">
              <p class="overline">14th May Fill Rate</p>
              <ion-icon slot="end" :icon="informationCircleOutline" />
            </ion-item>
            <ion-list lines="none">
              <ion-item>
                <h1 class="order-count">23%</h1>
              </ion-item>
              <ion-item>
                <ion-label>Order allocated</ion-label>
                <ion-label slot="end">10/14</ion-label>
              </ion-item>
              <ion-item>
                <ion-label>Orders packed</ion-label>
                <ion-label slot="end" color="success">6</ion-label>
              </ion-item>
              <ion-item>
                <ion-label>Orders rejected</ion-label>
                <ion-label slot="end" color="danger">1</ion-label>
              </ion-item>
            </ion-list>
          </ion-card>   
        </div>

        <div class="orders">
          <!-- Orders Pending Fulfillment Card -->
          <ion-card>
            <ion-item lines="none">
              <p class="overline">Orders Pending Fulfillment</p>
            </ion-item>
            <ion-item lines="none" class="fulfillment-card ">
              <div slot="start" class="left-info">
                <h1 class="order-count">3</h1>
                <ion-label class="ion-margin-top">
                  <p>Oldest order assigned</p>
                  1 hour 10 minutes ago
                </ion-label>
              </div>
              <div class="right-info">
                <ion-item detail>
                  <ion-icon :icon="mailUnreadOutline" slot="start" />
                  <ion-label>1 open</ion-label>
                </ion-item>
                <ion-item detail lines="none">
                  <ion-icon :icon="mailOpenOutline" slot="start" />
                  <ion-label>2 in progress</ion-label>
                </ion-item>
              </div>
            </ion-item>
          </ion-card>

          <OrderStatusBar
            :total="14"
            :dataSegments="{
              Packed: { value: 6, color: '#3FBF60' },
              Rejected: { value: 1, color: '#EF5350' },
              Allocated: { value: 4, color: '#3880FF' }
            }"
          />

          <!-- Notifications -->
          <div class="notification-items">
            <ion-item lines="none" class="item-box">
              <ion-icon slot="start" :icon="sendOutline" color="warning" />
              <ion-label>
                Carrier pickup scheduled
                <p>04:30pm</p>
              </ion-label>
            </ion-item>
            <ion-item lines="none" class="item-box">
              <ion-icon slot="start" :icon="storefrontOutline" color="danger" />
              <ion-label>
                Store closes in 30 minutes
                <p>04:30pm</p>
              </ion-label>
            </ion-item> 
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { defineComponent } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonIcon
} from '@ionic/vue';
import { informationCircleOutline, mailUnreadOutline, mailOpenOutline, sendOutline, storefrontOutline } from 'ionicons/icons';
import OrderStatusBar from '@/components/OrderStatusBar.vue'

</script>

<style scoped>
.order-count {
  font-size: 78px;
  font-weight: 400;
  margin: 0;
}

.header {
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 1rem;
}

.orders {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.fulfillment-card {
  display: flex;
}

.left-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1.5;
}

.right-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.notification-items {
  display: flex;
  gap: 1rem;
}

.notification-items ion-item {
  flex: 1;
}

.item-box::part(native) {
  --border-radius: var(--spacer-xs);
  border: var(--border-medium);
}
</style>
