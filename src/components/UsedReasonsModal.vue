<template>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeModal"> 
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate("Used reasons") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list v-if="usedReasons.length">
        <ion-item v-for="(reason, index) in usedReasons" :key="reason.enumId" :lines="usedReasons.length -1 === index ? 'none' : 'inset'">
          <ion-label>
            {{ reason.description }}
            <p>{{ reason.enumTypeId }}</p>
          </ion-label>
          <ion-note slot="end"> {{ reason.count }}</ion-note>
        </ion-item>
      </ion-list>
      <div class="empty-state" v-else>
        <p>{{ translate("No reasons found.") }}</p>
      </div>
    </ion-content>
  </template>
  
  <script>
  import { 
    IonButtons,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonNote,
    IonTitle,
    IonToolbar,
    modalController } from "@ionic/vue";
  import { computed, defineComponent } from "vue";
  import { mapGetters } from 'vuex';
  import { closeOutline, pricetag } from "ionicons/icons";
  import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
    
  
  export default defineComponent({
    name: "RejectedItemsModal",
    components: { 
        IonButtons,
        IonButton,
        IonContent,
        IonHeader,
        IonIcon,
        IonItem,
        IonLabel,
        IonNote,
        IonTitle,
        IonToolbar
    },
    computed: {
      ...mapGetters({
        usedReasons: 'rejection/getUsedReasons',
      })
    },
    methods: {
      closeModal() {
        modalController.dismiss({ dismissed: true });
      },
    },
    setup() {
      const productIdentificationStore = useProductIdentificationStore();
      let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
  
      return {
        closeOutline,
        pricetag,
        productIdentificationPref,
        productIdentificationStore,
        getProductIdentificationValue,
        translate
      };
    },
  });
  </script>
  