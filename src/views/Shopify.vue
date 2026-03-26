<template>
  <ion-page>
    <ion-content>
      <div class="center-div">
        <p>{{ $t("Logging in...") }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage, onIonViewDidEnter, onIonViewDidLeave } from "@ionic/vue";
import { ref } from "vue";
import router from "@/router";
import { commonUtil, emitter, translate, useNotificationStore, useShopify } from "@common";
import { useUserStore } from "@/store/user";
import { useProductStore } from "@/store/productStore";
import { useUtilStore } from "@/store/util";
import { firebaseUtil } from "@/utils/firebaseUtil";

const { appBridgeLogin } = useShopify();

onIonViewDidEnter(async () => {
  console.log("=-=-=-=- On Shopify Page")
  emitter.emit("presentLoader");

  let { shop, host } = router.currentRoute.value.query;
  
  const success = await appBridgeLogin(shop as string, host as string);
  
  if (success) {
      await useUserStore().fetchPermissions()
      await useUserStore().fetchUserProfile()
      const productStore = useProductStore()
      await productStore.fetchUserFacilities()
      await productStore.fetchFacilityPreference()
      await productStore.fetchProductStores()
      await productStore.fetchProductStorePreference()
      await productStore.fetchEComStoreDependencies(productStore.getCurrentEComStore.productStoreId)

      await useUtilStore().fetchCarrierShipmentBoxTypes()
      await productStore.fetchAutoShippingLabelConfig()

      const notificationStore = useNotificationStore();
      await notificationStore.fetchAllNotificationPrefs(import.meta.env.VITE_NOTIF_APP_ID, useUserStore().getUserProfile.userId)
      await firebaseUtil.initialiseFirebaseMessaging();


      const facilityId = router.currentRoute.value.query.facilityId
      let isQueryFacilityFound = false
      if (facilityId) {
        const facility = useUserStore().getUserProfile.facilities.find((facility: any) => facility.facilityId === facilityId);
        if (facility) {
          isQueryFacilityFound = true
          productStore.currentFacility = facility
        } else {
          commonUtil.showToast(translate("Redirecting to home page due to incorrect information being passed."))
        }
      }
    router.push("/");
  } else {
    router.push("/error");
  }
  
  emitter.emit("dismissLoader");
});

onIonViewDidLeave(() => {
  emitter.emit("dismissLoader");
});
</script>

<style scoped>
.center-div {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
