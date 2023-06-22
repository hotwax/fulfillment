<template>
  <ion-menu side="start" content-id="main-content" type="overlay" :disabled="!isUserAuthenticated">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ currentFacility.name }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-menu-toggle auto-hide="false" v-for="(page, index) in appPages" :key="index">
          <ion-item
            button
            @click="selectedIndex = index"
            router-direction="root"
            :router-link="page.url"
            class="hydrated"
            :class="{ selected: selectedIndex === index }">
            <ion-icon slot="start" :ios="page.iosIcon" :md="page.mdIcon" />
            <ion-label>{{ $t(page.title) }}</ion-label>
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
import { mailUnreadOutline, mailOpenOutline, checkmarkDoneOutline, settingsOutline, swapVerticalOutline } from "ionicons/icons";
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
    // When open any specific screen it should show that screen selected
    this.selectedIndex = this.appPages.findIndex((screen) => {
      return screen.url === this.$router.currentRoute.value.path;
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
        title: "Open",
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
        title: "EXIM",
        url: "/exim",
        iosIcon: swapVerticalOutline,
        mdIcon: swapVerticalOutline,
      },
      {
        title: "Settings",
        url: "/settings",
        iosIcon: settingsOutline,
        mdIcon: settingsOutline,
      },
    ];
    return {
      selectedIndex,
      appPages,
      mailUnreadOutline,
      mailOpenOutline,
      checkmarkDoneOutline,
      settingsOutline,
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