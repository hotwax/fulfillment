<template>
  <div class="shipment-actions">
    <div class="action-row">
      <ion-button :disabled="shipped || !!reason" :aria-describedby="reason ? reasonId : undefined" @click.stop="emit('ship')">
        <slot name="icon" />
        {{ translate(shipped ? "Shipped" : label) }}
      </ion-button>
      <div class="documents">
        <slot name="documents" />
      </div>
      <div class="other-actions">
        <slot name="other" />
      </div>
      <ion-button class="more" fill="clear" color="medium" :aria-label="translate('More shipping actions')" @click.stop="emit('more', $event)">
        <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
      </ion-button>
    </div>
    <ion-item v-if="reason" lines="none" class="ship-reason">
      <ion-note :id="reasonId" data-testid="ship-order-disabled-reason">
        {{ translate(reason) }}
      </ion-note>
      <router-link v-if="reason === TRACKING_REQUIRED && detailsRoute" v-slot="{ href, navigate }" :to="detailsRoute" custom>
        <ion-button slot="end" fill="clear" :href="href" @click="navigate">
          {{ translate("Open order details") }}
        </ion-button>
      </router-link>
      <ion-button v-else-if="reason === TRACKING_REQUIRED && canAddTracking" slot="end" fill="clear" @click="emit('addTracking')">
        {{ translate("Add tracking number") }}
      </ion-button>
    </ion-item>
  </div>
</template>

<script setup lang="ts">
import { translate } from "@common";
import { IonButton, IonIcon, IonItem, IonNote } from "@ionic/vue";
import { ellipsisVerticalOutline } from "ionicons/icons";
import { computed, useId } from "vue";
import { type RouteLocationRaw, RouterLink } from "vue-router";
import { type ShipmentForShipping, TRACKING_REQUIRED, getShipDisabledReason } from "@/utils/shipDisabledReason";

const props = withDefaults(defineProps<{
  order: ShipmentForShipping;
  canShip: boolean;
  canForceShip: boolean;
  label?: string;
  detailsRoute?: RouteLocationRaw;
  canAddTracking?: boolean;
}>(), { label: "Ship Now", detailsRoute: undefined, canAddTracking: false });
const emit = defineEmits<{ (event: "ship" | "addTracking"): void; (event: "more", value: Event): void }>();
const reasonId = useId();
const shipped = computed(() => props.order.statusId === "SHIPMENT_SHIPPED");
const reason = computed(() => {
  if(shipped.value) {return "";}
  if(props.order.statusId !== "SHIPMENT_PACKED") {return "This shipment must be packed before it can ship.";}

  return getShipDisabledReason(props.order, props.canShip, props.canForceShip);
});
</script>

<style scoped>
.shipment-actions {
  padding: var(--spacer-xs) var(--spacer-sm);
  border-top: var(--border-medium);
}
.action-row, .documents, .other-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacer-xs);
}
.action-row ion-button, .action-row :deep(ion-button) {
  margin-inline: 0;
}
.other-actions, .action-row .more {
  margin-inline-start: auto;
}
.more {
  display: none;
}
.ship-reason {
  --padding-start: 0;
  --inner-padding-end: 0;
  width: fit-content;
  max-width: 100%;
}
.ship-reason ion-note {
  align-self: center;
  font-size: 0.875rem;
}
.ship-reason ion-button {
  margin-inline: var(--spacer-xs) 0;
}
@media (max-width: 990px) {
  .documents, .other-actions { display: none; }
  .more { display: inline-block; }
}
</style>
