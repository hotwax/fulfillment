<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/exim" />
        <ion-title>{{ $t("Saved mappings") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="empty-state" v-if="!areFieldMappingsAvailable">
          <p>{{ $t("There are no saved CSV mappings to show. Create a new mapping from a file upload screen")}}</p>
        </div>
        <section v-else>
          <ion-list v-if="Object.keys(fieldMappings('IMPORD')).length">
            <ion-list-header>{{ $t("Import Orders") }}</ion-list-header>
            <ion-item v-for="(mapping, index) in fieldMappings('IMPORD')" :key="index" @click="viewMappingConfiguration(index, 'IMPORD')" detail button>
              <ion-label>{{ mapping.name }}</ion-label>
            </ion-item>
          </ion-list>
          <ion-list v-if="Object.keys(fieldMappings('EXPORD')).length">
            <ion-list-header>{{ $t("Export Orders") }}</ion-list-header>
            <ion-item v-for="(mapping, index) in fieldMappings('EXPORD')" :key="index" @click="viewMappingConfiguration(index, 'EXPORD')" detail button>
              <ion-label>{{ mapping.name }}</ion-label>
            </ion-item>
          </ion-list>
        </section>

        <aside class="desktop-only" v-if="isDesktop" v-show="currentMapping.id != ''">
          <MappingConfiguration />
        </aside>
      </main>
    </ion-content>
  </ion-page>      
</template>

<script lang="ts">
import {
  IonBackButton,
  IonContent,
  IonItem,
  IonLabel,
  IonListHeader,
  IonList,
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
import MappingConfiguration from '@/components/MappingConfiguration.vue'

export default defineComponent({
  name: 'SavedMappings',
  components: {
    IonBackButton,
    IonContent,
    IonItem,
    IonLabel,
    IonListHeader,
    IonList,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonPage,
    MappingConfiguration
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
    async viewMappingConfiguration(id: any, mappingType: string) {
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