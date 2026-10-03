import { expect, type Page } from "@playwright/test";

const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000";

export async function loginAsDev(
  page: Page,
  email = "demo@devpulse.local",
): Promise<void> {
  const bypassResponse = await page.goto(
    `${apiURL}/api/auth/dev-bypass?email=${encodeURIComponent(email)}`,
    { waitUntil: "domcontentloaded" },
  );
  expect(bypassResponse?.ok(), "development bypass authentication").toBeTruthy();

  await page.goto("/");
  const continueButton = page.getByRole("button", {
    name: "Continue to Repositories",
  });
  await expect(continueButton).toBeVisible();
  await continueButton.click();
  await expect(
    page.getByRole("button", { name: "Editor", exact: true }).first(),
  ).toBeVisible();
}