// Rates are asked for one carrier service at a time, all at once, so each rate can be shown as soon as its carrier answers
// instead of after the slowest one. The services come from poorti/shippingRateOptions, which answers without asking a carrier.

type ShippingRate = Record<string, any>;

export type RateOptionStatus = "pending" | "done" | "failed";

export interface RateOption {
  carrierPartyId: string;
  carrierServiceCode: string;
  // The shipment methods that use this service (FDX_GROUND and STANDARD both use GROUND_HOME_DELIVERY).
  shipmentMethodTypeIds: string[];
}

export interface RateStreamRow extends RateOption {
  key: string;
  status: RateOptionStatus;
  // The attempt that is running (1 is the first), and how many there are at most. Shown while a service is asked again.
  attempt: number;
  maxAttempts: number;
}

// FedEx's sandbox answers a valid request with an error about 4 times in 10 (500 and 503, the same request succeeds a moment later),
// so a service that gets no rate is asked for again before the page gives up on it. delayMs grows with each retry.
export const rateRetry = { retries: 3, delayMs: 1000 };

export const rateOptionKey = (option: Pick<RateOption, "carrierPartyId" | "carrierServiceCode">) => `${option.carrierPartyId}|${option.carrierServiceCode}`;

// Options the backend sent that cannot be rated (no carrier or service code), and repeats, are dropped.
export function toRateRows(options: Partial<RateOption>[] | null | undefined): RateStreamRow[] {
  const seen = new Set<string>();
  const rows: RateStreamRow[] = [];

  for(const option of options ?? []) {
    if(!option?.carrierPartyId || !option.carrierServiceCode) {continue;}
    const key = rateOptionKey(option as RateOption);
    if(seen.has(key)) {continue;}
    seen.add(key);
    rows.push({
      key,
      carrierPartyId: option.carrierPartyId,
      carrierServiceCode: option.carrierServiceCode,
      shipmentMethodTypeIds: option.shipmentMethodTypeIds ?? [],
      status: "pending",
      attempt: 1,
      maxAttempts: rateRetry.retries + 1
    });
  }

  return rows;
}

interface RunOptions {
  // The most requests in flight at once. The backend handles each on its own thread, so this is a courtesy, not a need.
  concurrency?: number;
  // Called as each service settles. rates is empty and error is set when the request failed.
  onSettled: (row: RateStreamRow, result: { rates: ShippingRate[]; error?: unknown }) => void;
  // True when the run was replaced by a newer one: late answers are ignored and no more requests are started.
  isCancelled?: () => boolean;
}

// Never rejects: one service failing must not hide the rates of the others.
export async function runRateStream(rows: RateStreamRow[], fetchOne: (row: RateStreamRow) => Promise<ShippingRate[]>, options: RunOptions) {
  const { concurrency = 6, onSettled, isCancelled = () => false } = options;
  let next = 0;

  const worker = async () => {
    while(next < rows.length && !isCancelled()) {
      const row = rows[next++];
      let result: { rates: ShippingRate[]; error?: unknown };
      try {
        result = { rates: (await fetchOne(row)) ?? [] };
      } catch (error) {
        result = { rates: [], error };
      }
      if(isCancelled()) {return;}
      onSettled(row, result);
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, rows.length)) }, worker));
}

interface RetryOptions {
  retries?: number;
  delayMs?: number;
  // Called before each retry with the attempt that is about to run (2 is the first retry) and the most there will be.
  onRetry?: (attempt: number, maxAttempts: number) => void;
  // True when nobody wants the answer any more: no further attempt is made.
  isCancelled?: () => boolean;
}

// Asks again while the answer is an error or no rate. Resolves with the first answer that has rates; when every attempt fails it
// rejects with the last error, or resolves with no rates when the last answers were empty.
export async function fetchWithRetries<T>(fetchOnce: () => Promise<T[]>, options: RetryOptions = {}): Promise<T[]> {
  const { retries = rateRetry.retries, delayMs = rateRetry.delayMs, onRetry, isCancelled = () => false } = options;
  let lastError: unknown;

  for(let attempt = 1; attempt <= retries + 1; attempt++) {
    if(attempt > 1) {
      if(isCancelled()) {break;}
      onRetry?.(attempt, retries + 1);
      if(delayMs > 0) {await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt - 1)));}
      if(isCancelled()) {break;}
    }

    try {
      const rates = (await fetchOnce()) ?? [];
      if(rates.length) {return rates;}
      lastError = undefined;
    } catch (error) {
      lastError = error;
    }
  }

  if(lastError) {throw lastError;}

  return [];
}
