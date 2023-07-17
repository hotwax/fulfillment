<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Saved mappings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
  </ion-page>      
</template>

<script lang="ts">
import {
  IonMenuButton,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonPage,
  isPlatform,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router'
import { mapGetters, useStore } from 'vuex'
import emitter from '@/event-bus';

export default defineComponent({
  name: 'SavedMappings',
  components: {
    IonMenuButton,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonPage
  },
  mounted() {
    this.store.dispatch("user/clearCurrentMapping");
  },
  computed: {
    ...mapGetters({
      fieldMappings: 'user/getFieldMappings',
      currentMapping: 'user/getCurrentMapping'
    }),
    areFieldMappingsAvailable(): any {
      // using below logic to check mappings as we are storing mappings as objects of objects of object
      return Object.values((this as any).fieldMappings()).some((mappings: any) => Object.keys(mappings).length)
    }
  },
  data() {
    return {
      isDesktop: isPlatform('desktop'),
      isMappingConfigAnimationCompleted: false,
      currentMappingId: ''
    }
  },
  methods: {
    async viewMappingConfiguration(id: string, mappingType: string) {
      this.currentMappingId = id
      await this.store.dispatch('user/updateCurrentMapping', { id, mappingType });

      if(!this.isDesktop && id) {
        this.router.push({name: 'MappingDetail', params: { mappingType, id }});
        return;
      }

      if (id && !this.isMappingConfigAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isMappingConfigAnimationCompleted = true;
      }
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    return {
      router,
      store,
    };
  }
})
</script>

<style scoped>
aside {
  flex: 1 0 355px;
  position: sticky;
  top: var(--spacer-lg);
  flex: 1;
}

@media (min-width: 991px) {
  main {
    display: flex;
    justify-content: center;
    align-items: start;
    gap: var(--spacer-2xl);
    max-width: 990px;
    margin: var(--spacer-base) auto 0;
  }

  main > section {
    width: 50ch;
  }

  aside {
    width: 0px;
    opacity: 0;
  }
}
</style>