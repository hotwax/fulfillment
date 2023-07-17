<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t('EXIM') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ $t("Download") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ $t('Packed Orders') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t("Download orders that are packed and haven't been shipped yet. Use the downloaded file to send the packed order details to a carrier where shipping labels and tracking codes will be generated.") }}
          </ion-card-content>
          <div class="border-top">
            <ion-button fill="clear" @click="downloadPackedOrders">
              {{ $t('Download') }}
              <ion-icon slot="end" :icon="downloadOutline" />
            </ion-button>
          </div>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ $t("Import") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ $t('Shipped Orders') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('Import shipped order details from an external system based on tracking codes. Orders that have tracking codes will automatically be shipped at the end of the day.') }}
          </ion-card-content>
          <div class="border-top">
            <ion-button fill="clear" @click="uploadImportOrders">
              {{ $t('Import') }}
              <ion-icon slot="end" :icon="cloudUploadOutline" />
            </ion-button>
          </div>
        </ion-card>
      </section>

      <router-link to="saved-mappings">
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t('Saved mappings') }}
            </ion-card-title>
          </ion-card-header>
        </ion-card>
      </router-link>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { cloudUploadOutline, downloadOutline  } from 'ionicons/icons'
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'Exim',
  components: {
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCardContent,
    IonContent,
    IonHeader,
    IonIcon,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar
  },
  methods: {
    uploadImportOrders() {
      this.router.push('/upload-import-orders')
    },
    downloadPackedOrders() {
      this.router.push('/download-packed-orders')
    }
  },
  setup() {
    const router = useRouter();

    return {
      cloudUploadOutline,
      downloadOutline,
      router
    }
  }
});
</script>

<style scoped>
section {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  align-items: start;
}

.border-top {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>