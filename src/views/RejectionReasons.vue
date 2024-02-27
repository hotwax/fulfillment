<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate("Rejection reasons") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-searchbar class="searchbar" :placeholder="translate('Search rejection reasons')" />

      <main>
        <ion-reorder-group :disabled="false">
          <div class="list-item" v-for="reason in rejectReasons" :key="reason.enumId">
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ reason.enumId }}</p>
                {{ reason.enumName }}
                <p>{{ reason.description }}</p>
              </ion-label>
            </ion-item>

            <div class="tablet">
              <ion-chip outline @click="openVarianceTypeActionsPopover($event, reason)">
                <ion-label>{{ getReasonEnumType(reason.enumTypeId) }}</ion-label>
                <ion-icon :icon="caretDownOutline" />
              </ion-chip>
            </div>

            <ion-reorder />

            <ion-button fill="clear" color="medium" @click="openRejectionReasonActionsPopover">
              <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
            </ion-button>
          </div>
        </ion-reorder-group>
      </main>

      <ion-fab @click="openCreateRejectionReasonModal()" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button>
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButton,
  IonContent,
  IonChip,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonPage,
  IonReorder,
  IonReorderGroup,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  modalController,
  popoverController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { addOutline, caretDownOutline, ellipsisVerticalOutline } from 'ionicons/icons';
import { translate } from '@hotwax/dxp-components';
import CreateRejectionReasonModal from '@/components/CreateRejectionReasonModal.vue';
import RejectReasonActionsPopver from '@/components/RejectReasonActionsPopver.vue';
import VarianceTypeActionsPopover from '@/components/VarianceTypeActionsPopover.vue';
import { mapGetters, useStore } from 'vuex';

export default defineComponent({
  name: 'RejectionReasons',
  components: {
    IonButton,
    IonContent,
    IonChip,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonPage,
    IonReorder,
    IonReorderGroup,
    IonSearchbar,
    IonTitle,
    IonToolbar,
  },
  computed: {
    ...mapGetters({
      rejectReasons: 'util/getRejectReasons',
      rejectReasonEnumTypes: 'util/getRejectReasonEnumTypes',
    })
  },
  async ionViewWillEnter() {
    await this.store.dispatch('util/fetchRejectReasons')
    await this.store.dispatch('util/fetchRejectReasonEnumTypes')
  },
  methods: {
    async openCreateRejectionReasonModal() {
      const createRejectionReasonModal = await modalController.create({
        component: CreateRejectionReasonModal
      });

      createRejectionReasonModal.present()
    },
    async openRejectionReasonActionsPopover(event: Event) {
      const popover = await popoverController.create({
        component: RejectReasonActionsPopver,
        event
      });

      return popover.present();
    },
    async openVarianceTypeActionsPopover(event: Event, reason: any) {
      const varianceTypeActionsPopover = await popoverController.create({
        component: VarianceTypeActionsPopover,
        componentProps: { selectedReason:  reason },
        event
      });

      return varianceTypeActionsPopover.present();
    },
    getReasonEnumType(enumTypeId: any) {
      const enumType = this.rejectReasonEnumTypes.find((enumType: any) => enumType.enumTypeId === enumTypeId)
      return enumType?.description
    }
  },
  setup() {
    const store = useStore()

    return {
      addOutline,
      caretDownOutline,
      ellipsisVerticalOutline,
      store,
      translate,
    }
  }
});
</script>

<style scoped>
.list-item {
  --columns-desktop: 4;
}
</style>