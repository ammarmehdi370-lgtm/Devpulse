# Email and AI Integration Status

This document summarizes the magic-link email and Anthropic AI integration work: implementation status, request flows, setup requirements, verification results, and remaining blockers.

## Summary

| Integration | Code status | External setup status | Verification status |
|---|---|---|---|
| Magic-link email with Resend | Implemented | Resend credentials and production domain DNS still need configuration | Static diagnostics and diff whitespace check passed; package tests/typechecks could not run |
| Anthropic AI chat | Implemented | Anthropic API key still needs to be configured | Static diagnostics and diff whitespace check passed; package typechecks could not run |

The local `.env` was not read or changed. Do not commit API keys or other secrets.

## Achievements

### Resend magic-link email

- Changed [apps/api/src/lib/email.ts](./apps/api/src/lib/email.ts) to lazily initialize the Resend client. Missing credentials do not crash module import or application startup.
- Added an explicit missing-key error that identifies `RESEND_API_KEY` and points administrators to Resend.
- Ensured development and test environments never send email. Magic-link requests in those environments return the raw verification token and URL for local use.
- Kept the existing HTML and text email bodies, and escaped user-controlled values used in the HTML body.
- Applied the development/test no-send behavior to welcome and new-device emails as well.
- Updated [apps/api/src/routes/auth.ts](./apps/api/src/routes/auth.ts):
  - Development/test response includes `mode: "development"`, token, URL, and a development message.
  - Production success response includes `mode: "production"` and does not return the token.
  - A production request without a configured Resend key returns HTTP 503 with `EMAIL_NOT_CONFIGURED` before rate limiting or token creation.
  - Other send failures return HTTP 503 with `EMAIL_FAILED`; unused tokens are cleaned up.
- Updated [apps/web/app/components/LoginPage.tsx](./apps/web/app/components/LoginPage.tsx) with explicit `idle`, `submitting`, `sent`, `dev-token`, and `error` email login states. The UI differentiates missing configuration from delivery failure and provides the requested success and development screens.
- Updated [apps/api/src/index.test.ts](./apps/api/src/index.test.ts) with coverage for development requests without an API key and production requests without the key.
- Updated [.env.example](./.env.example) to show Resend variables, use `noreply@resend.dev` for initial testing, and document when a verified production sender may be used.

### Anthropic AI integration

- Changed [apps/ai/src/index.ts](./apps/ai/src/index.ts) to lazily create the Anthropic client. The AI service can start without `ANTHROPIC_API_KEY`.
- Added startup logging that warns when the key is missing and confirms when a key is configured.
- Added a detailed `/health` response with `status`, `configured`, timestamp, and the selected model when configured. Missing-key health returns a degraded status and a clear message.
- Added structured missing-key responses for `/v1/chat`:
  - SSE clients receive a `type: "error"` event with code `AI_NOT_CONFIGURED`.
  - Non-streaming clients receive HTTP 503 JSON with error code `AI_NOT_CONFIGURED`.
- Preserved a structured configuration error for invalid-key (401) failures during streaming.
- Updated [apps/api/src/index.ts](./apps/api/src/index.ts) so the authenticated API proxy preserves a missing-key JSON error, relays SSE errors, and does not count failed AI streams as successful usage.
- Updated [apps/web/app/components/EditorWorkbench.tsx](./apps/web/app/components/EditorWorkbench.tsx) to recognize the error code and show an “AI not configured” explanation in the chat. The textarea remains enabled and shows “AI is not configured — contact admin”.
- Updated [.env.example](./.env.example) to document the optional Anthropic key and set the configured model to `claude-sonnet-4-6`.

## Request flows

### Magic-link flow

1. The login page posts the email address to `POST /api/auth/magic-link/send`.
2. The API validates the address.
3. In production, the API checks for `RESEND_API_KEY` first. If it is absent, it returns HTTP 503 `EMAIL_NOT_CONFIGURED`; no token is created and no secret token is returned.
4. Otherwise, the existing per-email rate limit is applied and a random magic-link token is generated. The stored token is keyed by its SHA-256 hash and expires after 15 minutes.
5. In development and test, the API returns the raw token and verification URL. Email is not sent.
6. In production, the API sends the link using Resend. Success returns a confirmation without the token; send failure deletes the unused token and returns an explicit 503 error.
7. The login page shows the matching development link, sent confirmation, or error state. A production recipient opens the emailed verification URL to complete sign-in.

### AI chat flow

1. The editor posts chat input to `POST /v1/ai/chat` with `Accept: text/event-stream`.
2. The API validates/authenticates the request, checks usage and resource permissions, then forwards it to the AI service at `AI_URL` (default `http://localhost:4002`).
3. If `ANTHROPIC_API_KEY` is missing, the AI service returns an `AI_NOT_CONFIGURED` SSE error (or a JSON 503 for a non-streaming request). The missing-key condition does not prevent service startup.
4. The API forwards SSE error events without treating them as completed successful usage.
5. The editor recognizes `AI_NOT_CONFIGURED`, displays configuration instructions, and leaves the chat input enabled for the user.
6. When a valid key is configured, the AI service streams Anthropic response chunks and a final completion event as before.

## Requirements and setup

### Resend

1. Create an account at [resend.com](https://resend.com).
2. Create an API key with sending permission.
3. Configure local development values in `.env` (do not commit this file):

   ```dotenv
   RESEND_API_KEY=re_your_key
   EMAIL_FROM=noreply@resend.dev
   EMAIL_FROM_NAME=Devpulse
   ```

4. For production, verify the sending domain in Resend and add the SPF and DKIM DNS records provided by Resend. Then set `EMAIL_FROM` to an address on that verified domain, for example `noreply@devpulse.io`.
5. Confirm the Resend account permits delivery to the intended recipient. Test-domain restrictions may apply.

### Anthropic

1. Create an API key in the [Anthropic Console](https://console.anthropic.com/settings/keys) and review usage in the Console.
2. Configure the key in local `.env` (do not commit it):

   ```dotenv
   ANTHROPIC_API_KEY=sk-ant-your-key
   ANTHROPIC_MODEL=claude-sonnet-4-6
   ```

3. Confirm the account has access to the configured model and has available credits/usage.
4. Restart the AI service after setting environment variables.

## Verification instructions

### Local magic-link development mode

Start the API with `NODE_ENV=development` and `RESEND_API_KEY` unset or empty:

```powershell
$env:NODE_ENV = 'development'
$env:RESEND_API_KEY = ''
pnpm --filter api dev
```

In another terminal:

```powershell
curl.exe -i -X POST 'http://localhost:4000/api/auth/magic-link/send' `
  -H 'Content-Type: application/json' `
  --data-raw '{"email":"you@example.com"}'
```

Expected: HTTP 200, `mode: "development"`, a raw token, and a verification URL. No email should be sent.

### Production missing-key behavior

Start the API with `NODE_ENV=production` and `RESEND_API_KEY` unset or empty, then send the same request. Expected: HTTP 503 with `EMAIL_NOT_CONFIGURED`, and no token in the response.

### Real Resend delivery

Configure a valid API key and allowed sender, then run the API in production mode:

```powershell
$env:NODE_ENV = 'production'
$env:RESEND_API_KEY = 're_your_key'
$env:EMAIL_FROM = 'noreply@resend.dev'
pnpm --filter api dev
```

Trigger delivery to an address permitted by the Resend account:

```powershell
curl.exe -i -X POST 'http://localhost:4000/api/auth/magic-link/send' `
  -H 'Content-Type: application/json' `
  --data-raw '{"email":"you@example.com"}'
```

Expected: HTTP 200 with `mode: "production"` and a message to check email. The API response must not include a token. Check the recipient inbox and Resend delivery logs. For production use, replace the test sender with an address on a verified domain.

### AI health and chat

Check AI service health:

```bash
curl -i http://localhost:4002/health
```

Without a key, expect HTTP 503 and a response containing `status: "degraded"`, `configured: false`, and `ANTHROPIC_API_KEY not set`. With a configured key, expect `status: "ok"`, `configured: true`, the active model, and a timestamp.

Test streaming chat with a configured key:

```bash
curl -N -X POST http://localhost:4002/v1/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"messages":[{"role":"user","content":"Say hello in one word"}]}'
```

Expected when working: one or more `data: {"type":"chunk","content":"..."}` events followed by a `data: {"type":"done","tokensUsed":...}` event. The exact wording and token count vary; `"Hello"` and `15` are examples, not guaranteed output.

Without a key, the streaming endpoint should emit a `type: "error"` event with code `AI_NOT_CONFIGURED`. To check non-streaming fallback, omit the `Accept: text/event-stream` header; expect HTTP 503 JSON with `error: "AI_NOT_CONFIGURED"`.

### Common Anthropic errors

- **401 Unauthorized:** verify that the API key is correct, active, and loaded by the running process.
- **429 Rate limited:** wait for the indicated retry period and retry with appropriate backoff.
- **529 Overloaded:** Anthropic is temporarily overloaded; retry after a short delay.
- **Credits/billing error:** review usage and billing in the Anthropic Console.

## Blockers and validation limits

- No Resend or Anthropic credentials were created or placed in `.env`. These require account-owner access and must be configured locally or in the deployment secret store.
- The production email domain and its DNS records were not verified. Real production delivery remains untested.
- Real Anthropic API requests were not made; a valid key, account/model access, and available credits are prerequisites.
- TypeScript checks and package tests could not be run in this workspace because package-local TypeScript/Vitest installations were missing. Attempts to restore dependencies failed with `EACCES` while inspecting existing `node_modules` entries.
- Editor/static diagnostics reported no errors for the touched source files, and `git diff --check` passed. These checks do not replace package typechecks, automated tests, or live provider delivery.
