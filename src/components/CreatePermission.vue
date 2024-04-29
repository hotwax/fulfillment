<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Link Permission") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding-top">
    <ion-item>
      <ion-icon :icon="idCardOutline" slot="start" />
      <ion-label>
        <h1>{{ reason.enumId }}</h1>
      </ion-label>
      <ion-chip color="success" v-if="securityGroupsByPermission[reason.enumId]">
        {{ reason.enumId }}
        <ion-icon :icon="checkmarkCircleOutline" />
      </ion-chip>
      <ion-button v-else slot="end" fill="outline" @click="generatePermission">
        {{ translate("Generate Permission") }}
      </ion-button>
    </ion-item>
    <ion-list>
      <ion-list-header>{{ translate("Add to security groups") }}</ion-list-header>
      <ion-item :disabled="!securityGroupsByPermission[reason.enumId]" v-for="group in securityGroups" :key="group?.groupId" @click="updateSecurityGroup(group.groupId)">
        <ion-checkbox :checked="isSecurityGroupAssociated(group.groupId)">
          <ion-label>
            {{ group?.groupName || group.groupId }}
            <p class="overline" v-if="group?.groupName">{{ group.groupId }}</p>
          </ion-label>
        </ion-checkbox>
      </ion-item>
    </ion-list>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="updateSecurityGroupAssociation()">
        <ion-icon :icon="checkmarkDoneOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script lang="ts">
import { 
  IonButtons,
  IonButton,
  IonCheckbox,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonFab,
  IonFabButton,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { checkmarkCircleOutline, checkmarkDoneOutline, closeOutline, idCardOutline, save, saveOutline } from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { translate } from '@hotwax/dxp-components'
import { UtilService } from "@/services/UtilService";
import { hasError } from "@hotwax/oms-api";
import logger from "@/logger";
import { showToast } from "@/utils";
import { DateTime } from "luxon";

export default defineComponent({
  name: "CreatePermission",
  components: { 
    IonButtons,
    IonButton,
    IonCheckbox,
    IonChip,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      selectedGroups: [] as Array<string>
    }
  },
  props: ["reason"],
  computed: {
    ...mapGetters({
      securityGroups: 'util/getSecurityGroups',
      securityGroupsByPermission: "util/getSecurityGroupsByPermissionId"
    })
  },
  mounted() {
    this.selectedGroups = JSON.parse(JSON.stringify(this.securityGroupsByPermission))[this.reason.enumId]?.map((group: any) => group.groupId) || []
    console.log('selectedGroups', this.selectedGroups)
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    isSecurityGroupAssociated(groupId: string) {
      return this.selectedGroups?.includes(groupId)
    },
    async generatePermission() {
      try {
        const resp = await UtilService.generatePermission({
          permissionId: this.reason.enumId
        });

        if(!hasError(resp)) {
          await this.store.dispatch("util/updatePermissionForRejectionReason", { id: this.reason.enumId, value: [] })
          this.selectedGroups = JSON.parse(JSON.stringify(this.securityGroupsByPermission[this.reason.enumId]))[this.reason.enumId].map((group: any) => group.groupId)
          showToast(translate("Permission generated for rejection reason"))
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error(err)
      }
    },
    updateSecurityGroup(groupId: any) {
      if(this.isSecurityGroupAssociated(groupId)) {
        this.selectedGroups = this.selectedGroups.filter(id => id !== groupId)
      } else {
        this.selectedGroups.push(groupId)
      }
    },
    async updateSecurityGroupAssociation() {
      const securityGroupIds = this.securityGroupsByPermission[this.reason.enumId].map((group: any) => group.groupId)

      const securityGroupsToAdd = this.selectedGroups.filter((id: string) => !securityGroupIds.includes(id))
      const securityGroupsToRemove = securityGroupIds.filter((id: string) => !this.selectedGroups.includes(id))

      const securityGroupsToAddPayloads = []
      for(let groupId of securityGroupsToAdd) {
        securityGroupsToAddPayloads.push({
          permissionId: this.reason.enumId,
          groupId,
          fromDate: DateTime.now().toMillis()
        })
      }

      const securityGroupsToRemovePayloads = []
      for(let groupId of securityGroupsToRemove) {
        securityGroupsToRemovePayloads.push({
          permissionId: this.reason.enumId,
          groupId,
          thruDate: DateTime.now().toMillis(),
          fromDate: this.securityGroupsByPermission[this.reason.enumId].find((group: any) => group.groupId === groupId).fromDate
        })
      }

      try {
        const resp = await Promise.allSettled([...securityGroupsToAddPayloads.map(payload => UtilService.addSecurityPermissionToSecurityGroup(payload)), ...securityGroupsToRemovePayloads.map(payload => UtilService.removeSecurityPermissionFromSecurityGroup(payload))])
        const isAnyRespFailed = resp.some((response: any) => response.status === 'rejected' || hasError(response.value))

        if(isAnyRespFailed) {
          throw "Failed to update group associations"
        } else {
          showToast(translate("Security group associations updated"))
          // Removing those groups that are in the removePayload and adding all the groups those are in the addPayload
          const securityGroups = this.securityGroupsByPermission[this.reason.enumId].filter((securityGroup: any) => !securityGroupsToRemove.includes(securityGroup.groupId))
          securityGroups.push(...securityGroupsToAddPayloads)
          this.store.dispatch("util/updatePermissionForRejectionReason", { id: this.reason.enumId, value: securityGroups })
        }
      } catch(err) {
        showToast(translate("Failed to update group associations"))
        logger.error(err)
      }

      await modalController.dismiss();
    }
  },
  setup() {
    const store = useStore();
    return {
      checkmarkCircleOutline,
      checkmarkDoneOutline,
      closeOutline,
      idCardOutline,
      save,
      saveOutline,
      store,
      translate
    };
  }
});
</script>

<style scoped>
/* Added so that fab-button not overlap the last item's checkbox */
ion-content {
  --padding-bottom: 80px;
}
</style>