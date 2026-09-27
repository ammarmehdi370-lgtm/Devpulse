import { expect, type Page } from "@playwright/test";

const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000";

export async function loginAsDev(page: Page): Promise<void> {
  const magicLink = await page.request.post(`${apiURL}/v1/auth/magic-link`, {
    data: { email: "demo@devpulse.local" },
  });
  expect(magicLink.ok()).toBeTruthy();
  const { verificationToken } = (await magicLink.json()) as {
    verificationToken?: string;
  };
  expect(verificationToken, "development magic-link token").toBeTruthy();

  const verified = await page.request.post(
    `${apiURL}/v1/auth/magic-link/verify`,
    { data: { token: verificationToken } },
  );
  expect(verified.ok()).toBeTruthy();

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