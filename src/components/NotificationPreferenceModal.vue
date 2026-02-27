<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Notification Preference") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div v-if="!notificationPrefs.length" class="ion-text-center">
      <p>{{ translate("Notification preferences not found.")}}</p>
    </div>
    <ion-list v-else>
      <ion-item :key="pref.enumId" v-for="pref in notificationPrefs">
        <ion-toggle label-placement="start" @click="toggleNotificationPref(pref.enumId, $event)" :checked="pref.isEnabled">{{ pref.description }}</ion-toggle>
      </ion-item>
    </ion-list>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button :disabled="isButtonDisabled" @click="confirmSave()">
        <ion-icon :icon="save" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButtons, IonButton, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonList, IonTitle, IonToggle, IonToolbar, modalController, alertController } from "@ionic/vue";
import { computed, onBeforeMount, ref } from "vue";
import { closeOutline, save } from "ionicons/icons";
import { translate, useUserStore as useDxpUserStore } from "@hotwax/dxp-components";
import { commonUtil } from "@/utils/commonUtil";
import emitter from "@/event-bus";
import { fireBaseUtil } from "@/utils/fireBaseUtil";
import { subscribeTopic, unsubscribeTopic } from "@/adapter";
import logger from "@/logger";
import { useUserStore } from "@/store/user";
const notificationPrefState = ref<Record<string, boolean>>({});
const notificationPrefToUpdate = ref({ subscribe: [] as string[], unsubscribe: [] as string[] });
const initialNotificationPrefState = ref<Record<string, boolean>>({});

const notificationPrefs = computed(() => useUserStore().getNotificationPrefs);
const currentFacility = computed(() => useDxpUserStore().getCurrentFacility);

const isButtonDisabled = computed(() => {
  const enumTypeIds = Object.keys(initialNotificationPrefState.value);
  return enumTypeIds.every((enumTypeId: string) => notificationPrefState.value[enumTypeId] === initialNotificationPrefState.value[enumTypeId]);
});

onBeforeMount(async () => {
  await useUserStore().fetchNotificationPreferences();
  notificationPrefState.value = notificationPrefs.value.reduce((prefs: any, pref: any) => {
    prefs[pref.enumId] = pref.isEnabled;
    return prefs;
  }, {});
  initialNotificationPrefState.value = JSON.parse(JSON.stringify(notificationPrefState.value));
});

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};

const toggleNotificationPref = (enumId: string, event: any) => {
  const value = !event.target.checked;
  if (value !== initialNotificationPrefState.value[enumId]) {
    value ? notificationPrefToUpdate.value.subscribe.push(enumId) : notificationPrefToUpdate.value.unsubscribe.push(enumId);
  } else {
    !value ? notificationPrefToUpdate.value.subscribe.splice(notificationPrefToUpdate.value.subscribe.indexOf(enumId), 1) : notificationPrefToUpdate.value.unsubscribe.splice(notificationPrefToUpdate.value.subscribe.indexOf(enumId), 1);
  }
  notificationPrefState.value[enumId] = value;
};

const handleTopicSubscription = async () => {
  const facilityId = (currentFacility.value as any)?.facilityId;
  const subscribeRequests = [] as any;
  notificationPrefToUpdate.value.subscribe.map(async (enumId: string) => {
    const topicName = fireBaseUtil.generateTopicName(facilityId, enumId);
    await subscribeRequests.push(subscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID as any));
  });

  const unsubscribeRequests = [] as any;
  notificationPrefToUpdate.value.unsubscribe.map(async (enumId: string) => {
    const topicName = fireBaseUtil.generateTopicName(facilityId, enumId);
    await unsubscribeRequests.push(unsubscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID as any));
  });

  const responses = await Promise.allSettled([...subscribeRequests, ...unsubscribeRequests]);
  const hasFailedResponse = responses.some((response: any) => response.status === "rejected");
  commonUtil.showToast(hasFailedResponse ? translate("Notification preferences not updated. Please try again.") : translate("Notification preferences updated."));
};

const updateNotificationPref = async () => {
  emitter.emit("presentLoader");
  try {
    await handleTopicSubscription();
  } catch (error) {
    logger.error(error);
  } finally {
    emitter.emit("dismissLoader");
  }
};

const confirmSave = async () => {
  const message = translate("Are you sure you want to update the notification preferences?");
  const alert = await alertController.create({
    header: translate("Update notification preferences"),
    message,
    buttons: [
      { text: translate("Cancel") },
      {
        text: translate("Confirm"),
        handler: async () => {
          await updateNotificationPref();
          modalController.dismiss({ dismissed: true });
        }
      }
    ]
  });
  return alert.present();
};
</script>
