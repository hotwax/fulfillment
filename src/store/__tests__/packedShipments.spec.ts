import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => vi.fn());

vi.mock("@common", () => ({
  api: apiMock,
  commonUtil: { hasError: () => false, showToast: vi.fn() },
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  translate: (key: string) => key
}));
vi.mock("@/store/product", () => ({ useProductStore: () => ({}) }));
vi.mock("@/store/productStore", () => ({ useProductStore: () => ({ getCurrentFacility: { facilityId: "64" } }) }));
vi.mock("@/store/util", () => ({ useUtilStore: () => ({}) }));
vi.mock("@/store/user", () => ({ useUserStore: () => ({}) }));
vi.mock("@/composables/useZebraPrinter", () => ({ useZebraPrinter: () => ({}) }));
vi.mock("@/authorization/actions", () => ({ default: {} }));

beforeEach(() => {
  apiMock.mockReset();
  setActivePinia(createPinia());
});

describe("findPackedShipments", () => {
  it("asks for the packed transfer shipments of the current facility", async () => {
    apiMock.mockResolvedValue({ data: { shipmentPackages: [] } });
    const { useTransferOrderStore } = await import("@/store/transferorder");

    await useTransferOrderStore().findPackedShipments();

    expect(apiMock).toHaveBeenCalledWith({
      url: "poorti/transferShipments/packages",
      method: "get",
      params: { originFacilityId: "64", shipmentStatusId: "SHIPMENT_PACKED", limit: 250, pageIndex: 0 }
    });
  });

  it("lists each shipment once, oldest packed first, with its package count", async () => {
    apiMock.mockResolvedValue({
      data: {
        shipmentPackages: [
          { orderId: "M2", orderName: "TO2", shipmentId: "S2", shipmentPackageSeqId: "01", shipmentPackageCreatedDate: 300 },
          { orderId: "M1", orderName: "TO1", orderExternalId: "TO83141", shipmentId: "S1", shipmentPackageSeqId: "02", shipmentPackageCreatedDate: 200 },
          { orderId: "M1", orderName: "TO1", orderExternalId: "TO83141", shipmentId: "S1", shipmentPackageSeqId: "01", shipmentPackageCreatedDate: 100 }
        ]
      }
    });
    const { useTransferOrderStore } = await import("@/store/transferorder");
    const store = useTransferOrderStore();

    await store.findPackedShipments();

    expect(store.getPackedShipments).toEqual({
      total: 2,
      list: [
        { shipmentId: "S1", orderId: "M1", orderName: "TO1", orderExternalId: "TO83141", packedDate: 100, packageCount: 2 },
        { shipmentId: "S2", orderId: "M2", orderName: "TO2", orderExternalId: undefined, packedDate: 300, packageCount: 1 }
      ]
    });
  });

  it("shows no packed shipments when the request fails", async () => {
    apiMock.mockRejectedValue(new Error("Network Error"));
    const { useTransferOrderStore } = await import("@/store/transferorder");
    const store = useTransferOrderStore();

    await store.findPackedShipments();

    expect(store.getPackedShipments).toEqual({ list: [], total: 0 });
  });
});

describe("consumeReturnSegment", () => {
  it("hands the segment back once", async () => {
    const { useTransferOrderStore } = await import("@/store/transferorder");
    const store = useTransferOrderStore();

    store.setReturnSegment("packed");

    expect(store.consumeReturnSegment()).toBe("packed");
    expect(store.consumeReturnSegment()).toBe("");
  });
});
