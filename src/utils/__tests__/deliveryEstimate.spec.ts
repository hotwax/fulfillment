import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { addDays, formatDeliveryDate, isAfter, orderDeliveryEstimate, suggestRate, toIsoDate } from "@/utils/deliveryEstimate";

const key = (rate: any) => rate.service;
const rate = (service: string, amount: string, estimatedDeliveryDate?: string) => ({ service, shippingEstimateAmount: amount, estimatedDeliveryDate });

describe("toIsoDate", () => {
  it("reads the date FedEx sends, whatever the time of day", () => {
    expect(toIsoDate("2026-10-21T23:59:00")).toBe("2026-10-21");
    expect(toIsoDate("2026-10-22T10:30:00")).toBe("2026-10-22");
    expect(toIsoDate("2026-10-21")).toBe("2026-10-21");
  });

  it("reads an epoch of the order in milliseconds, as a number or a string", () => {
    const ms = DateTime.fromISO("2026-10-13T12:00:00").toMillis();

    expect(toIsoDate(ms)).toBe("2026-10-13");
    expect(toIsoDate(`${ms}`)).toBe("2026-10-13");
  });

  it("is undefined for nothing or for text it cannot read", () => {
    for(const value of [undefined, null, "", "soon", "21/10/2026", {}, NaN]) {expect(toIsoDate(value)).toBeUndefined();}
  });
});

describe("dates", () => {
  it("adds calendar days across a month", () => {
    expect(addDays("2026-10-13", 5)).toBe("2026-10-18");
    expect(addDays("2026-10-29", 5)).toBe("2026-11-03");
  });

  it("writes a date for people", () => {
    expect(formatDeliveryDate("2026-10-21")).toBe("Wed, Oct 21");
    expect(formatDeliveryDate(undefined)).toBe("");
    expect(formatDeliveryDate("nope")).toBe("");
  });
});

describe("orderDeliveryEstimate", () => {
  const orderDate = DateTime.fromISO("2026-10-13T12:00:00").toMillis();

  it("takes the estimated delivery date of the ship group when it has one", () => {
    const shipGroup = DateTime.fromISO("2026-10-16T12:00:00").toMillis();

    expect(orderDeliveryEstimate({ shipGroupEstimatedDeliveryDate: shipGroup, methodDeliveryDays: 5, orderDate })).toEqual({ date: "2026-10-16", source: "shipGroup" });
  });

  it("otherwise adds the delivery days of the shipping method to the order date", () => {
    expect(orderDeliveryEstimate({ methodDeliveryDays: 5, orderDate })).toEqual({ date: "2026-10-18", source: "orderDate", days: 5 });
    expect(orderDeliveryEstimate({ shipGroupEstimatedDeliveryDate: null, methodDeliveryDays: "2", orderDate })).toEqual({ date: "2026-10-15", source: "orderDate", days: 2 });
    expect(orderDeliveryEstimate({ methodDeliveryDays: 0, orderDate })).toEqual({ date: "2026-10-13", source: "orderDate", days: 0 });
  });

  it("is undefined when the method has no days (or they are not a number) and the ship group has no date", () => {
    expect(orderDeliveryEstimate({ orderDate })).toBeUndefined();
    expect(orderDeliveryEstimate({ methodDeliveryDays: null, orderDate })).toBeUndefined();
    expect(orderDeliveryEstimate({ methodDeliveryDays: "", orderDate })).toBeUndefined();
    expect(orderDeliveryEstimate({ methodDeliveryDays: "soon", orderDate })).toBeUndefined();
    expect(orderDeliveryEstimate({ methodDeliveryDays: 5 })).toBeUndefined();
  });
});

describe("suggestRate", () => {
  const rates = [
    rate("GROUND", "13.48", "2026-10-21T23:59:00"),
    rate("TWO_DAY", "30.18", "2026-10-22T17:00:00"),
    rate("STANDARD_OVERNIGHT", "47.08", "2026-10-21T17:00:00"),
    rate("PRIORITY_OVERNIGHT", "49.48", "2026-10-21T10:30:00")
  ];

  it("suggests the cheapest service that arrives by the date", () => {
    expect(suggestRate(rates, "2026-10-25", key)).toEqual({ key: "GROUND", isOnTime: true, deliveryDate: "2026-10-21" });
    expect(suggestRate(rates, "2026-10-21", key)).toEqual({ key: "GROUND", isOnTime: true, deliveryDate: "2026-10-21" });
  });

  it("skips a cheaper service that arrives too late", () => {
    const slowButCheap = [rate("SLOW", "9.00", "2026-10-24T17:00:00"), rate("FAST", "20.00", "2026-10-22T17:00:00")];

    expect(suggestRate(slowButCheap, "2026-10-23", key)).toMatchObject({ key: "FAST", isOnTime: true });
  });

  it("settles a tie in price with the earlier date", () => {
    const tie = [rate("LATER", "10.00", "2026-10-22T17:00:00"), rate("EARLIER", "10.00", "2026-10-21T17:00:00")];

    expect(suggestRate(tie, "2026-10-30", key)?.key).toBe("EARLIER");
  });

  it("suggests the one that arrives first when none arrives in time, the cheapest of those that arrive that day", () => {
    // Ground, Standard Overnight and Priority Overnight all arrive on the 21st, the time of day does not count: the cheapest of them.
    expect(suggestRate(rates, "2026-10-18", key)).toEqual({ key: "GROUND", isOnTime: false, deliveryDate: "2026-10-21" });

    const earlierDay = [rate("PRICEY", "50.00", "2026-10-21T10:30:00"), rate("CHEAP", "20.00", "2026-10-22T17:00:00")];
    expect(suggestRate(earlierDay, "2026-10-18", key)).toMatchObject({ key: "PRICEY", isOnTime: false });
  });

  it("has no suggestion without a date to meet, or without a service that has a date and a price", () => {
    expect(suggestRate(rates, undefined, key)).toBeUndefined();
    expect(suggestRate([], "2026-10-25", key)).toBeUndefined();
    expect(suggestRate(undefined, "2026-10-25", key)).toBeUndefined();
    expect(suggestRate([rate("NO_DATE", "5.00"), rate("NO_PRICE", "abc", "2026-10-21T10:00:00")], "2026-10-25", key)).toBeUndefined();
  });

  it("ignores a service without a date when others have one", () => {
    expect(suggestRate([rate("NO_DATE", "1.00"), rate("DATED", "20.00", "2026-10-21T17:00:00")], "2026-10-25", key)?.key).toBe("DATED");
  });
});

describe("isAfter", () => {
  it("is true only for a date after the target", () => {
    expect(isAfter("2026-10-22T17:00:00", "2026-10-21")).toBe(true);
    expect(isAfter("2026-10-21T23:59:00", "2026-10-21")).toBe(false);
    expect(isAfter(undefined, "2026-10-21")).toBe(false);
    expect(isAfter("2026-10-22T17:00:00", undefined)).toBe(false);
  });
});
