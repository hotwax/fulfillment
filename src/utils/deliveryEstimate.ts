// When a transfer order should arrive, when each FedEx service says it will, and which service to suggest.
// Dates are compared as yyyy-MM-dd strings, so the time of day and the time zone never decide a comparison.
import { DateTime } from "luxon";

// "2026-10-21T23:59:00" (the date FedEx sends, in the local time of the destination) or an epoch in milliseconds (the dates of the OMS
// order) as yyyy-MM-dd. Undefined for anything else.
export function toIsoDate(value: any): string | undefined {
  if(value === null || value === undefined || value === "") {return undefined;}

  if(typeof value === "string") {
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if(iso) {return `${iso[1]}-${iso[2]}-${iso[3]}`;}
    if(!/^\d{10,}$/.test(value.trim())) {return undefined;}
    value = Number(value);
  }
  if(typeof value === "number" && Number.isFinite(value)) {
    const date = DateTime.fromMillis(value);

    return date.isValid ? (date.toISODate() as string) : undefined;
  }

  return undefined;
}

export const addDays = (isoDate: string, days: number) => DateTime.fromISO(isoDate).plus({ days }).toISODate() as string;

// "Wed, Oct 21".
export function formatDeliveryDate(isoDate: string | undefined) {
  const date = isoDate ? DateTime.fromISO(isoDate) : undefined;

  return date?.isValid ? date.toFormat("ccc, LLL d") : "";
}

export interface OrderDeliveryEstimate {
  date: string;
  // The ship group of the order has the date, or it is the order date plus the days of the shipping method.
  source: "shipGroup" | "orderDate";
  days?: number;
}

// The ship group's estimated delivery date when it has one, otherwise the order date plus the delivery days of the order's shipping
// method (calendar days). Undefined when neither can be worked out.
export function orderDeliveryEstimate(order: { shipGroupEstimatedDeliveryDate?: any; methodDeliveryDays?: any; orderDate?: any }): OrderDeliveryEstimate | undefined {
  const fromShipGroup = toIsoDate(order.shipGroupEstimatedDeliveryDate);
  if(fromShipGroup) {return { date: fromShipGroup, source: "shipGroup" };}

  const ordered = toIsoDate(order.orderDate);
  const days = order.methodDeliveryDays === null || order.methodDeliveryDays === undefined || order.methodDeliveryDays === "" ? NaN : Number(order.methodDeliveryDays);
  if(!ordered || !Number.isFinite(days) || days < 0) {return undefined;}

  return { date: addDays(ordered, days), source: "orderDate", days };
}

export interface RateSuggestion {
  key: string;
  // True when the suggested service arrives by the date the order should arrive. False when none does and this is the earliest.
  isOnTime: boolean;
  deliveryDate: string;
}

// The service that gets the package there by the date at the lowest price (the earlier date wins a tie in price). When none gets it
// there in time, the one that gets it there first (the cheaper one wins a tie in date). No suggestion without a date to meet, or
// without a service that has a date and a price.
export function suggestRate(rates: any[] | undefined, targetDate: string | undefined, keyOf: (rate: any) => string): RateSuggestion | undefined {
  if(!targetDate) {return undefined;}

  const candidates = (rates ?? [])
    .map((rate) => ({ rate, date: toIsoDate(rate.estimatedDeliveryDate), amount: Number(rate.shippingEstimateAmount) }))
    .filter((candidate): candidate is { rate: any; date: string; amount: number } => !!candidate.date && Number.isFinite(candidate.amount));
  if(!candidates.length) {return undefined;}

  const inTime = candidates.filter((candidate) => candidate.date <= targetDate);
  const pool = inTime.length ? inTime : candidates;
  const best = pool.reduce((winner, candidate) => {
    const [first, second] = inTime.length ? [candidate.amount - winner.amount, candidate.date.localeCompare(winner.date)] : [candidate.date.localeCompare(winner.date), candidate.amount - winner.amount];

    return first < 0 || (first === 0 && second < 0) ? candidate : winner;
  });

  return { key: keyOf(best.rate), isOnTime: inTime.length > 0, deliveryDate: best.date };
}

// A service that arrives after the date the order should arrive.
export const isAfter = (deliveryDate: any, targetDate: string | undefined) => {
  const date = toIsoDate(deliveryDate);

  return !!date && !!targetDate && date > targetDate;
};
