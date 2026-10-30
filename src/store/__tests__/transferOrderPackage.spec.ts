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
  it("puts only the changes to the package of the shipment", async () => {
    const { useTransferOrderStore } = await import("@/store/transferorder");

    await useTransferOrderStore().updateShipmentPackage({ shipmentId: "M104185", shipmentPackageSeqId: "01", shipmentBoxTypeId: "LARGE_BOX", weight: 25, weightUomId: "WT_lb" });

    expect(apiMock).toHaveBeenCalledWith({
      url: "poorti/transferShipments/M104185/packages/01",
      method: "put",
      data: { shipmentBoxTypeId: "LARGE_BOX", weight: 25, weightUomId: "WT_lb" }
    });
  });

  it("does not send the ids in the body", async () => {
    const { useTransferOrderStore } = await import("@/store/transferorder");

    await useTransferOrderStore().updateShipmentPackage({ shipmentId: "S1", shipmentPackageSeqId: "02", weight: 3 });

    expect(apiMock.mock.calls[0][0].data).toEqual({ weight: 3 });
  });
});
