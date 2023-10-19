<template>
    <ion-page>
        <ShippingDetails />
    </ion-page>
  </template>
  
<script lang="ts">
  import { IonPage } from '@ionic/vue';
  import { defineComponent } from 'vue';
  import ShippingDetails from '@/views/ShippingDetails.vue';
  
  export default defineComponent({
    name: 'OrderDetails',
    components: {
        IonPage,
        ShippingDetails
    }
  });
</script>