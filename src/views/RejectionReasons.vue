<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title @click="saveReasonsOrder()">{{ translate("Rejection reasons") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-searchbar class="searchbar" v-model="queryString" @keyup.enter="findFilteredReasons()" :placeholder="translate('Search rejection reasons')" />

      <main>
        <div v-if="filteredReasons.length">
          <ion-reorder-group @ionItemReorder="doReorder($event)" :disabled="false">
            <div class="list-item" v-for="reason in filteredReasons" :key="reason.enumId">
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  <p class="overline">{{ reason.enumId }}</p>
                  {{ reason.enumName }}
                  <p>{{ reason.description }}</p>
                </ion-label>
              </ion-item>

              <div class="tablet">
                <ion-chip outline @click="openVarianceTypeActionsPopover($event, reason)">
                  <ion-label>{{ reason.enumTypeId }}</ion-label>
                  <ion-icon :icon="caretDownOutline" />
                </ion-chip>
              </div>
  
              <ion-reorder />
  
              <ion-button fill="clear" color="medium" @click="openRejectionReasonActionsPopover($event, reason)">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </div>
          </ion-reorder-group>
        </div>
        <div class="empty-state" v-else>
          <p>{{ translate("No rejection reasons found.") }}</p>
        </div>
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
import { UtilService } from '@/services/UtilService';
import logger from '@/logger';
import { showToast } from '@/utils';

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
  data() {
    return {
      queryString: '',
      filteredReasons: []
    }
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
    this.filteredReasons = this.rejectReasons ? JSON.parse(JSON.stringify(this.rejectReasons)) : []
  },
  methods: {
    async openCreateRejectionReasonModal() {
      const createRejectionReasonModal = await modalController.create({
        component: CreateRejectionReasonModal
      });

      createRejectionReasonModal.onDidDismiss().then(() => {
        this.findFilteredReasons()
      })

      createRejectionReasonModal.present()
    },
    async openRejectionReasonActionsPopover(event: Event, reason: any) {
      const popover = await popoverController.create({
        component: RejectReasonActionsPopver,
        componentProps: { reason },
        showBackdrop: false,
        event
      });

      popover.onDidDismiss().then(() => {
        this.findFilteredReasons()
      })

      return popover.present();
    },
    async openVarianceTypeActionsPopover(event: Event, reason: any) {
      const varianceTypeActionsPopover = await popoverController.create({
        component: VarianceTypeActionsPopover,
        componentProps: { reason },
        showBackdrop: false,
        event
      });

      varianceTypeActionsPopover.onDidDismiss().then(() => {
        this.findFilteredReasons()
      })

      return varianceTypeActionsPopover.present();
    },
    findFilteredReasons() {
      this.filteredReasons = this.rejectReasons.filter((reason: any) => reason.description.toLowerCase().includes(this.queryString.toLowerCase()))
    },
    async doReorder(event: CustomEvent) {
      const previousSeq = JSON.parse(JSON.stringify(this.filteredReasons))

      // returns the updated sequence after reordering
      const updatedSeq = event.detail.complete(JSON.parse(JSON.stringify(this.filteredReasons)));

      let diffSeq = this.findReasonsDiff(previousSeq, updatedSeq)

      const updatedSeqenceNum = previousSeq.map((routing: any) => routing.sequenceNum)
      Object.keys(diffSeq).map((key: any) => {
        diffSeq[key].sequenceNum = updatedSeqenceNum[key]
      })

      diffSeq = Object.keys(diffSeq).map((key) => diffSeq[key])
      this.filteredReasons = updatedSeq

      if(diffSeq.length) {
        const toast = await showToast("Rejection reasons order has been change. Click save button to update them.", 
        { buttons:
          [
            {
              text: translate('Save'),
              handler: () => {
                this.saveReasonsOrder()
              }
            },
          ],
          manualDismiss: true
        }) as any

        toast.present()
      }

    },
    findReasonsDiff(previousSeq: any, updatedSeq: any) {
      const diffSeq: any = Object.keys(previousSeq).reduce((diff, key) => {
        if (updatedSeq[key].orderRoutingId === previousSeq[key].orderRoutingId && updatedSeq[key].statusId === previousSeq[key].statusId && updatedSeq[key].sequenceNum === previousSeq[key].sequenceNum) return diff
        return {
          ...diff,
          [key]: updatedSeq[key]
        }
      }, {})
      return diffSeq;
    },
    async saveReasonsOrder() {
      const diffReasons = this.filteredReasons.filter((reason: any) => this.rejectReasons.some((rejectReason: any) => rejectReason.enumId === reason.enumId && rejectReason.sequenceNum !== reason.sequenceNum))

      const responses = await Promise.allSettled(diffReasons.map(async (reason: any) => {
        await UtilService.updateEnumeration(reason)
      }))

      const failedResponsesCount = responses.filter((response) => response.status === 'rejected').length
      if(failedResponsesCount) {
        showToast(translate("Failed to update sequence for some rejection reasons."))
      } else {
        showToast(translate("Sequence for rejection reasons updated successfully."))
      }
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