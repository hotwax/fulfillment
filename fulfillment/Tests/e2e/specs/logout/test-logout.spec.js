import { test } from "@playwright/test";

import LogoutFlowPom from "../../pages/logout/logout-flow.pom.js";

test("test-logout flow", async ({ page }) => {
  const logoutFlow = new LogoutFlowPom(page);
  await logoutFlow.run();
});
