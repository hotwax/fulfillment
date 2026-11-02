// Pure helpers for the rate list on the Ship transfer order page: clean up the rows the backend returns, and a small TTL
// cache of them. The rates call rate shops one Unigate request per configured shipment method and takes several seconds,
// so a shipment's rates are kept for a few minutes and re-entering the page does not ask again.

export const SHIPPING_RATES_TTL_MS = 5 * 60 * 1000;
const STORAGE_KEY_PREFIX = "fulfillment.shippingRates.";

type ShippingRate = Record<string, any>;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface CacheEntry {
  at: number;
  rates: ShippingRate[];
}

interface DedupeOptions {
  // A method that belongs to one carrier only (FDX_GROUND) is a better label for a service than one every carrier shares (STANDARD).
  isCarrierSpecificMethod?: (carrierPartyId: string, shipmentMethodTypeId: string) => boolean;
}

const normalize = (value: any) => `${value ?? ""}`.trim().toUpperCase();
const amountOf = (rate: ShippingRate) => parseFloat(rate.shippingEstimateAmount);

// The service the gateway actually priced: the carrier plus the gateway's own service id (GROUND_HOME_DELIVERY), or its label
// when the gateway sent no id. `shipmentMethodTypeId` is only the method that was asked for, so it is not part of the service.
export const shippingRateServiceKey = (rate: ShippingRate) => [
  normalize(rate.carrierPartyId),
  normalize(rate.actualCarrierCode),
  normalize(rate.gatewayRateId || rate.carrierService)
].join("|");

// One row of the list: the service plus the method a click on it sends to updateRouteShipmentCarrierAndMethod.
export const shippingRateKey = (rate: ShippingRate) => `${shippingRateServiceKey(rate)}|${normalize(rate.shipmentMethodTypeId)}`;

// get#NewShippingRates returns one row per carrier shipment method, with the method it asked for and the service the gateway
// answered with. Those disagree in two ways, and the page would list the same service several times:
//   1. Two methods map to one service (FDX_GROUND and STANDARD are both GROUND_HOME_DELIVERY).
//   2. A row is priced for the wrong service (SECOND_DAY comes back as GROUND_HOME_DELIVERY, a leftover of another carrier's
//      request), so it repeats a method that also has its own, correct row.
// Rule: show every service once, cheapest first.
//   - A row whose method is claimed by more than one row (SECOND_DAY twice) is doubtful. A service that also has an
//     unambiguous row (FDX_GROUND, STANDARD) drops its doubtful rows. A service that only has doubtful rows keeps them,
//     since the gateway did price it (FEDEX_2_DAY keeps its SECOND_DAY row).
//   - Among the rows left for a service, pick a method that is specific to the carrier, then the first row the backend
//     returned. The pick is the method and service that go to the label request.
// Rows without a carrier, method, service or a numeric amount cannot be bought and are dropped.
export function dedupeShippingRates(rates: ShippingRate[] | null | undefined, options: DedupeOptions = {}) {
  const { isCarrierSpecificMethod } = options;
  const rows = (rates ?? []).filter((rate) => rate?.carrierPartyId && rate.shipmentMethodTypeId && (rate.gatewayRateId || rate.carrierService) && Number.isFinite(amountOf(rate)));

  const methodClaims = new Map<string, number>();
  for(const rate of rows) {
    const methodKey = `${normalize(rate.carrierPartyId)}|${normalize(rate.shipmentMethodTypeId)}`;
    methodClaims.set(methodKey, (methodClaims.get(methodKey) ?? 0) + 1);
  }
  const isUnambiguous = (rate: ShippingRate) => methodClaims.get(`${normalize(rate.carrierPartyId)}|${normalize(rate.shipmentMethodTypeId)}`) === 1;

  const rowsByService = new Map<string, ShippingRate[]>();
  for(const rate of rows) {
    const serviceKey = shippingRateServiceKey(rate);
    rowsByService.set(serviceKey, [...(rowsByService.get(serviceKey) ?? []), rate]);
  }

  const preferenceOf = (rate: ShippingRate) => isCarrierSpecificMethod?.(rate.carrierPartyId, rate.shipmentMethodTypeId) ? 0 : 1;

  const picked: ShippingRate[] = [];
  for(const serviceRows of rowsByService.values()) {
    const unambiguousRows = serviceRows.filter(isUnambiguous);
    const candidates = unambiguousRows.length ? unambiguousRows : serviceRows;
    // Array#sort is stable: equal preference keeps the order of the response.
    picked.push([...candidates].sort((a, b) => preferenceOf(a) - preferenceOf(b))[0]);
  }

  return picked
    .map((rate, index) => ({ rate, index }))
    .sort((a, b) => amountOf(a.rate) - amountOf(b.rate) || a.index - b.index)
    .map(({ rate }) => rate);
}

// "FedEx Home Delivery®" already names the carrier, so it is not shown as "FedEx - FedEx Home Delivery®".
export function shippingRateName(rate: ShippingRate, carrierDesc: string, methodDesc = "") {
  const service = `${rate.carrierService || methodDesc || rate.shipmentMethodTypeId || ""}`.trim();
  const carrier = `${carrierDesc || rate.carrierPartyId || ""}`.trim();
  if(!carrier || service.toLowerCase().startsWith(carrier.toLowerCase())) {return service;}

  return `${carrier} - ${service}`;
}

export const isFreshCacheEntry = (entry: CacheEntry | null | undefined, now = Date.now(), ttlMs = SHIPPING_RATES_TTL_MS): entry is CacheEntry => {
  return !!entry && Array.isArray(entry.rates) && entry.rates.length > 0 && Number.isFinite(entry.at) && now - entry.at >= 0 && now - entry.at < ttlMs;
};

// Storage can be missing, full or blocked (private windows), and a cache must never break the page.
export function readShippingRatesCache(storage: StorageLike | null | undefined, shipmentId: string, now = Date.now(), ttlMs = SHIPPING_RATES_TTL_MS): CacheEntry | null {
  try {
    const stored = storage?.getItem(`${STORAGE_KEY_PREFIX}${shipmentId}`);
    const entry = stored ? JSON.parse(stored) : null;

    return isFreshCacheEntry(entry, now, ttlMs) ? entry : null;
  } catch {
    return null;
  }
}

export function writeShippingRatesCache(storage: StorageLike | null | undefined, shipmentId: string, entry: CacheEntry) {
  try {
    storage?.setItem(`${STORAGE_KEY_PREFIX}${shipmentId}`, JSON.stringify(entry));
  } catch {
    // The memory copy still serves this session.
  }
}

export function removeShippingRatesCache(storage: StorageLike | null | undefined, shipmentId: string) {
  try {
    storage?.removeItem(`${STORAGE_KEY_PREFIX}${shipmentId}`);
  } catch {
    // Nothing to remove.
  }
}
