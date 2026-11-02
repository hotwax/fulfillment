// In code because the state keys mirror `store/productStore.ts`. The env only overrides defaults, so an env
// file that lacks a setting (older ones had no PRDT_IDEN_PREF) can't stop it from loading or saving.

interface ProductStoreSettingDefinition {
  stateKey: string;
  value: any;
}

export const PRODUCT_STORE_SETTINGS: Record<string, ProductStoreSettingDefinition> = {
  PRDT_IDEN_PREF: { stateKey: "productIdentifier.productIdentificationPref", value: { primaryId: "SKU", secondaryId: "productId" } },
  FULFILL_FORCE_SCAN: { stateKey: "forceScan", value: "N" },
  BARCODE_IDEN_PREF: { stateKey: "barcodeIdentifier.barcodeIdentifierPref", value: "SKU" },
  FF_DOWNLOAD_PICKLIST: { stateKey: "downloadPicklist", value: "N" },
  EXCLUDE_ODR_BKR_DAYS: { stateKey: "excludeOrderBrokerDays", value: "0" },
  USE_RES_FACILITY_ID: { stateKey: "useReservationFacility", value: "N" },
  FULFILL_PART_ODR_REJ: { stateKey: "partialOrderRejection", value: "N" },
  FF_COLLATERAL_REJ: { stateKey: "collateralRejection", value: "N" },
  AFFECT_QOH_ON_REJ: { stateKey: "affectQoh", value: "N" }
};

// Accepts the structured env form and the older flat one ({ "FULFILL_FORCE_SCAN": false }), where booleans stand for Y/N.
export function resolveProductStoreSettings(rawEnv?: string): Record<string, ProductStoreSettingDefinition> {
  let fromEnv: Record<string, any> = {};
  try {
    fromEnv = JSON.parse(rawEnv || "{}");
  } catch (error) {
    console.error("VITE_DEFAULT_PRODUCT_STORE_SETTINGS is not valid JSON, using built-in defaults", error);
  }

  const settings = { ...PRODUCT_STORE_SETTINGS };
  for(const [settingTypeEnumId, entry] of Object.entries(fromEnv)) {
    if(entry && typeof entry === "object" && typeof entry.stateKey === "string") {
      settings[settingTypeEnumId] = entry;
    } else if(settings[settingTypeEnumId]) {
      settings[settingTypeEnumId] = { ...settings[settingTypeEnumId], value: typeof entry === "boolean" ? (entry ? "Y" : "N") : entry };
    }
  }

  return settings;
}
