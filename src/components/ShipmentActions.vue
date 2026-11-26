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
    <div v-if="reason" :id="reasonId" class="ship-reason" data-testid="ship-order-disabled-reason">
      <ion-icon :icon="informationCircleOutline" aria-hidden="true" />
      <div>
        {{ translate(reason) }}
        <router-link v-if="reason === TRACKING_REQUIRED && detailsRoute" :to="detailsRoute">
          {{ translate("Open order details") }}
        </router-link>
        <button v-else-if="reason === TRACKING_REQUIRED && canAddTracking" type="button" @click="emit('addTracking')">
          {{ translate("Add tracking number") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { translate } from "@common";
import { IonButton, IonIcon } from "@ionic/vue";
import { ellipsisVerticalOutline, informationCircleOutline } from "ionicons/icons";
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
  display: flex;
  align-items: baseline;
  gap: var(--spacer-xs);
  margin-block: var(--spacer-xs);
  color: var(--ion-text-color);
  font-size: 0.875rem;
  line-height: 1.5;
}
.ship-reason ion-icon {
  align-self: flex-start;
  flex-shrink: 0;
  font-size: 1.125rem;
}
.ship-reason a, .ship-reason button {
  margin-inline-start: 0.25em;
  padding: 0;
  background: transparent;
  color: var(--ion-color-primary);
  font: inherit;
  text-decoration: underline;
  text-underline-offset: 0.15em;
  cursor: pointer;
}
@media (max-width: 990px) {
  .documents, .other-actions { display: none; }
  .more { display: inline-block; }
}
</style>
