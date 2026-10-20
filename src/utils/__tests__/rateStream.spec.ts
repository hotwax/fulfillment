import { describe, expect, it } from "vitest";
import { type RateStreamRow, runRateStream, toRateRows } from "@/utils/rateStream";

const option = (carrierServiceCode: string, shipmentMethodTypeIds = [carrierServiceCode], carrierPartyId = "FEDEX") => ({ carrierPartyId, carrierServiceCode, shipmentMethodTypeIds });

describe("toRateRows", () => {
  it("starts every service pending", () => {
    const rows = toRateRows([option("GROUND_HOME_DELIVERY", ["FDX_GROUND", "STANDARD"]), option("FEDEX_2_DAY")]);

    expect(rows.map((row) => [row.key, row.status])).toEqual([["FEDEX|GROUND_HOME_DELIVERY", "pending"], ["FEDEX|FEDEX_2_DAY", "pending"]]);
    expect(rows[0].shipmentMethodTypeIds).toEqual(["FDX_GROUND", "STANDARD"]);
  });

  it("drops options that cannot be rated and repeats", () => {
    const rows = toRateRows([option("FEDEX_2_DAY"), option("FEDEX_2_DAY"), { carrierPartyId: "FEDEX" }, { carrierServiceCode: "X" }, null as any, option("FEDEX_2_DAY", ["A"], "UPS")]);

    expect(rows.map((row) => row.key)).toEqual(["FEDEX|FEDEX_2_DAY", "UPS|FEDEX_2_DAY"]);
  });

  it("is empty without options", () => {
    expect(toRateRows(undefined)).toEqual([]);
    expect(toRateRows([])).toEqual([]);
  });
});

describe("runRateStream", () => {
  const rowsOf = (...codes: string[]) => toRateRows(codes.map((code) => option(code)));
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it("reports each service as it settles, fastest first", async () => {
    const settled: string[] = [];
    const delays: Record<string, number> = { SLOW: 30, FAST: 1, MID: 10 };

    await runRateStream(rowsOf("SLOW", "FAST", "MID"), async (row: RateStreamRow) => {
      await delay(delays[row.carrierServiceCode]);

      return [{ gatewayRateId: row.carrierServiceCode }];
    }, { onSettled: (row) => { settled.push(row.carrierServiceCode); } });

    expect(settled).toEqual(["FAST", "MID", "SLOW"]);
  });

  it("starts the requests together instead of one after the other", async () => {
    let inFlight = 0;
    let peak = 0;

    await runRateStream(rowsOf("A", "B", "C", "D"), async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await delay(5);
      inFlight--;

      return [];
    }, { onSettled: () => undefined });

    expect(peak).toBe(4);
  });

  it("never has more requests in flight than the limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const settled: string[] = [];

    await runRateStream(rowsOf("A", "B", "C", "D", "E"), async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await delay(5);
      inFlight--;

      return [];
    }, { concurrency: 2, onSettled: (row) => { settled.push(row.carrierServiceCode); } });

    expect(peak).toBe(2);
    expect(settled.sort()).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("keeps the other rates when one service fails, and never rejects", async () => {
    const results: Record<string, any> = {};

    await runRateStream(rowsOf("OK", "BAD"), (row) => row.carrierServiceCode === "BAD" ? Promise.reject(new Error("carrier timed out")) : Promise.resolve([{ gatewayRateId: "OK" }]), { onSettled: (row, result) => { results[row.carrierServiceCode] = result; } });

    expect(results.OK.rates).toHaveLength(1);
    expect(results.OK.error).toBeUndefined();
    expect(results.BAD.rates).toEqual([]);
    expect((results.BAD.error as Error).message).toBe("carrier timed out");
  });

  it("treats a missing answer as no rates", async () => {
    const results: any[] = [];

    await runRateStream(rowsOf("A"), () => Promise.resolve(undefined as any), { onSettled: (_row, result) => { results.push(result); } });

    expect(results).toEqual([{ rates: [] }]);
  });

  it("ignores answers that arrive after the run was replaced", async () => {
    let cancelled = false;
    const settled: string[] = [];

    // A answers first and a newer run takes over; B was already in flight and answers late.
    await runRateStream(rowsOf("A", "B"), async (row) => {
      await delay(row.carrierServiceCode === "A" ? 1 : 20);

      return [];
    }, { onSettled: (row) => { settled.push(row.carrierServiceCode); cancelled = true; }, isCancelled: () => cancelled });

    expect(settled).toEqual(["A"]);
  });

  it("does nothing for no services", async () => {
    await expect(runRateStream([], () => Promise.resolve([]), { onSettled: () => { throw new Error("unexpected"); } })).resolves.toBeUndefined();
  });
});
