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

describe("updateShipmentPackageDetail", () => {
  // The route segments after a pack failed on the label: it had already moved item 02 to box B.
  const routeSegments = [
    { shipmentId: "S1001", shipmentPackageSeqId: "01", shipmentItemSeqId: "01", packageName: "A" },
    { shipmentId: "S1001", shipmentPackageSeqId: "02", shipmentItemSeqId: "02", packageName: "B" }
  ];
  const shipment = (items: any[]) => ({
    shipmentId: "S1001",
    shipmentPackages: [{ shipmentId: "S1001", shipmentPackageSeqId: "01", packageName: "A" }, { shipmentId: "S1001", shipmentPackageSeqId: "02", packageName: "B" }],
    items
  });
  const boxes = (order: any) => order.items.map((item: any) => [item.shipmentItemSeqId, item.selectedBox, item.currentBox]);

  beforeEach(() => apiMock.mockResolvedValue({ data: { shipmentPackageRouteSegDetails: routeSegments } }));

  it("takes a box change the server saved as the current box, so the next pack does not send it again", async () => {
    const { useOrderStore } = await import("@/store/order");
    const store = useOrderStore();
    store.current = shipment([
      { shipmentItemSeqId: "01", selectedBox: "A", currentBox: "A" },
      { shipmentItemSeqId: "02", selectedBox: "B", currentBox: "A" }
    ]);

    const order = await store.updateShipmentPackageDetail(store.current);

    expect(apiMock).toHaveBeenCalledWith({ url: "/poorti/shipmentPackageRouteSegDetails", method: "GET", params: { shipmentId: "S1001", pageSize: 10 } });
    expect(boxes(order)).toEqual([["01", "A", "A"], ["02", "B", "B"]]);
    expect(boxes(store.current)).toEqual([["01", "A", "A"], ["02", "B", "B"]]);
  });

  it("keeps a box change the server does not have, and moves an unchanged item to the server's box", async () => {
    const { useOrderStore } = await import("@/store/order");
    const store = useOrderStore();
    store.current = shipment([
      { shipmentItemSeqId: "01", selectedBox: "B", currentBox: "A" },
      { shipmentItemSeqId: "02", selectedBox: "A", currentBox: "A" },
      { shipmentItemSeqId: "03", selectedBox: "A", currentBox: "A" }
    ]);

    const order = await store.updateShipmentPackageDetail(store.current);

    expect(boxes(order)).toEqual([["01", "B", "A"], ["02", "B", "B"], ["03", "A", "A"]]);
  });

  it("updates the order passed in when no order of the store matches it, as on the In Progress page", async () => {
    const { useOrderStore } = await import("@/store/order");
    const store = useOrderStore();
    store.current = { shipmentId: "OTHER", items: [] };
    const card = shipment([{ shipmentItemSeqId: "02", selectedBox: "B", currentBox: "A" }]);

    const order = await store.updateShipmentPackageDetail(card);

    expect(order.shipmentId).toBe("S1001");
    expect(boxes(order)).toEqual([["02", "B", "B"]]);
    expect(card.items[0].currentBox).toBe("A");
    expect(store.current.shipmentId).toBe("OTHER");
  });
});
