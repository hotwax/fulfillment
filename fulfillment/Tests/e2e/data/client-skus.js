const CLIENT_SKUS = {
  "krewe-uat": ["VANITYKIT-02", "10-45M", "42643"],
  "mephisto-uat": ["2007468_yellow_70", "2007757_black_70", "ALP-NMD-BLK-001"],
  "adoc-gt-uat": ["30068702001", "30070275003", "30076454001"],
  "adoc-hn-uat": ["30071060001", "44440419860783", "30073278001"],
  "adoc-ni-uat": ["30073184003", "30072847001", "30076376001"],
  "adoc-cr-uat": ["30071785001", "30078321003", "30078372001"],
  "adoc-pa-uat": ["46805950431487", "30075219001", "46805950431487"],
  "adoc-sv-uat": ["30050179001", "30073156001", "30080323001"],
  "thirdlove-uat": ["10001692702", "10001693104", "10002643712"],
};

export function getClientIdFromProject(projectName) {
  return projectName
    .replace(/^chromium-logout-/, "")
    .replace(/^chromium-/, "")
    .replace(/^setup-logout-/, "")
    .replace(/^setup-/, "");
}

export function getClientSkus(clientId) {
  const skus = CLIENT_SKUS[clientId];
  if (!skus?.length) {
    throw new Error(`No SKU test data configured for client '${clientId}'.`);
  }

  return skus;
}
