import { test } from "@playwright/test";

import LogoutFlowPom from "../../pages/logout/logout-flow.pom.js";

test.describe("logout - negative", () => {
  test("should block protected routes after logout", async ({ page }) => {
    const logoutFlow = new LogoutFlowPom(page);

    await logoutFlow.run();

    await logoutFlow.tryToOpenProtectedPage("/open");
    await logoutFlow.assertLoginRedirect();

    await logoutFlow.tryToOpenProtectedPage("/settings");
    await logoutFlow.assertLoginRedirect();
  });
});
