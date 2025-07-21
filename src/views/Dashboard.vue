<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Dashboard</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-margin">
      <!-- Fill Rate Card -->
      <div class="fulfillment">
        <ion-card class="fill-rate">
          <ion-item lines="none">
            <p class="overline">14th May Fill Rate</p>
            <ion-icon slot="end" :icon="informationCircleOutline" />
          </ion-item>
          <ion-list lines="none">
            <h1>23%</h1>
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

        <!-- Orders Pending Fulfillment Card -->
        <ion-card class="orders">
          <p class="overline ion-margin">Orders Pending Fulfillment</p>
          <div class="pending">
            <h1 class="count">3</h1>
            <ion-item class="details" lines="none">
              <ion-label>
                <p>Oldest order assigned</p>
                1 hour 10 minutes ago
              </ion-label>
            </ion-item>
          </div>
          <div class="fulfill">
            <ion-item lines="full" detail>
              <ion-icon :icon="mailUnreadOutline" slot="start" />
              <ion-label>1 open</ion-label>
            </ion-item>
            <ion-item lines="none" detail>
              <ion-icon :icon="mailOpenOutline" slot="start" />
              <ion-label>2 in progress</ion-label>
            </ion-item>
          </div>
        </ion-card>

        <FulfillmentProgressBar
          :total="14"
          :dataSegments="{
            Packed: { value: 6, color: '#3FBF60' },
            Rejected: { value: 1, color: '#EF5350' },
            Allocated: { value: 4, color: '#3880FF' }
          }"
        />

        <!-- Scheduling -->
        <div class="scheduling">
          <ion-item lines="none">
            <ion-icon slot="start" :icon="sendOutline" color="warning" />
            <ion-label>
              Carrier pickup scheduled
              <p>04:30pm</p>
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-icon slot="start" :icon="storefrontOutline" color="danger" />
            <ion-label>
              Store closes in 30 minutes
              <p>04:30pm</p>
            </ion-label>
          </ion-item> 
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
import FulfillmentProgressBar from '@/components/FulfillmentProgressBar.vue'

</script>

<style scoped>

/* add media query for desktop only */
.fulfillment {
  display: grid;
  grid-template-areas: "fill-rate orders"
                       "fill-rate progress-bar"
                       "fill-rate scheduling";
  grid-template-columns: 1fr 3fr;
  margin: var(--spacer-xs);
}

.fill-rate {
  grid-area: fill-rate;
}

FulfillmentProgressBar {
  grid-area: progress-bar;
}

.fill-rate h1, .orders h1 {
  font-size: 78px;
  padding-inline: var(--spacer-xs);
  margin: 0px;
}

.orders {
  grid-area: orders;
  display: grid;
  grid-template-areas: "title title"
                       "pending fulfill";
  grid-template-columns: auto 343px;
  grid-template-rows: min-content auto;
}

.pending {
  grid-area: pending;
  display: grid;
  grid-template-columns: min-content auto;
  align-items: end;
}

.title {
  grid-area: title;
}

.fulfill {
  grid-area: fulfill;
}

.scheduling {
  grid-area: scheduling;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacer-xs);
}

.scheduling ion-item::part(native) {
  --border-radius: var(--spacer-xs);
  border: var(--border-medium);
}
</style>