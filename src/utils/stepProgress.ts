// Pure helpers for the step-by-step progress card shown while the system works on something that takes seconds
// (rate shopping, buying a shipping label).

export interface StepHint {
  // Seconds the step has been active before this line is shown.
  afterSeconds: number;
  text: string;
}

export type StepState = "done" | "active" | "pending";

// The line that fits the time the step has been running: the one with the largest afterSeconds that has been reached.
export function hintFor(hints: StepHint[] | undefined, elapsedSeconds: number): string {
  if(!hints?.length) {return "";}

  const reached = hints.filter((hint) => hint.afterSeconds <= elapsedSeconds);
  if(!reached.length) {return "";}

  return reached.reduce((latest, hint) => hint.afterSeconds >= latest.afterSeconds ? hint : latest).text;
}

// An activeIndex equal to the number of steps means every step is done.
export function stepState(index: number, activeIndex: number): StepState {
  if(index < activeIndex) {return "done";}

  return index === activeIndex ? "active" : "pending";
}
