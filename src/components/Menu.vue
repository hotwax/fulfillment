<template>
  <ion-menu content-id="main-content" type="overlay" :disabled="!isUserAuthenticated">
    <ion-header>
      <ion-toolbar>
        <ion-title>Broadway Store</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-menu-toggle auto-hide="false" v-for="(p, i) in appPages" :key="i">
          <ion-item
            button
            @click="selectedIndex = i"
            router-direction="root"
            :router-link="p.url"
            class="hydrated"
            :class="{ selected: selectedIndex === i }">
            <ion-icon slot="start" :ios="p.iosIcon" :md="p.mdIcon" />
            <ion-label>{{ p.title }}</ion-label>
          </ion-item>
        </ion-menu-toggle>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script lang="ts">
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { defineComponent, ref } from "vue";
import { mapGetters } from "vuex";

import { mailUnreadOutline, mailOpenOutline, checkmarkDoneOutline, settings } from "ionicons/icons";
import { useStore } from "@/store";

export default defineComponent({
  name: "Menu",
  components: {
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonMenuToggle,
    IonTitle,
    IonToolbar
  },
  created() {
    // When open any specific page it should show that page selected
    this.selectedIndex = this.appPages.findIndex((page) => {
      return page.url === this.$router.currentRoute.value.path;
    })
  },
  computed: {
    ...mapGetters({
      isUserAuthenticated: 'user/isUserAuthenticated',
      currentFacility: 'user/getCurrentFacility',
    })
  },
  watch:{
    $route (to) {
      // When logout and login it should point to Oth index
      if (to.path === '/login') {
        this.selectedIndex = 0;
      }
    },
  }, 
  setup() {
    const store = useStore();
    const selectedIndex = ref(0);
    const appPages = [
      {
        title: "Orders",
        url: "/open-orders",
        iosIcon: mailUnreadOutline,
        mdIcon: mailUnreadOutline,
      },
      {
        title: "In Progress",
        url: "/in-progress",
        iosIcon: mailOpenOutline,
        mdIcon: mailOpenOutline,
      },
      {
        title: "Completed",
        url: "/completed",
        iosIcon: checkmarkDoneOutline,
        mdIcon: checkmarkDoneOutline,
      },
      {
        title: "Settings",
        url: "/settings",
        iosIcon: settings,
        mdIcon: settings,
      },
    ];
    return {
      selectedIndex,
      appPages,
      mailUnreadOutline,
      mailOpenOutline,
      checkmarkDoneOutline,
      settings,
      store
    };
  },
});
</script>

<style scoped>
ion-menu.md ion-item.selected ion-icon {
  color: var(--ion-color-secondary);
}

ion-menu.ios ion-item.selected ion-icon {
  color: var(--ion-color-secondary);
}

ion-item.selected {
  --color: var(--ion-color-secondary);
}
</style>