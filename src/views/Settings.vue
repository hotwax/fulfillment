<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="user-profile">
        <ion-card>
          <ion-item lines="full">
            <ion-avatar slot="start" v-if="userProfile?.partyImageUrl">
              <Image :src="userProfile.partyImageUrl" />
            </ion-avatar>
            <ion-card-header class="ion-no-padding ion-padding-vertical">
              <ion-card-subtitle>{{ userProfile?.userLoginId }}</ion-card-subtitle>
              <ion-card-title>{{ userProfile?.partyName }}</ion-card-title>
            </ion-card-header>
          </ion-item>
          <ion-button color="danger" v-if="!useAuthStore().isEmbedded" @click="logout()">{{ translate("Logout") }}</ion-button>
          <ion-button :standalone-hidden="!hasPermission(Actions.APP_PWA_STANDALONE_ACCESS)" v-if="!useAuthStore().isEmbedded" fill="outline" @click="goToLaunchpad()">
            {{ translate("Go to Launchpad") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
        </ion-card>
      </div>

      <div class="section-header">
        <h1>{{ translate('OMS') }}</h1>
      </div>

      <section>
        <DxpOmsInstanceNavigator />
        <DxpProductStoreSelector @updateEComStore="updateEComStore($event)" />
        <DxpFacilitySwitcher @updateFacility="updateFacility($event)" />

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Online Order Fulfillment") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Configure the order fulfillment capacity of your facility.') }}
            <br /><br />
            {{ translate("Setting fulfillment capacity to 0 disables new order from being allocated to this facility. Leave this empty if this facility's fulfillment capacity is unrestricted.") }}
          </ion-card-content>
          <ion-item lines="none" v-if="orderLimitType === 'custom'">
            <ion-text>{{ currentFacilityDetails?.orderCount }}</ion-text>
            <ion-progress-bar class="ion-margin" :value="currentFacilityDetails?.orderCount / fulfillmentOrderLimit"></ion-progress-bar>
            <ion-chip :disabled="!hasPermission(Actions.APP_UPDT_STR_FULFLMNT_CONFIG)" :outline="true" @click="changeOrderLimitPopover">{{ currentFacilityDetails?.maximumOrderLimit }}</ion-chip>
          </ion-item>
          <ion-item lines="none" v-else-if="orderLimitType === 'unlimited'">
            <ion-label>{{ translate("orders allocated today", { orderCount: currentFacilityDetails?.orderCount }) }}</ion-label>
            <ion-chip :disabled="!hasPermission(Actions.APP_UPDT_STR_FULFLMNT_CONFIG)" :outline="true" @click="changeOrderLimitPopover">{{ translate("Unlimited") }}</ion-chip>
          </ion-item>
          <ion-item lines="none" v-else>
            <ion-label>{{ translate("orders in fulfillment queue", { orderCount: currentFacilityDetails?.orderCount }) }}</ion-label>
            <ion-chip :disabled="!hasPermission(Actions.APP_UPDT_STR_FULFLMNT_CONFIG)" :outline="true" @click="changeOrderLimitPopover" color="danger" fill="outline">{{ fulfillmentOrderLimit }}</ion-chip>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Sell inventory online") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate("Control whether the store's inventory should be made available for online sales or not.") }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_UPDT_ECOM_INV_CONFIG) || !facilityGroupDetails?.facilityGroupId">
            <ion-toggle label-placement="start" v-model="isEComInvEnabled" @click.prevent="updateEComInvStatus($event)">{{ translate("Sell online") }}</ion-toggle>
          </ion-item>
        </ion-card>
      </section>

      <hr />

      <DxpAppVersionInfo />

      <section>
        <DxpProductIdentifier />
        <DxpTimeZoneSwitcher @timeZoneUpdated="timeZoneUpdated" />
        <DxpLanguageSwitcher />

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Additional documents") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Print supplementary documents with the shipment for package identification.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :checked="userPreference.printShippingLabel" @ionChange="setPrintShippingLabelPreference($event)">{{ translate("Generate shipping label") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :checked="userPreference.printPackingSlip" @ionChange="setPrintPackingSlipPreference($event)">{{ translate("Generate packing slip") }}</ion-toggle>
          </ion-item>
        </ion-card>

        <ion-card v-if="notificationPrefs.length">
          <ion-card-header>
            <ion-card-title>
              {{ translate("Notification Preference") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Select the notifications you want to receive.') }}
          </ion-card-content>
          <ion-list>
            <ion-item :key="pref.enumId" v-for="pref in notificationPrefs" lines="none">
              <ion-toggle label-placement="start" @click.prevent="confirmNotificationPrefUpdate(pref.enumId, $event)" :checked="pref.isEnabled">{{ pref.description }}</ion-toggle>
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Force scan") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content v-html="barcodeContentMessage"></ion-card-content>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_UPDT_FULFILL_FORCE_SCAN_CONFIG)">
            <ion-toggle label-placement="start" :checked="isForceScanEnabled" @click.prevent="updateForceScanStatus($event)">{{ translate("Require scan") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_BARCODE_IDENTIFIER_UPDATE)">
            <ion-select :label="translate('Barcode Identifier')" interface="popover" :placeholder="translate('Select')" :value="barcodeIdentificationPref" @ionChange="setBarcodeIdentificationPref($event.detail.value)">
              <ion-select-option v-for="identification in barcodeIdentificationOptions" :key="identification" :value="identification.goodIdentificationTypeId">{{ identification.description ? identification.description : identification.goodIdentificationTypeId }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Allow partial rejections") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate("Individual items within an order will be rejected without affecting the other items in the order.") }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_PARTIAL_ORDER_REJECTION_CONFIG_UPDATE)">
            <ion-toggle label-placement="start" :checked="isPartialOrderRejectionEnabled" @click.prevent="confirmPartialOrderRejection($event)">{{ translate("Partial rejections") }}</ion-toggle>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Collateral rejections") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('When rejecting an item, automatically reject all other orders for that item as well.') }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_COLLATERAL_REJECTION_CONFIG_UPDATE)">
            <ion-toggle label-placement="start" :checked="isCollateralRejectionEnabled" @click.prevent="confirmCollateralRejection($event)">{{ translate("Auto reject related items") }}</ion-toggle>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Affect QOH on rejection") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Adjust the QOH along with ATP on rejection.') }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_AFFECT_QOH_CONFIG_UPDATE)">
            <ion-toggle label-placement="start" :checked="affectQoh" @click.prevent="confirmAffectQohConfig($event)">{{ translate("Affect QOH") }}</ion-toggle>
          </ion-item>
        </ion-card>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonAvatar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenuButton, IonPage, IonProgressBar, IonSelect, IonSelectOption, IonTitle, IonText, IonToggle, IonToolbar, alertController, popoverController, onIonViewWillEnter } from "@ionic/vue";
import { computed, ref } from "vue";
import { openOutline } from "ionicons/icons";
import { UserService } from "@/services/UserService";
import { showToast } from "@/utils";
import { hasError, removeClientRegistrationToken, subscribeTopic, unsubscribeTopic } from "@/adapter";
import { initialiseFirebaseApp, translate, useProductIdentificationStore, useUserStore as useDxpUserStore, useAuthStore } from "@hotwax/dxp-components";
import logger from "@/logger";
import { Actions, hasPermission } from "@/authorization";
import { DateTime } from "luxon";
import Image from "@/components/Image.vue";
import OrderLimitPopover from "@/components/OrderLimitPopover.vue";
import emitter from "@/event-bus";
import { addNotification, generateTopicName, isFcmConfigured, storeClientRegistrationToken } from "@/utils/firebase";
import { UtilService } from "@/services/UtilService";
import { useUserStore } from "@/store/user";
import { useUtilStore } from "@/store/util";
import { useOrderStore } from "@/store/order";

const currentFacilityDetails = ref({} as any);
const orderLimitType = ref("unlimited");
const fulfillmentOrderLimit = ref("" as number | string);
const facilityGroupDetails = ref({} as any);
const isEComInvEnabled = ref(false);
const barcodeContentMessage = translate("Only allow shipped quantity to be incremented by scanning the barcode of products. If the identifier is not found, the scan will default to using the internal name.", { space: "<br /><br />" });

const userProfile = computed(() => useUserStore().getUserProfile);
const userPreference = computed(() => useUserStore().getUserPreference);
const notificationPrefs = computed(() => useUserStore().getNotificationPrefs);
const allNotificationPrefs = computed(() => useUserStore().getAllNotificationPrefs);
const firebaseDeviceId = computed(() => useUserStore().getFirebaseDeviceId);
const isForceScanEnabled = computed(() => useUtilStore().isForceScanEnabled);
const isPartialOrderRejectionEnabled = computed(() => useUtilStore().getPartialOrderRejectionConfig);
const isCollateralRejectionEnabled = computed(() => useUtilStore().getCollateralRejectionConfig);
const affectQoh = computed(() => useUtilStore().getAffectQohConfig);
const barcodeIdentificationPref = computed(() => useUtilStore().getBarcodeIdentificationPref);
const currentFacility = computed(() => useDxpUserStore().getCurrentFacility);
const preferredStore = computed(() => useDxpUserStore().getCurrentEComStore);
const barcodeIdentificationOptions = computed(() => useProductIdentificationStore().getGoodIdentificationOptions);

const updateEComStore = (selectedProductStore: any) => {
  useUserStore().fetchEComStoreDependencies(selectedProductStore?.productStoreId);
};

const getCurrentFacilityDetails = async () => {
  let resp: any;
  try {
    resp = await UserService.getFacilityDetails({
      facilityId: currentFacility.value?.facilityId,
      pageSize: 1,
      fieldsToSelect: ["maximumOrderLimit", "facilityId"]
    });

    if (!hasError(resp)) {
      currentFacilityDetails.value = {
        ...currentFacilityDetails.value,
        ...resp.data
      };
      updateOrderLimitType();
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to fetch current facility details", err);
  }
};

const getFacilityOrderCount = async () => {
  let resp: any;
  try {
    resp = await UserService.getFacilityOrderCount({
      facilityId: currentFacility.value?.facilityId,
      entryDate: DateTime.now().toFormat("yyyy-MM-dd"),
      pageSize: 1,
      fieldsToSelect: ["entryDate", "lastOrderCount"]
    });
    if (!hasError(resp) && resp.data.length) {
      currentFacilityDetails.value.orderCount = resp.data[0]?.lastOrderCount;
    } else {
      throw resp.data;
    }
  } catch (err) {
    currentFacilityDetails.value.orderCount = 0;
    logger.error("Failed to fetch total orders count", err);
  }
};

const updateOrderLimitType = () => {
  fulfillmentOrderLimit.value = currentFacilityDetails.value?.maximumOrderLimit;
  if (fulfillmentOrderLimit.value === 0) {
    orderLimitType.value = "no-capacity";
  } else if (fulfillmentOrderLimit.value) {
    orderLimitType.value = "custom";
  } else {
    orderLimitType.value = "unlimited";
  }
};

const getEcomInvStatus = async () => {
  let resp: any;
  try {
    isEComInvEnabled.value = false;
    facilityGroupDetails.value = {};

    resp = await UserService.getFacilityGroupDetails({
      facilityGroupTypeId: "SHOPIFY_GROUP_FAC",
      fieldsToSelect: ["facilityGroupId", "facilityGroupTypeId"],
      pageSize: 1
    });

    if (!hasError(resp)) {
      facilityGroupDetails.value.facilityGroupId = resp.data[0].facilityGroupId;
      resp = await UtilService.getFacilityGroupAndMemberDetails({
        customParametersMap: {
          facilityId: currentFacility.value?.facilityId,
          facilityGroupId: facilityGroupDetails.value.facilityGroupId,
          pageIndex: 0,
          pageSize: 1
        },
        dataDocumentId: "FacilityGroupAndMember",
        filterByDate: true
      });

      if (!hasError(resp)) {
        facilityGroupDetails.value = { ...facilityGroupDetails.value, ...resp.data.entityValueList[0] };
        isEComInvEnabled.value = true;
      } else {
        throw resp.data;
      }
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to fetch eCom inventory config", err);
  }
};

const logout = async () => {
  try {
    await removeClientRegistrationToken(firebaseDeviceId.value, process.env.VUE_APP_NOTIF_APP_ID as any);
  } catch (error) {
    logger.error(error);
  }

  useUserStore().logout({ isUserUnauthorised: false }).then((redirectionUrl: any) => {
    useOrderStore().clearOrders();

    if (!redirectionUrl) {
      const redirectUrl = window.location.origin + "/login";
      window.location.href = `${process.env.VUE_APP_LOGIN_URL}?isLoggedOut=true&redirectUrl=${redirectUrl}`
    }
  });
};

const goToLaunchpad = () => {
  window.location.href = `${process.env.VUE_APP_LOGIN_URL}`
};

const changeOrderLimitPopover = async (ev: Event) => {
  const popover = await popoverController.create({
    component: OrderLimitPopover,
    event: ev,
    showBackdrop: false,
    componentProps: { fulfillmentOrderLimit: fulfillmentOrderLimit.value }
  });
  popover.present();

  const result = await popover.onDidDismiss();
  if (result.data != undefined && result.data !== fulfillmentOrderLimit.value) {
    await updateFacilityMaximumOrderLimit(result.data);
    updateOrderLimitType();
  }
};

const updateFacility = async (facility: any) => {
  await useUserStore().setFacility({ facility });
  await useUserStore().fetchNotificationPreferences();
  getCurrentFacilityDetails();
  getFacilityOrderCount();
  getEcomInvStatus();
  await useUtilStore().fetchAutoShippingLabelConfig();
};

const timeZoneUpdated = async (tzId: string) => {
  await useUserStore().setUserTimeZone(tzId);
};

const updateFacilityMaximumOrderLimit = async (maximumOrderLimit: number | string) => {
  let resp;

  try {
    resp = await UserService.updateFacility({
      facilityId: currentFacility.value?.facilityId,
      maximumOrderLimit
    });

    if (!hasError(resp)) {
      currentFacilityDetails.value.maximumOrderLimit = maximumOrderLimit === "" ? null : maximumOrderLimit;
      showToast(translate("Order fulfillment capacity updated successfully"));
    } else {
      throw resp.data;
    }
  } catch (err) {
    showToast(translate("Failed to update facility"));
    logger.error("Failed to update facility", err);
  }
};

const updateFacilityToGroup = async () => {
  let resp;
  try {
    resp = await UserService.updateFacilityToGroup({
      facilityId: currentFacility.value?.facilityId,
      facilityGroupId: facilityGroupDetails.value.facilityGroupId,
      fromDate: facilityGroupDetails.value.fromDate,
      thruDate: DateTime.now().toMillis()
    });

    if (!hasError(resp)) {
      isEComInvEnabled.value = false;
      showToast(translate("ECom inventory status updated successfully"));
    } else {
      throw resp.data;
    }
  } catch (err) {
    showToast(translate("Failed to update eCom inventory status"));
    logger.error("Failed to update eCom inventory status", err);
  }
};

const addFacilityToGroup = async () => {
  let resp;
  try {
    resp = await UserService.addFacilityToGroup({
      facilityId: currentFacility.value?.facilityId,
      facilityGroupId: facilityGroupDetails.value.facilityGroupId
    });

    if (!hasError(resp)) {
      isEComInvEnabled.value = true;
      showToast(translate("ECom inventory status updated successfully"));
    } else {
      throw resp.data;
    }
  } catch (err) {
    showToast(translate("Failed to update eCom inventory status"));
    logger.error("Failed to update eCom inventory status", err);
  }
};

const updateEComInvStatus = async (event: any) => {
  event.stopImmediatePropagation();

  const isChecked = !event.target.checked;
  const header = isChecked ? "Turn on eCom inventory for " : "Turn off eCom inventory for ";
  const message = "Are you sure you want to perform this action?";

  const alert = await alertController.create({
    header: translate(header, { facilityName: currentFacility.value?.facilityName }),
    message: translate(message),
    buttons: [{
      text: translate("Cancel"),
      role: ""
    }, {
      text: translate("Save"),
      role: "success"
    }]
  });

  await alert.present();

  const { role } = await alert.onDidDismiss();

  if (role) {
    isChecked ? await addFacilityToGroup() : await updateFacilityToGroup();
  }
};

const updateForceScanStatus = async (event: any) => {
  event.stopImmediatePropagation();
  const params = {
    settingValue: !isForceScanEnabled.value
  };
  await useUtilStore().updateProductStoreSettingConfig({
    enumId: "FULFILL_FORCE_SCAN",
    payload: params,
    createService: UtilService.createProductStoreSetting,
    requireEnum: true,
    enumMeta: {
      description: "Impose force scanning of items while packing from fulfillment app",
      enumName: "Fulfillment Force Scan"
    }
  });
};

const setPrintShippingLabelPreference = (ev: any) => {
  useUserStore().setUserPreference({ printShippingLabel: ev.detail.checked });
};

const setPrintPackingSlipPreference = (ev: any) => {
  useUserStore().setUserPreference({ printPackingSlip: ev.detail.checked });
};

const updateNotificationPref = async (enumId: string) => {
  let isToggledOn = false;

  try {
    if (!isFcmConfigured()) {
      logger.error("FCM is not configured.");
      showToast(translate("Notification preferences not updated. Please try again."));
      return;
    }

    emitter.emit("presentLoader", { backdropDismiss: false });
    const facilityId = currentFacility.value?.facilityId;
    const topicName = generateTopicName(facilityId, enumId);

    const notificationPref = notificationPrefs.value.find((pref: any) => pref.enumId === enumId);
    notificationPref.isEnabled
      ? await unsubscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID as any)
      : await subscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID as any);

    notificationPref.isEnabled = !notificationPref.isEnabled;
    await useUserStore().updateNotificationPreferences(notificationPrefs.value);
    isToggledOn = notificationPref.isEnabled;
    showToast(translate("Notification preferences updated."));
  } catch (error) {
    showToast(translate("Notification preferences not updated. Please try again."));
  } finally {
    emitter.emit("dismissLoader");
  }
  try {
    if (!allNotificationPrefs.value.length && isToggledOn) {
      await initialiseFirebaseApp(JSON.parse(process.env.VUE_APP_FIREBASE_CONFIG as any), process.env.VUE_APP_FIREBASE_VAPID_KEY, storeClientRegistrationToken, addNotification);
    } else if (allNotificationPrefs.value.length == 1 && !isToggledOn) {
      await removeClientRegistrationToken(firebaseDeviceId.value, process.env.VUE_APP_NOTIF_APP_ID as any);
    }
    await useUserStore().fetchAllNotificationPrefs();
  } catch (error) {
    logger.error(error);
  }
};

const confirmNotificationPrefUpdate = async (enumId: string, event: CustomEvent) => {
  event.stopImmediatePropagation();

  const message = translate("Are you sure you want to update the notification preferences?");
  const alert = await alertController.create({
    header: translate("Update notification preferences"),
    message,
    buttons: [
      {
        text: translate("Cancel"),
        role: "cancel"
      },
      {
        text: translate("Confirm"),
        handler: async () => {
          alertController.dismiss();
          await updateNotificationPref(enumId);
        }
      }
    ]
  });
  return alert.present();
};

const confirmPartialOrderRejection = async (event: any) => {
  event.stopImmediatePropagation();
  const isChecked = !event.target.checked;
  const message = translate("Are you sure you want to perform this action?");
  const header = isChecked ? translate("Allow partial rejections ") : translate("Disallow partial rejections");

  const alert = await alertController.create({
    header,
    message,
    buttons: [
      {
        text: translate("Cancel"),
        role: "cancel"
      },
      {
        text: translate("Confirm"),
        handler: async () => {
          alertController.dismiss();
          await updatePartialOrderRejectionConfig(isChecked);
        }
      }
    ]
  });
  return alert.present();
};

const updatePartialOrderRejectionConfig = async (value: any) => {
  const params = {
    settingValue: value
  };
  await useUtilStore().updateProductStoreSettingConfig({
    enumId: "FULFILL_PART_ODR_REJ",
    payload: params,
    createService: UtilService.createProductStoreSetting,
    requireEnum: true,
    enumMeta: {
      description: "Fulfillment Partial Order Rejection",
      enumName: "Fulfillment Partial Order Rejection"
    }
  });
};

const confirmCollateralRejection = async (event: any) => {
  event.stopImmediatePropagation();

  const isChecked = !event.target.checked;
  const message = translate("Are you sure you want to perform this action?");
  const header = isChecked ? translate("Allow collateral rejections") : translate("Disallow collateral rejections");

  const alert = await alertController.create({
    header,
    message,
    buttons: [
      {
        text: translate("Cancel"),
        role: "cancel"
      },
      {
        text: translate("Confirm"),
        handler: async () => {
          alertController.dismiss();
          await updateCollateralRejectionConfig(!event.target.checked);
        }
      }
    ]
  });
  return alert.present();
};

const updateCollateralRejectionConfig = async (value: any) => {
  const params = {
    settingValue: value
  };
  await useUtilStore().updateProductStoreSettingConfig({
    enumId: "FF_COLLATERAL_REJ",
    payload: params,
    createService: UtilService.createProductStoreSetting,
    requireEnum: true,
    enumMeta: {
      description: "Fulfillment Collateral Rejection",
      enumName: "Fulfillment Collateral Rejection"
    }
  });
};

const confirmAffectQohConfig = async (event: any) => {
  event.stopImmediatePropagation();

  const isChecked = !event.target.checked;
  const message = translate("Are you sure you want to perform this action?");
  const header = isChecked ? translate("Affect QOH on rejection") : translate("Do not affect QOH on rejection");

  const alert = await alertController.create({
    header,
    message,
    buttons: [
      {
        text: translate("Cancel"),
        role: "cancel"
      },
      {
        text: translate("Confirm"),
        handler: async () => {
          alertController.dismiss();
          await updateAffectQohConfig(!event.target.checked);
        }
      }
    ]
  });
  return alert.present();
};

const updateAffectQohConfig = async (value: any) => {
  const params = {
    settingValue: value
  };
  await useUtilStore().updateProductStoreSettingConfig({
    enumId: "AFFECT_QOH_ON_REJ",
    payload: params,
    createService: UtilService.createProductStoreSetting,
    requireEnum: false
  });
};

const setBarcodeIdentificationPref = async (value: string) => {
  await useUtilStore().updateProductStoreSettingConfig({
    enumId: "BARCODE_IDEN_PREF",
    payload: { settingValue: value },
    createService: UtilService.createProductStoreSetting,
    requireEnum: true,
    enumMeta: {
      description: "Identification preference to be used for scanning items.",
      enumName: "Barcode Identification Preference"
    }
  });
};

onIonViewWillEnter(async () => {
  Promise.all([getCurrentFacilityDetails(), getFacilityOrderCount(), getEcomInvStatus()]);

  await useUtilStore().fetchProductStoreSettings(preferredStore.value.productStoreId);
  await useUserStore().fetchNotificationPreferences();
});
</script>

<style scoped>
ion-card > ion-button {
  margin: var(--spacer-xs);
}
section {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  align-items: start;
}
.user-profile {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
}
hr {
  border-top: 1px solid var(--ion-color-medium);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacer-xs) 10px 0px;
}

ion-chip {
  flex-shrink: 0;
}
</style>
