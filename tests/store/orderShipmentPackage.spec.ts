import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => vi.fn());

vi.mock("@common", () => ({
  api: apiMock,
  commonUtil: { hasError: () => false, showToast: vi.fn() },
  emitter: { emit: vi.fn() },
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  translate: (key: string) => key,
  useShopify: () => ({}),
  useSolrSearch: () => ({})
}));
vi.mock("@/utils/orderUtil", () => ({ orderUtil: {} }));
vi.mock("@/store/product", () => ({ useProductStore: () => ({}) }));
vi.mock("@/store/productStore", () => ({ useProductStore: () => ({}) }));
vi.mock("@/store/util", () => ({ useUtilStore: () => ({}) }));
vi.mock("@/store/user", () => ({ useUserStore: () => ({}) }));
vi.mock("@/composables/useZebraPrinter", () => ({ useZebraPrinter: () => ({}) }));
vi.mock("@/authorization/actions", () => ({ default: {} }));

beforeEach(() => {
  apiMock.mockReset();
  apiMock.mockResolvedValue({ data: {} });
  setActivePinia(createPinia());
});

describe("updateShipmentPackage", () => {
  it("puts the box type on the package of the shipment", async () => {
    const { useOrderStore } = await import("@/store/order");

    await useOrderStore().updateShipmentPackage({ shipmentId: "S1001", shipmentPackageSeqId: "00002", shipmentBoxTypeId: "LARGE_BOX" });

    expect(apiMock).toHaveBeenCalledWith({
      url: "/poorti/shipments/S1001/shipmentPackages/00002",
      method: "PUT",
      data: { shipmentBoxTypeId: "LARGE_BOX" }
    });
  });
});
