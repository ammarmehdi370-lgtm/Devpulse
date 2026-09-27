const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000";

export default async function globalSetup(): Promise<void> {
  console.log("\nChecking E2E environment...");

  try {
    const response = await fetch(`${apiURL}/health`);
    if (!response.ok) throw new Error("API not healthy");
    console.log("API is healthy");
  } catch {
    throw new Error(
      "API is not running. Playwright should start it after Docker services are ready.",
    );
  }

  try {
    const response = await fetch(`${apiURL}/health/ready`);
    if (!response.ok) throw new Error("Database is not seeded");
    const readiness = (await response.json()) as { environment?: string };
    if (readiness.environment !== "test")
      throw new Error("API is not running in test mode");
    console.log("Database is seeded");
  } catch {
    throw new Error(
      "Database may not be migrated and seeded. Run pnpm setup:e2e.",
    );
  }

  console.log("E2E environment ready.\n");
}
