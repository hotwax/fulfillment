import { describe, expect, it } from "vitest";
import { PRODUCT_STORE_SETTINGS, resolveProductStoreSettings } from "@/utils/productStoreSettings";

describe("resolveProductStoreSettings", () => {
  it("keeps every built-in setting when the env has none", () => {
    expect(Object.keys(resolveProductStoreSettings(undefined))).toEqual(Object.keys(PRODUCT_STORE_SETTINGS));
  });

  it("keeps the product identifier setting when an older flat env file leaves it out", () => {
    const legacyEnv = JSON.stringify({ FULFILL_FORCE_SCAN: false, BARCODE_IDEN_PREF: "SKU", FULFILL_PART_ODR_REJ: true });
    const settings = resolveProductStoreSettings(legacyEnv);

    expect(settings.PRDT_IDEN_PREF.stateKey).toBe("productIdentifier.productIdentificationPref");
    // Flat booleans become the Y/N values the store compares against.
    expect(settings.FULFILL_FORCE_SCAN).toEqual({ stateKey: "forceScan", value: "N" });
    expect(settings.FULFILL_PART_ODR_REJ).toEqual({ stateKey: "partialOrderRejection", value: "Y" });
  });

  it("uses structured env entries as given, including settings the app doesn't define", () => {
    const env = JSON.stringify({
      PRDT_IDEN_PREF: { stateKey: "productIdentifier.productIdentificationPref", value: { primaryId: "UPCA", secondaryId: "" } },
      NEW_SETTING: { stateKey: "newSetting", value: "N" }
    });
    const settings = resolveProductStoreSettings(env);

    expect(settings.PRDT_IDEN_PREF.value).toEqual({ primaryId: "UPCA", secondaryId: "" });
    expect(settings.NEW_SETTING).toEqual({ stateKey: "newSetting", value: "N" });
  });

  it("ignores flat entries for settings the app doesn't know, and falls back on invalid JSON", () => {
    expect(resolveProductStoreSettings(JSON.stringify({ DISABLE_SHIPNOW: false })).DISABLE_SHIPNOW).toBeUndefined();
    expect(Object.keys(resolveProductStoreSettings("{not json"))).toEqual(Object.keys(PRODUCT_STORE_SETTINGS));
  });
});
