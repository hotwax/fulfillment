import { useLiveEntity } from "@common";
import type { DbRow, LiveEntityOptions } from "@common/db";
import { computed, watch } from "vue";
import { liveOrdersStatus } from "@/db/appDbSync";

// What each live read last returned, kept while the sync runs. Pages are mounted afresh on every visit, and a live read
// starts empty until IndexedDB answers, which would flash a skeleton or an empty page for a few frames. The last answer
// stands in until the first real one arrives, so a visit paints with data on its first frame.
const lastAnswers = new Map<string, DbRow[]>();

// Logout stops the sync and empties the database, so what was remembered goes with it.
let watchingSync = false;
function forgetWhenSyncStops() {
  if(watchingSync) {return;}
  watchingSync = true;
  watch(() => liveOrdersStatus.running, (running, wasRunning) => {
    if(wasRunning && !running) {lastAnswers.clear();}
  });
}

type LiveOptions = LiveEntityOptions | (() => LiveEntityOptions) | undefined;

export function useCachedLiveEntity<T = DbRow>(table: string, options: LiveOptions, cacheKey: () => string) {
  forgetWhenSyncStops();
  const live = useLiveEntity<T>(table, options);
  const answered = () => live.hydrated.value || live.records.value.length > 0 || !!live.error.value;

  const records = computed<T[]>(() => (answered() ? live.records.value : ((lastAnswers.get(cacheKey()) as unknown as T[]) ?? live.records.value)));
  // A remembered answer counts as loaded: there is something to show.
  const hydrated = computed(() => live.hydrated.value || lastAnswers.has(cacheKey()));

  watch([live.records, live.hydrated, cacheKey], () => {
    if(answered()) {lastAnswers.set(cacheKey(), live.records.value as unknown as DbRow[]);}
  }, { immediate: true });

  return { ...live, records, hydrated };
}
