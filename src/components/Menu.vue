<template>
  <ion-menu content-id="main-content" type="overlay" :disabled="!isUserAuthenticated">
    <ion-header>
      <ion-toolbar>
        <ion-title> {{$t("fulfillment")}} </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-menu-toggle
          auto-hide="false"
          v-for="(menu, index) in appPages"
          :key="index"
        >
          <ion-item
            button
            @click="selectedIndex = index"
            router-direction="root"
            :router-link="menu.url"
            class="hydrated"
            :class="{ selected: selectedIndex === index }"
          >
            <ion-icon
              slot="start"
              :ios="menu.iosIcon"
              :md="menu.mdIcon"
            />
            <ion-label>{{ menu.title }}</ion-label>
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
  IonToolbar,
} from "@ionic/vue";
import { mapGetters } from "vuex";
import { defineComponent, ref } from "vue";
import { mailUnread, mailOpen, checkmarkDone, settings } from "ionicons/icons";
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
    IonToolbar,
  },
  created() {
    this.selectedIndex = this.appPages.findIndex((page) => {
      return page.url === this.$router.currentRoute.value.path;
    });
  },
  computed: {
    ...mapGetters({
      isUserAuthenticated: "user/isUserAuthenticated",
    }),
  },
  watch: {
    $route(to) {
      if (to.path === "/login") {
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
        url: "/orders",
        iosIcon: mailUnread,
        mdIcon: mailUnread,
      },
      {
        title: "In Progress",
        url: "/inprogress",
        iosIcon: mailOpen,
        mdIcon: mailOpen,
      },
      {
        title: "Completed",
        url: "/completed",
        iosIcon: checkmarkDone,
        mdIcon: checkmarkDone,
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
      mailUnread,
      mailOpen,
      checkmarkDone,
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
</style>
