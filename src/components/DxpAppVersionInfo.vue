<template>
  <div class="section-header">
    <div>
      <h1>{{ translate('App') }}</h1>
      <p class="overline">{{ translate("Version: ", { appVersion }) }}</p>
    </div>
    <div class="ion-text-end">
      <p class="overline">{{ translate("Built: ", { builtDateTime: getDateTime(appInfo.builtTime) }) }}</p>
    </div>
  </div>
</template>
  
<script setup lang="ts">
import { DateTime } from 'luxon';
import { translate } from '@common';
import { computed } from 'vue';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();

const userProfile = computed(() => userStore.getUserProfile)

const appInfo = (import.meta.env.VITE_APP_VERSION_INFO ? JSON.parse(import.meta.env.VITE_APP_VERSION_INFO as string) : {}) as any;
const appVersion = appInfo.branch ? (appInfo.branch + "-" + appInfo.revision) : appInfo.tag ? appInfo.tag : "";
const getDateTime = (time: any) => time ? DateTime.fromMillis(time).setZone(userProfile.value?.timeZone).toLocaleString(DateTime.DATETIME_MED) : "";
</script>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacer-xs) 10px 0px;
}
</style>
