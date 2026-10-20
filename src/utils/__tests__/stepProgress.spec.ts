import { describe, expect, it } from "vitest";
import { hintFor, stepState } from "@/utils/stepProgress";

const hints = [
  { afterSeconds: 0, text: "Sending the details" },
  { afterSeconds: 4, text: "Waiting on the carrier" },
  { afterSeconds: 10, text: "Nearly there" }
];

describe("hintFor", () => {
  it("shows the first line at once", () => {
    expect(hintFor(hints, 0)).toBe("Sending the details");
  });

  it("moves to the next line when its time is reached", () => {
    expect(hintFor(hints, 3)).toBe("Sending the details");
    expect(hintFor(hints, 4)).toBe("Waiting on the carrier");
    expect(hintFor(hints, 9)).toBe("Waiting on the carrier");
  });

  it("keeps the last line however long it takes", () => {
    expect(hintFor(hints, 10)).toBe("Nearly there");
    expect(hintFor(hints, 600)).toBe("Nearly there");
  });

  it("does not depend on the order the hints are given in", () => {
    expect(hintFor([...hints].reverse(), 5)).toBe("Waiting on the carrier");
  });

  it("is empty when there are no hints or none is due yet", () => {
    expect(hintFor(undefined, 5)).toBe("");
    expect(hintFor([], 5)).toBe("");
    expect(hintFor([{ afterSeconds: 3, text: "Later" }], 1)).toBe("");
  });
});

describe("stepState", () => {
  it("marks steps before the active one done and after it pending", () => {
    expect([0, 1, 2].map((index) => stepState(index, 1))).toEqual(["done", "active", "pending"]);
  });

  it("marks every step done once the active index passes the last step", () => {
    expect([0, 1, 2].map((index) => stepState(index, 3))).toEqual(["done", "done", "done"]);
  });

  it("marks every step pending when none has started", () => {
    expect([0, 1].map((index) => stepState(index, -1))).toEqual(["pending", "pending"]);
  });
});
