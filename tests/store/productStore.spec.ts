import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => vi.fn());

vi.mock("@common", () => ({
  api: apiMock,
  commonUtil: { hasError: () => false, showToast: vi.fn() },
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  translate: (key: string) => key,
  useEmbeddedAppStore: () => ({}),
  useSolrSearch: () => ({})
}));
vi.mock("@/store/user", () => ({ useUserStore: () => ({ current: { userId: "hotwax.user" } }) }));
vi.mock("@/authorization/actions", () => ({ default: {} }));

const respondWith = (facilityStores: any[]) => apiMock.mockImplementation(({ url }: any) => {
  if(url.startsWith("oms/facilities/")) {return Promise.resolve({ data: facilityStores });}
  if(url === "oms/productStores") {return Promise.resolve({ data: facilityStores.map((store) => ({ ...store, storeName: `${store.productStoreId} name` })) });}

  return Promise.resolve({ data: [] });
});

beforeEach(() => {
  apiMock.mockReset();
  setActivePinia(createPinia());
});

describe("fetchProductStores", () => {
  it("selects the facility's first product store", async () => {
    respondWith([{ productStoreId: "STORE_A" }]);
    const { useProductStore } = await import("@/store/productStore");
    const store = useProductStore();

    await store.fetchProductStores("BROOKLYN");

    expect(store.getCurrentProductStore.productStoreId).toBe("STORE_A");
  });

  it("clears the previous facility's product store when the new facility has none", async () => {
    const { useProductStore } = await import("@/store/productStore");
    const store = useProductStore();
    store.currentProductStore = { productStoreId: "STORE_A" };
    respondWith([{ productStoreId: "STORE_B", thruDate: 1700000000000 }]);

    await store.fetchProductStores("WAREHOUSE");

    expect(store.getCurrentProductStore).toEqual({});
    expect(store.getProductStores).toEqual([]);
  });
});

describe("findProductStoreShipmentMethCount", () => {
  it("counts nothing, without a request, when there is no product store", async () => {
    const { useProductStore } = await import("@/store/productStore");
    const store = useProductStore();
    store.productStoreShipmentMethCount = 4;

    await store.findProductStoreShipmentMethCount("");

    expect(store.getProductStoreShipmentMethCount).toBe(0);
    expect(apiMock).not.toHaveBeenCalled();
  });
});
