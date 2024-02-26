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
          <div class="list-item">
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ "REJ ENUM ID" }}</p>
                {{ "Rejection enum name" }}
                <p>{{ "Rejection enum desc" }}</p>
              </ion-label>
            </ion-item>

            <div class="tablet">
              <ion-chip outline @click="openVarianceTypeActionsPopover">
                <ion-label>{{ "<enumType>" }}</ion-label>
                <ion-icon :icon="caretDownOutline" />
              </ion-chip>
            </div>

            <ion-reorder />

            <ion-button fill="clear" color="medium">
              <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
            </ion-button>
          </div>

          <div class="list-item">
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ "REJ ENUM ID" }}</p>
                {{ "Rejection enum name" }}
                <p>{{ "Rejection enum desc" }}</p>
              </ion-label>
            </ion-item>

            <div class="tablet">
              <ion-chip outline @click="openVarianceTypeActionsPopover">
                <ion-label>{{ "<enumType>" }}</ion-label>
                <ion-icon :icon="caretDownOutline" />
              </ion-chip>
            </div>

            <ion-reorder />

            <ion-button @click="openRejectionReasonActionsPopover" fill="clear" color="medium">
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
    async openVarianceTypeActionsPopover(event: Event) {
      const varianceTypeActionsPopover = await popoverController.create({
        component: VarianceTypeActionsPopover,
        event
      });

      return varianceTypeActionsPopover.present();
    },
  },
  setup() {
    return {
      addOutline,
      caretDownOutline,
      ellipsisVerticalOutline,
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