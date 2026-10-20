import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => vi.fn());

vi.mock("@common", () => ({
  api: apiMock,
  commonUtil: { hasError: () => false, showToast: vi.fn() },
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  translate: (key: string) => key
}));
vi.mock("@/store/productStore", () => ({ useProductStore: () => ({}) }));

type Request = { url: string; params: Record<string, any> };
const requests: Request[] = [];
let handlers: Record<string, (params: Record<string, any>) => Promise<any>> = {};

const rate = (carrierServiceCode: string, amount = "10.00") => ({ carrierPartyId: "FEDEX", carrierService: carrierServiceCode, shipmentMethodTypeId: carrierServiceCode, gatewayRateId: carrierServiceCode, shippingEstimateAmount: amount });
const options = (...codes: string[]) => ({ data: { isStreamable: true, rateOptions: codes.map((code) => ({ carrierPartyId: "FEDEX", carrierServiceCode: code, shipmentMethodTypeIds: [code] })) } });
const notFound = () => Promise.reject({ response: { status: 404 } });

// The store keeps module-level state (the rate cache, whether the backend streams), so each test loads a fresh copy.
async function freshStore() {
  vi.resetModules();
  const { useCarrierStore } = await import("@/store/carrier");
  setActivePinia(createPinia());

  return useCarrierStore();
}

beforeEach(() => {
  requests.length = 0;
  handlers = {};
  window.sessionStorage.clear();
  apiMock.mockReset();
  apiMock.mockImplementation(({ url, params }: Request) => {
    requests.push({ url, params });
    const handler = handlers[url];

    return handler ? handler(params) : Promise.reject(new Error(`unexpected request to ${url}`));
  });
});

describe("streamShippingRates", () => {
  it("asks for every service on its own and collects the rates as they come", async () => {
    handlers["poorti/shippingRateOptions"] = () => Promise.resolve(options("GROUND_HOME_DELIVERY", "FEDEX_2_DAY"));
    handlers["poorti/shippingRate/"] = (params) => Promise.resolve({ data: { shippingRates: [rate(params.carrierServiceCode)] } });
    const store = await freshStore();

    const stream = await store.streamShippingRates("S1");

    expect(stream.mode).toBe("stream");
    expect(stream.status).toBe("done");
    expect(stream.rows.map((row) => row.status)).toEqual(["done", "done"]);
    expect(stream.rates.map((r: any) => r.gatewayRateId).sort()).toEqual(["FEDEX_2_DAY", "GROUND_HOME_DELIVERY"]);
    const rateRequests = requests.filter((request) => request.url === "poorti/shippingRate/");
    expect(rateRequests.map((request) => request.params)).toEqual([
      { shipmentId: "S1", carrierPartyId: "FEDEX", carrierServiceCode: "GROUND_HOME_DELIVERY" },
      { shipmentId: "S1", carrierPartyId: "FEDEX", carrierServiceCode: "FEDEX_2_DAY" }
    ]);
  });

  it("shows a rate while the other services are still pending", async () => {
    let releaseSlow: () => void = () => undefined;
    handlers["poorti/shippingRateOptions"] = () => Promise.resolve(options("FAST", "SLOW"));
    handlers["poorti/shippingRate/"] = (params) => params.carrierServiceCode === "FAST"
      ? Promise.resolve({ data: { shippingRates: [rate("FAST")] } })
      : new Promise((resolve) => { releaseSlow = () => resolve({ data: { shippingRates: [rate("SLOW")] } }); });
    const store = await freshStore();

    const running = store.streamShippingRates("S1");
    await vi.waitFor(() => expect(store.rateStreams.S1.rows.map((row) => row.status)).toEqual(["done", "pending"]));

    expect(store.rateStreams.S1.status).toBe("loading");
    expect(store.rateStreams.S1.rates).toHaveLength(1);

    releaseSlow();
    await running;
    expect(store.rateStreams.S1.status).toBe("done");
    expect(store.rateStreams.S1.rates).toHaveLength(2);
  });

  it("keeps the other rates when a service fails, and does not cache the incomplete list", async () => {
    handlers["poorti/shippingRateOptions"] = () => Promise.resolve(options("OK", "BAD"));
    handlers["poorti/shippingRate/"] = (params) => params.carrierServiceCode === "BAD" ? Promise.reject(new Error("carrier timed out")) : Promise.resolve({ data: { shippingRates: [rate("OK")] } });
    const store = await freshStore();

    const stream = await store.streamShippingRates("S1");

    expect(stream.rows.map((row) => row.status)).toEqual(["done", "failed"]);
    expect(stream.rates).toHaveLength(1);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("serves a complete list from the cache the next time, without asking again", async () => {
    handlers["poorti/shippingRateOptions"] = () => Promise.resolve(options("A"));
    handlers["poorti/shippingRate/"] = () => Promise.resolve({ data: { shippingRates: [rate("A")] } });
    const store = await freshStore();
    await store.streamShippingRates("S1");
    delete store.rateStreams.S1;
    const before = requests.length;

    const again = await store.streamShippingRates("S1");

    expect(again.mode).toBe("cached");
    expect(again.rates).toHaveLength(1);
    expect(requests.length).toBe(before);
  });

  it("shares a lookup that is already running, so the prefetch and the page ask once", async () => {
    handlers["poorti/shippingRateOptions"] = () => Promise.resolve(options("A", "B"));
    handlers["poorti/shippingRate/"] = (params) => Promise.resolve({ data: { shippingRates: [rate(params.carrierServiceCode)] } });
    const store = await freshStore();

    await Promise.all([store.prefetchShippingRates("S1"), store.streamShippingRates("S1")]);

    expect(requests.filter((request) => request.url === "poorti/shippingRateOptions")).toHaveLength(1);
    expect(requests.filter((request) => request.url === "poorti/shippingRate/")).toHaveLength(2);
  });

  it("asks for every rate in one request when the backend has no per-service endpoint, and stops probing", async () => {
    handlers["poorti/shippingRateOptions"] = notFound;
    handlers["poorti/shippingRate/"] = () => Promise.resolve({ data: { shippingRates: [rate("A"), rate("B")] } });
    const store = await freshStore();

    const first = await store.streamShippingRates("S1");
    const second = await store.streamShippingRates("S2");

    expect(first.mode).toBe("single");
    expect(first.rates).toHaveLength(2);
    expect(second.mode).toBe("single");
    expect(requests.filter((request) => request.url === "poorti/shippingRateOptions")).toHaveLength(1);
    // One request for all rates, with no carrier or service filter.
    expect(requests.filter((request) => request.url === "poorti/shippingRate/").map((request) => request.params)).toEqual([{ shipmentId: "S1" }, { shipmentId: "S2" }]);
  });

  it("asks for every rate in one request when the backend says it cannot rate one service at a time", async () => {
    handlers["poorti/shippingRateOptions"] = () => Promise.resolve({ data: { isStreamable: false, rateOptions: [] } });
    handlers["poorti/shippingRate/"] = () => Promise.resolve({ data: { shippingRates: [rate("A")] } });
    const store = await freshStore();

    const stream = await store.streamShippingRates("S1");

    expect(stream.mode).toBe("single");
    expect(stream.rates).toHaveLength(1);
  });

  it("probes again after an error that is not a 404", async () => {
    let calls = 0;
    handlers["poorti/shippingRateOptions"] = () => ++calls === 1 ? Promise.reject({ response: { status: 500 } }) : Promise.resolve(options("A"));
    handlers["poorti/shippingRate/"] = (params) => Promise.resolve({ data: { shippingRates: [rate(params.carrierServiceCode || "ALL")] } });
    const store = await freshStore();

    const first = await store.streamShippingRates("S1");
    const second = await store.streamShippingRates("S2");

    expect(first.mode).toBe("single");
    expect(second.mode).toBe("stream");
  });

  it("lets a refresh replace the lookup and ignores the older one's late answers", async () => {
    let releaseOld: () => void = () => undefined;
    let round = 0;
    handlers["poorti/shippingRateOptions"] = () => Promise.resolve(options("A"));
    handlers["poorti/shippingRate/"] = () => ++round === 1
      ? new Promise((resolve) => { releaseOld = () => resolve({ data: { shippingRates: [rate("A", "99.00")] } }); })
      : Promise.resolve({ data: { shippingRates: [rate("A", "10.00")] } });
    const store = await freshStore();

    const older = store.streamShippingRates("S1");
    await vi.waitFor(() => expect(round).toBe(1));
    await store.streamShippingRates("S1", { forceRefresh: true });
    releaseOld();
    await older;

    expect(store.rateStreams.S1.rates.map((r: any) => r.shippingEstimateAmount)).toEqual(["10.00"]);
    expect(store.rateStreams.S1.status).toBe("done");
  });

  it("forgets the lookup and its cache when asked to clear it", async () => {
    handlers["poorti/shippingRateOptions"] = () => Promise.resolve(options("A"));
    handlers["poorti/shippingRate/"] = () => Promise.resolve({ data: { shippingRates: [rate("A")] } });
    const store = await freshStore();
    await store.streamShippingRates("S1");

    store.clearShippingRatesCache("S1");

    expect(store.rateStreams.S1).toBeUndefined();
    expect(window.sessionStorage.length).toBe(0);
  });
});
