import { expect, test, type Page } from "@playwright/test";
import { startEditor } from "./fixtures/editor";

async function answerWithCode(page: Page, codeBlock: string): Promise<void> {
  await page.route("**/v1/ai/chat", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "http://localhost:3000",
          "access-control-allow-credentials": "true",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "Content-Type, Authorization, Accept",
        },
      });
      return;
    }

    const event = JSON.stringify({ type: "chunk", content: codeBlock });
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "access-control-allow-origin": "http://localhost:3000",
        "access-control-allow-credentials": "true",
      },
      body: `data: ${event}\n\ndata: [DONE]\n\n`,
    });
  });
  const input = page.getByRole("textbox", { name: /Ask Devpulse AI/ });
  await input.fill("Produce a replacement implementation");
  await input.press("Enter");
  await expect(page.getByText(codeBlock.replace(/```[\w+-]*\n?|```/g, "").trim()).first()).toBeVisible();
}

test("apply target options appear without a text selection", async ({ page }) => {
  await startEditor(page);
  await answerWithCode(page, "```typescript\nexport const answer = 43;\n```");

  await expect(page.getByText("Apply code to:")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Replace selection" }).locator("input")).toBeDisabled();
  await expect(page.getByRole("radio", { name: "Insert at cursor" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Replace whole file" })).toBeVisible();
});

test("whole-file apply opens a red and green diff before applying", async ({ page }) => {
  await startEditor(page);
  await answerWithCode(page, "```typescript\nexport const answer = 43;\n```");
  await page.getByRole("radio", { name: "Replace whole file" }).click();
  await page.getByRole("button", { name: "Apply to editor" }).click();

  const preview = page.getByRole("dialog", { name: "Diff preview" });
  await expect(preview.getByText(/- export const answer: number = 42/)).toBeVisible();
  await expect(preview.getByText(/\+ export const answer = 43/)).toBeVisible();
  await expect(preview.getByRole("button", { name: "Apply", exact: true })).toBeVisible();
  await expect(preview.getByRole("button", { name: "Cancel" })).toBeVisible();
});

test("language mismatch prompts before applying Python to TypeScript", async ({ page }) => {
  await startEditor(page);
  await answerWithCode(page, "```python\nprint('hello')\n```");
  await page.getByRole("radio", { name: "Replace whole file" }).click();
  await page.getByRole("button", { name: "Apply to editor" }).click();

  const warning = page.getByRole("alertdialog");
  await expect(warning).toContainText("AI returned Python but your file is TypeScript");
  await expect(warning.getByRole("button", { name: "Apply anyway" })).toBeVisible();
  await expect(warning.getByRole("button", { name: "Cancel" })).toBeVisible();
});

test("applying AI code calls the apply API and reports success", async ({ page }) => {
  await startEditor(page);
  await answerWithCode(page, "```typescript\nexport const answer = 43;\n```");
  await page.getByRole("radio", { name: "Replace whole file" }).click();
  await page.getByRole("button", { name: "Apply to editor" }).click();

  let applyPayload: Record<string, unknown> | undefined;
  await page.route("**/v1/ai/apply", async (route) => {
    applyPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      json: {
        file: { id: "seed-file", version: 2, sizeBytes: 30, updatedAt: new Date().toISOString() },
        revisionId: "revision-2",
        linesReplaced: 1,
        appliedFromAI: true,
      },
    });
  });
  await page.getByRole("button", { name: "Apply", exact: true }).click();

  await expect(page.getByRole("alert")).toContainText("AI code applied and saved");
  await expect.poll(() => applyPayload?.expectedVersion).toBe(1);
  expect(applyPayload?.code).toContain("answer = 43");
  await expect(page.getByRole("tab", { name: /index\.ts/ }).locator('span[class*="bg-[#a78bfa]"]')).toHaveCount(0);
});

test("truncated AI response offers apply-anyway and cancel", async ({ page }) => {
  await startEditor(page);
  await answerWithCode(page, "```typescript\nfunction unfinished() {\n```");
  await page.getByRole("radio", { name: "Replace whole file" }).click();
  await page.getByRole("button", { name: "Apply to editor" }).click();
  await page.route("**/v1/ai/apply", (route) => route.fulfill({
    status: 422,
    json: { error: "TRUNCATED_CONTENT", message: "Truncated response" },
  }));
  await page.getByRole("button", { name: "Apply", exact: true }).click();

  const warning = page.getByRole("dialog", { name: "AI Response May Be Incomplete" });
  await expect(warning).toBeVisible();
  await expect(warning.getByRole("button", { name: "Apply Anyway" })).toBeVisible();
  await expect(warning.getByRole("button", { name: "Cancel" })).toBeVisible();
});