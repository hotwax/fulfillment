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
      hasError: false,
      list: [
        { shipmentId: "S1", orderId: "M1", orderName: "TO1", orderExternalId: "TO83141", packedDate: 100, packageCount: 2 },
        { shipmentId: "S2", orderId: "M2", orderName: "TO2", orderExternalId: undefined, packedDate: 300, packageCount: 1 }
      ]
    });
  });

  it("fetches every page until a short page comes back", async () => {
    const pageOf = (count: number, prefix: string) => Array.from({ length: count }, (_, i) => ({
      orderId: `M${prefix}${i}`, orderName: `TO${prefix}${i}`, shipmentId: `S${prefix}${i}`, shipmentPackageSeqId: "01", shipmentPackageCreatedDate: i
    }))
    apiMock
      .mockResolvedValueOnce({ data: { shipmentPackages: pageOf(250, "a") } })
      .mockResolvedValueOnce({ data: { shipmentPackages: pageOf(10, "b") } })
    const { useTransferOrderStore } = await import("@/store/transferorder");
    const store = useTransferOrderStore();

    await store.findPackedShipments();

    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(apiMock.mock.calls.map(([request]) => request.params.pageIndex)).toEqual([0, 1]);
    expect(store.getPackedShipments.total).toBe(260);
  });

  it("stops when the endpoint returns the same page again", async () => {
    const page = Array.from({ length: 250 }, (_, i) => ({ orderId: `M${i}`, shipmentId: `S${i}`, shipmentPackageSeqId: "01", shipmentPackageCreatedDate: i }))
    apiMock.mockResolvedValue({ data: { shipmentPackages: page } });
    const { useTransferOrderStore } = await import("@/store/transferorder");

    await useTransferOrderStore().findPackedShipments();

    expect(apiMock).toHaveBeenCalledTimes(2);
  });

  it("flags the failure and keeps the shipments already shown when the request fails", async () => {
    apiMock.mockResolvedValueOnce({ data: { shipmentPackages: [{ orderId: "M1", shipmentId: "S1", shipmentPackageSeqId: "01", shipmentPackageCreatedDate: 100 }] } });
    const { useTransferOrderStore } = await import("@/store/transferorder");
    const store = useTransferOrderStore();
    await store.findPackedShipments();

    apiMock.mockRejectedValue(new Error("Network Error"));
    await store.findPackedShipments();

    expect(store.getPackedShipments.hasError).toBe(true);
    expect(store.getPackedShipments.list.map((shipment: any) => shipment.shipmentId)).toEqual(["S1"]);
  });

  it("clears the failure flag after a successful fetch", async () => {
    const { useTransferOrderStore } = await import("@/store/transferorder");
    const store = useTransferOrderStore();
    apiMock.mockRejectedValueOnce(new Error("Network Error"));
    await store.findPackedShipments();
    expect(store.getPackedShipments.hasError).toBe(true);

    apiMock.mockResolvedValue({ data: { shipmentPackages: [] } });
    await store.findPackedShipments();

    expect(store.getPackedShipments).toEqual({ list: [], total: 0, hasError: false });
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
