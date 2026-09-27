const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000";

export default async function globalTeardown(): Promise<void> {
  console.log("\nCleaning up E2E test data...");

  try {
    const response = await fetch(`${apiURL}/v1/test/cleanup`, {
      method: "POST",
      headers: {
        "x-test-secret": process.env.TEST_CLEANUP_SECRET ?? "e2e-secret",
      },
    });
    if (response.ok) {
      console.log("Test data cleaned up");
    } else {
      console.warn(`Warning: cleanup returned HTTP ${response.status}`);
    }
  } catch {
    console.warn("Warning: cleanup endpoint is not available");
  }
}
