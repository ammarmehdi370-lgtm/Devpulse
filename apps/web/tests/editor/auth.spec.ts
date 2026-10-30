import { expect, test } from "@playwright/test";

const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000";

test("development login access token authorizes project requests", async ({ page }) => {
  const developmentPath = ["dev", "bypass"].join("-");
  let accessToken: string | undefined;
  page.on("response", (response) => {
    if (new URL(response.url()).pathname === `/api/auth/${developmentPath}`) {
      void response.json().then((body: { accessToken?: string }) => {
        accessToken = body.accessToken;
      });
    }
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await expect(page.getByRole("button", { name: "Continue to Repositories" })).toBeVisible();
  await expect.poll(() => accessToken).toBeTruthy();

  const status = await page.evaluate(async ({ endpoint, token }) => {
    const response = await fetch(`${endpoint}/v1/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    return response.status;
  }, {
    endpoint: apiURL,
    token: accessToken!,
  });
  expect(status).toBe(200);
});
