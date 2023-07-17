<template>
  <section>
    <ion-item>
      <ion-label>{{ $t("Mapping name") }}</ion-label>
      <ion-input v-model="currentMapping.name" />
    </ion-item>

    <ion-list>

      <ion-item :key="field" v-for="(fieldValues, field) in getFields()">
        <ion-label>{{ $t(fieldValues.label) }}</ion-label>
        <ion-input v-model="currentMapping.value[field]" />
      </ion-item>

    </ion-list>

    <div class="ion-padding-top actions desktop-only">
      <div>
        <ion-button size="small" @click="updateMapping()">
          <ion-icon slot="start" :icon="saveOutline"/>
          {{ $t("Save Changes") }}
        </ion-button>
        <ion-button size="small" fill="outline" color="danger" @click="deleteMapping()">
          <ion-icon slot="start" :icon="trashOutline" />
          {{ $t("Delete mapping") }}
        </ion-button>
      </div>
    </div>

    <div class="ion-padding-top actions mobile-only">
      <ion-button expand="block" @click="updateMapping()">
        <ion-icon slot="start" :icon="saveOutline"/>
        {{ $t("Save Changes") }}
      </ion-button>
      <ion-button fill="outline" color="danger" expand="block" @click="deleteMapping()">
        <ion-icon slot="start" :icon="trashOutline" />
        {{ $t("Delete mapping") }}
      </ion-button>
    </div>
  </section>
</template>

<script lang="ts">
import {
  alertController,
  IonButton,
  IonIcon,
  IonInput,
  IonLabel,
  IonItem,
  IonList
} from "@ionic/vue";
import { defineComponent } from "vue";
import { close, save, saveOutline, trashOutline } from "ionicons/icons";
import { useStore, mapGetters } from "vuex";
import { showToast } from "@/utils";
import { translate } from "@/i18n";

export default defineComponent({
  name: "MappingConfiguration",
  components: { 
    IonButton,
    IonIcon,
    IonInput,
    IonLabel,
    IonItem,
    IonList
  },
  computed: {
    ...mapGetters({
      currentMapping: 'user/getCurrentMapping'
    })
  },
  methods: {
    getFields() {
      const fields = process.env["VUE_APP_MAPPING_" + this.currentMapping.mappingType];
      return fields ? JSON.parse(fields) : {};
    },
    async deleteMapping() {
      const message = this.$t("Are you sure you want to delete this CSV mapping? This action cannot be undone.");
      const alert = await alertController.create({
        header: this.$t("Delete mapping"),
        message,
        buttons: [
          {
            text: this.$t("Cancel"),
          },
          {
            text: this.$t("Delete"),
            handler: () => {
              this.store.dispatch("user/deleteFieldMapping", this.currentMapping)}
          }
        ],
      });
      return alert.present();
    },
    areAllFieldsSelected() {
      return Object.values(this.currentMapping.value).every(field => field !== "");
    },
    async updateMapping() {
      if(!this.currentMapping.name) {
        showToast(translate("Enter mapping name"));
        return;
      }
      if (!this.areAllFieldsSelected()) {
        showToast(translate("Map all fields"));
        return;
      }
      const message = this.$t("Are you sure you want to update this CSV mapping? This action cannot be undone.");
      const alert = await alertController.create({
        header: this.$t("Update mapping"),
        message,
        buttons: [
          {
            text: this.$t("Cancel"),
          },
          {
            text: this.$t("Update"),
            handler: () => {
              this.store.dispatch('user/updateFieldMapping', this.currentMapping)
            }
          }
        ],
      });
      return alert.present();
    }
  },
  setup() {
    const store = useStore();
    return {
      close,
      save,
      saveOutline,
      trashOutline,
      store
    };
  }
});
</script>
