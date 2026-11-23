import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => vi.fn());
const isAppEmbeddedMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@common", () => ({
  api: apiMock,
  commonUtil: {
    getErrorMessage: () => "",
    getMaargBaseURL: () => "https://maarg.test/",
    hasError: () => false,
    isAppEmbedded: isAppEmbeddedMock,
    showToast: vi.fn()
  },
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  translate: (key: string) => key,
  useShopify: () => ({ redirect: redirectMock })
}));
vi.mock("@/store/product", () => ({ useProductStore: () => ({}) }));
vi.mock("@/store/productStore", () => ({ useProductStore: () => ({}) }));
vi.mock("@/store/util", () => ({ useUtilStore: () => ({}) }));
vi.mock("@/store/user", () => ({ useUserStore: () => ({}) }));
vi.mock("@/composables/useZebraPrinter", () => ({ useZebraPrinter: () => ({}) }));
vi.mock("@/authorization/actions", () => ({ default: {} }));

const windowOpenMock = vi.fn(() => ({ focus: vi.fn() }));

beforeEach(() => {
  setActivePinia(createPinia());
  apiMock.mockReset();
  apiMock.mockResolvedValue({ status: 200, data: new Blob(["%PDF"]) });
  redirectMock.mockReset();
  windowOpenMock.mockClear();
  vi.stubGlobal("open", windowOpenMock);
  window.URL.createObjectURL = vi.fn(() => "blob:picklist");
});

afterEach(() => vi.unstubAllGlobals());

describe("printTransferOrderPicklist", () => {
  it("opens the picklist through the Shopify app bridge in the embedded app, where a new tab cannot open", async () => {
    isAppEmbeddedMock.mockReturnValue(true);
    const { useTransferOrderStore } = await import("@/store/transferorder");

    await useTransferOrderStore().printTransferOrderPicklist("TO1001");

    expect(apiMock).toHaveBeenCalledWith(expect.objectContaining({ url: "/fop/apps/pdf/PrintTransferOrderPicklist", params: { orderId: "TO1001" } }));
    expect(redirectMock).toHaveBeenCalledWith("blob:picklist");
    expect(windowOpenMock).not.toHaveBeenCalled();
  });

  it("opens the picklist in a new tab outside the embedded app", async () => {
    isAppEmbeddedMock.mockReturnValue(false);
    const { useTransferOrderStore } = await import("@/store/transferorder");

    await useTransferOrderStore().printTransferOrderPicklist("TO1001");

    expect(windowOpenMock).toHaveBeenCalledWith("blob:picklist", "_blank");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
