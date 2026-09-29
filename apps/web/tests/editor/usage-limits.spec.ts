import { expect, test } from "@playwright/test";
import { startEditor } from "./fixtures/editor";

async function openWithUsage(
  page: Parameters<typeof startEditor>[0],
  used: number,
  limit: number,
  status = 200,
): Promise<void> {
  await startEditor(page, undefined, async () => {
    await page.route("**/v1/ai/usage", (route) =>
      route.fulfill({ status, json: { used, limit, plan: "free" } }),
    );
  });
}

test("usage meter shows the returned request count and percentage", async ({ page }) => {
  await openWithUsage(page, 47, 100);
  await expect(page.getByText("47 / 100 requests this month")).toBeVisible();
  await expect(page.locator('div[style="width: 47%;"]')).toBeVisible();
});

test("usage meter warns in amber at 80 percent or higher", async ({ page }) => {
  await openWithUsage(page, 82, 100);
  await expect(page.getByText("Running low on AI requests")).toBeVisible();
  await expect(page.locator("div.bg-amber-400")).toBeVisible();
});

test("AI input is disabled at the monthly usage limit", async ({ page }) => {
  await openWithUsage(page, 100, 100);
  const input = page.getByRole("textbox", { name: /Ask Devpulse AI/ });
  await expect(input).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByText("Monthly limit reached")).toBeVisible();
  await expect(page.getByRole("button", { name: /Upgrade to Pro/ })).toBeVisible();
  await expect(input).toBeDisabled();
  await expect(input).toHaveValue("");
});

test("shows re-auth prompt when usage returns 401", async ({ page }) => {
  await startEditor(page, undefined, async () => {
    await page.route("**/v1/ai/usage", (route) =>
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  await page.keyboard.press("Control+i");

  await expect(page.getByText("Session expired")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in again →" })).toBeVisible();

  const textarea = page.getByPlaceholder("Sign in again to use Devpulse AI");
  await expect(textarea).toBeVisible();
  await expect(textarea).toHaveAttribute("aria-disabled", "true");
});