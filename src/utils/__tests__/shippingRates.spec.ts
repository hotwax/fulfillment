import { describe, expect, it } from "vitest";
import {
  SHIPPING_RATES_TTL_MS,
  dedupeShippingRates,
  isFreshCacheEntry,
  readShippingRatesCache,
  removeShippingRatesCache,
  shippingRateKey,
  shippingRateName,
  shippingRateServiceKey,
  writeShippingRatesCache
} from "@/utils/shippingRates";

const rate = (shipmentMethodTypeId: string, gatewayRateId: string, carrierService: string, shippingEstimateAmount: string, overrides: Record<string, unknown> = {}) => ({
  shippingEstimateAmount,
  carrierService,
  carrierPartyId: "FEDEX",
  shipmentMethodTypeId,
  currencyUomId: "USD",
  gatewayRateId,
  actualCarrierCode: "FEDEX",
  ...overrides
});

// The rows get#NewShippingRates returned for shipment M103984 on demo-maarg (FEDEX, then the UPS pass that rate shopped with FEDEX's request).
const demoRates = () => [
  rate("FDX_GROUND", "GROUND_HOME_DELIVERY", "FedEx Home Delivery®", "20.71"),
  rate("FDX_PRIORITY_OVN", "PRIORITY_OVERNIGHT", "FedEx Priority Overnight®", "56.77"),
  rate("NEXT_DAY", "STANDARD_OVERNIGHT", "FedEx Standard Overnight®", "54.38"),
  rate("SECOND_DAY", "FEDEX_2_DAY", "FedEx 2Day®", "37.47"),
  rate("STANDARD", "GROUND_HOME_DELIVERY", "FedEx Home Delivery®", "20.71"),
  rate("SECOND_DAY", "GROUND_HOME_DELIVERY", "FedEx Home Delivery®", "20.71")
];

const fedexMethods = ["FDX_GROUND", "FDX_PRIORITY_OVN"];
const isCarrierSpecificMethod = (carrierPartyId: string, shipmentMethodTypeId: string) => carrierPartyId === "FEDEX" && fedexMethods.includes(shipmentMethodTypeId);

describe("dedupeShippingRates", () => {
  it("shows each real service once, cheapest first", () => {
    const result = dedupeShippingRates(demoRates(), { isCarrierSpecificMethod });

    expect(result.map((item) => item.carrierService)).toEqual([
      "FedEx Home Delivery®",
      "FedEx 2Day®",
      "FedEx Standard Overnight®",
      "FedEx Priority Overnight®"
    ]);
  });

  it("sends the method that belongs to the service, not the one the leftover row asked for", () => {
    const result = dedupeShippingRates(demoRates(), { isCarrierSpecificMethod });
    const methodByService = Object.fromEntries(result.map((item) => [item.gatewayRateId, item.shipmentMethodTypeId]));

    expect(methodByService).toEqual({
      GROUND_HOME_DELIVERY: "FDX_GROUND",
      FEDEX_2_DAY: "SECOND_DAY",
      STANDARD_OVERNIGHT: "NEXT_DAY",
      PRIORITY_OVERNIGHT: "FDX_PRIORITY_OVN"
    });
  });

  it("needs no carrier-specific hint to drop the leftover row", () => {
    const result = dedupeShippingRates(demoRates());
    const ground = result.find((item) => item.gatewayRateId === "GROUND_HOME_DELIVERY");

    // Without a carrier-specific hint the first unambiguous row of the response wins, never the repeated SECOND_DAY.
    expect(ground?.shipmentMethodTypeId).toBe("FDX_GROUND");
    expect(result).toHaveLength(4);
  });

  it("prefers the carrier-specific method over a generic one, wherever it sits in the response", () => {
    const reversed = [
      rate("STANDARD", "GROUND_HOME_DELIVERY", "FedEx Home Delivery®", "20.71"),
      rate("FDX_GROUND", "GROUND_HOME_DELIVERY", "FedEx Home Delivery®", "20.71")
    ];

    expect(dedupeShippingRates(reversed, { isCarrierSpecificMethod })[0].shipmentMethodTypeId).toBe("FDX_GROUND");
    expect(dedupeShippingRates(reversed)[0].shipmentMethodTypeId).toBe("STANDARD");
  });

  it("keeps a service whose only row has a repeated method", () => {
    const rates = [
      rate("SECOND_DAY", "FEDEX_2_DAY", "FedEx 2Day®", "37.47"),
      rate("SECOND_DAY", "GROUND_HOME_DELIVERY", "FedEx Home Delivery®", "20.71", { carrierPartyId: "FEDEX" }),
      rate("FDX_GROUND", "GROUND_HOME_DELIVERY", "FedEx Home Delivery®", "20.71")
    ];

    const result = dedupeShippingRates(rates, { isCarrierSpecificMethod });

    expect(result.map((item) => `${item.shipmentMethodTypeId}:${item.gatewayRateId}`)).toEqual(["FDX_GROUND:GROUND_HOME_DELIVERY", "SECOND_DAY:FEDEX_2_DAY"]);
  });

  it("keeps the same service of different carriers apart", () => {
    const rates = [
      rate("STANDARD", "GROUND", "Ground", "10.00", { carrierPartyId: "UPS", actualCarrierCode: "UPS" }),
      rate("STANDARD", "GROUND", "Ground", "12.00", { carrierPartyId: "FEDEX", actualCarrierCode: "FEDEX" })
    ];

    expect(dedupeShippingRates(rates).map((item) => item.carrierPartyId)).toEqual(["UPS", "FEDEX"]);
  });

  it("falls back to the service label when the gateway sends no id", () => {
    const rates = [
      rate("STANDARD", "", "FedEx Home Delivery®", "20.71", { gatewayRateId: undefined }),
      rate("FDX_GROUND", "", "FedEx Home Delivery®", "20.71", { gatewayRateId: undefined })
    ];

    expect(dedupeShippingRates(rates, { isCarrierSpecificMethod })).toHaveLength(1);
  });

  it("drops rows that cannot be bought", () => {
    const rates = [
      rate("FDX_GROUND", "GROUND_HOME_DELIVERY", "FedEx Home Delivery®", "20.71"),
      rate("NEXT_DAY", "STANDARD_OVERNIGHT", "FedEx Standard Overnight®", ""),
      rate("SECOND_DAY", "FEDEX_2_DAY", "FedEx 2Day®", "not a number"),
      rate("", "PRIORITY_OVERNIGHT", "FedEx Priority Overnight®", "56.77"),
      rate("STANDARD", "", "", "9.00", { gatewayRateId: undefined }),
      rate("STANDARD", "GROUND", "Ground", "9.00", { carrierPartyId: "" })
    ];

    expect(dedupeShippingRates(rates).map((item) => item.shipmentMethodTypeId)).toEqual(["FDX_GROUND"]);
  });

  it("accepts numeric amounts and keeps equal prices in the order of the response", () => {
    const rates = [
      rate("NEXT_DAY", "STANDARD_OVERNIGHT", "Overnight", 30 as any),
      rate("SECOND_DAY", "FEDEX_2_DAY", "2Day", "30.00"),
      rate("FDX_GROUND", "GROUND_HOME_DELIVERY", "Ground", "9.5")
    ];

    expect(dedupeShippingRates(rates).map((item) => item.shipmentMethodTypeId)).toEqual(["FDX_GROUND", "NEXT_DAY", "SECOND_DAY"]);
  });

  it("returns nothing for a missing or empty response", () => {
    expect(dedupeShippingRates(undefined)).toEqual([]);
    expect(dedupeShippingRates(null)).toEqual([]);
    expect(dedupeShippingRates([])).toEqual([]);
  });

  it("does not change the rows it is given", () => {
    const rates = demoRates();
    const before = JSON.stringify(rates);

    dedupeShippingRates(rates, { isCarrierSpecificMethod });

    expect(JSON.stringify(rates)).toBe(before);
  });
});

describe("shippingRateKey", () => {
  it("is the same for the rows of one service and different for the methods that can be sent", () => {
    const [ground, , , , standard] = demoRates();

    expect(shippingRateServiceKey(ground)).toBe(shippingRateServiceKey(standard));
    expect(shippingRateKey(ground)).not.toBe(shippingRateKey(standard));
  });
});

describe("shippingRateName", () => {
  it("does not repeat the carrier the service name already starts with", () => {
    expect(shippingRateName(rate("FDX_GROUND", "GROUND_HOME_DELIVERY", "FedEx Home Delivery®", "20.71"), "FedEx")).toBe("FedEx Home Delivery®");
  });

  it("puts the carrier in front of a service name that does not mention it", () => {
    expect(shippingRateName(rate("STANDARD", "GROUND", "Ground", "10"), "UPS")).toBe("UPS - Ground");
  });

  it("falls back to the method description, then the method id", () => {
    expect(shippingRateName(rate("STANDARD", "GROUND", "", "10"), "UPS", "Standard")).toBe("UPS - Standard");
    expect(shippingRateName(rate("STANDARD", "GROUND", "", "10"), "UPS")).toBe("UPS - STANDARD");
  });
});

describe("shipping rates cache", () => {
  const createStorage = () => {
    const data = new Map<string, string>();

    return {
      data,
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); },
      removeItem: (key: string) => { data.delete(key); }
    };
  };

  it("returns what was written until the TTL has passed", () => {
    const storage = createStorage();
    writeShippingRatesCache(storage, "M1", { at: 1000, rates: demoRates() });

    expect(readShippingRatesCache(storage, "M1", 1000 + SHIPPING_RATES_TTL_MS - 1)?.rates).toHaveLength(6);
    expect(readShippingRatesCache(storage, "M1", 1000 + SHIPPING_RATES_TTL_MS)).toBeNull();
  });

  it("keeps shipments apart and can forget one", () => {
    const storage = createStorage();
    writeShippingRatesCache(storage, "M1", { at: 1000, rates: demoRates() });

    expect(readShippingRatesCache(storage, "M2", 1001)).toBeNull();

    removeShippingRatesCache(storage, "M1");
    expect(readShippingRatesCache(storage, "M1", 1001)).toBeNull();
  });

  it("treats unreadable, empty or future entries as a miss", () => {
    const storage = createStorage();

    storage.setItem("fulfillment.shippingRates.M1", "{not json");
    expect(readShippingRatesCache(storage, "M1", 1001)).toBeNull();

    writeShippingRatesCache(storage, "M1", { at: 1000, rates: [] });
    expect(readShippingRatesCache(storage, "M1", 1001)).toBeNull();

    writeShippingRatesCache(storage, "M1", { at: 5000, rates: demoRates() });
    expect(readShippingRatesCache(storage, "M1", 1001)).toBeNull();
  });

  it("never throws when the storage is missing or blocked", () => {
    const blocked = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("full"); },
      removeItem: () => { throw new Error("blocked"); }
    };

    expect(() => writeShippingRatesCache(blocked, "M1", { at: 1000, rates: demoRates() })).not.toThrow();
    expect(() => removeShippingRatesCache(blocked, "M1")).not.toThrow();
    expect(readShippingRatesCache(blocked, "M1", 1001)).toBeNull();
    expect(readShippingRatesCache(undefined, "M1", 1001)).toBeNull();
    expect(() => writeShippingRatesCache(null, "M1", { at: 1000, rates: demoRates() })).not.toThrow();
  });

  it("isFreshCacheEntry rejects a missing or malformed entry", () => {
    expect(isFreshCacheEntry(null)).toBe(false);
    expect(isFreshCacheEntry({ at: 1, rates: "x" as any }, 2)).toBe(false);
    expect(isFreshCacheEntry({ at: 1, rates: demoRates() }, 2)).toBe(true);
  });
});
