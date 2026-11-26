<template>
  <div class="ship-action">
    <ion-button :fill="fill" :disabled="shipped || !!reason" :aria-describedby="reason ? reasonId : undefined" @click.stop="emit('ship')">
      <slot />
      {{ translate(shipped ? "Shipped" : label) }}
    </ion-button>
    <ion-note v-if="reason" :id="reasonId" class="ship-reason" data-testid="ship-order-disabled-reason">
      {{ translate(reason) }}
    </ion-note>
  </div>
</template>

<script setup lang="ts">
import { translate } from "@common";
import { IonButton, IonNote } from "@ionic/vue";
import { computed, useId } from "vue";
import { type ShipmentForShipping, getShipDisabledReason } from "@/utils/shipDisabledReason";

const props = withDefaults(defineProps<{
  order: ShipmentForShipping;
  canShip: boolean;
  canForceShip: boolean;
  label?: string;
  fill?: "clear" | "solid";
}>(), { label: "Ship Now", fill: "solid" });
const emit = defineEmits<{ (event: "ship"): void }>();
const reasonId = useId();
const shipped = computed(() => props.order.statusId === "SHIPMENT_SHIPPED");
const reason = computed(() => {
  if(shipped.value) {return "";}
  if(props.order.statusId !== "SHIPMENT_PACKED") {return "This shipment must be packed before it can ship.";}

  return getShipDisabledReason(props.order, props.canShip, props.canForceShip);
});
</script>

<style scoped>
.ship-action {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  vertical-align: top;
  max-inline-size: 100%;
}
.ship-reason {
  max-inline-size: 32ch;
  margin: var(--spacer-xs);
  color: var(--ion-text-color);
  line-height: 1.4;
}
</style>
