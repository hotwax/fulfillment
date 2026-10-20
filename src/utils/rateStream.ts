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
}

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
      status: "pending"
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
