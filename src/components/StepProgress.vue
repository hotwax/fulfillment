<template>
  <ion-card class="step-progress">
    <ion-card-header>
      <ion-card-title>{{ title }}</ion-card-title>
      <ion-card-subtitle v-if="subtitle">{{ subtitle }}</ion-card-subtitle>
    </ion-card-header>

    <ion-progress-bar :type="isFinished ? 'determinate' : 'indeterminate'" :value="isFinished ? 1 : 0" :color="isFinished ? 'success' : 'primary'" />

    <ion-card-content>
      <ol class="steps" role="status" aria-live="polite">
        <li v-for="(step, index) in steps" :key="index" class="step" :class="stateOf(index)" :data-testid="`step-${index}-${stateOf(index)}`">
          <span class="marker">
            <ion-icon v-if="stateOf(index) === 'done'" :icon="checkmarkCircle" color="success" />
            <ion-spinner v-else-if="stateOf(index) === 'active'" name="crescent" />
            <ion-icon v-else :icon="ellipseOutline" color="medium" />
          </span>
          <span class="text">
            <span class="label">{{ stateOf(index) === "done" && step.doneLabel ? step.doneLabel : step.label }}</span>
            <ion-note v-if="stateOf(index) === 'active' && activeHint" class="hint" data-testid="step-hint">{{ activeHint }}</ion-note>
          </span>
        </li>
      </ol>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonIcon, IonNote, IonProgressBar, IonSpinner } from "@ionic/vue";
import { checkmarkCircle, ellipseOutline } from "ionicons/icons";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { type StepHint, hintFor, stepState } from "@/utils/stepProgress";

interface Step {
  label: string;
  // What the step reads once it is finished. Defaults to the label.
  doneLabel?: string;
  // Reassuring lines that appear while the step is still running, by how long it has been running.
  hints?: StepHint[];
}

// An activeIndex equal to steps.length means every step is done.
const props = defineProps<{ title: string; subtitle?: string; steps: Step[]; activeIndex: number }>();

const isFinished = computed(() => props.activeIndex >= props.steps.length);
const stateOf = (index: number) => stepState(index, props.activeIndex);

// Seconds the active step has been running. Starts again whenever the next step becomes the active one.
const elapsedSeconds = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

const activeHint = computed(() => hintFor(props.steps[props.activeIndex]?.hints, elapsedSeconds.value));

watch(() => props.activeIndex, () => { elapsedSeconds.value = 0; });

onMounted(() => {
  timer = setInterval(() => { elapsedSeconds.value += 1; }, 1000);
});

onBeforeUnmount(() => {
  if(timer) {clearInterval(timer);}
});
</script>

<style scoped>
.step-progress {
  margin: 0;
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacer-sm);
}

.step {
  display: flex;
  align-items: flex-start;
  gap: var(--spacer-sm);
  color: var(--ion-color-medium);
  transition: color 0.2s ease;
}

.step.active {
  color: var(--ion-text-color);
  font-weight: 500;
}

.step.done {
  color: var(--ion-text-color);
}

.marker {
  flex: 0 0 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.marker ion-spinner {
  width: 20px;
  height: 20px;
}

.text {
  display: flex;
  flex-direction: column;
  min-height: 24px;
  justify-content: center;
}

.hint {
  font-weight: 400;
  animation: hint-in 0.3s ease;
}

@keyframes hint-in {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
