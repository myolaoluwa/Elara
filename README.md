# Elara

Elara is an AI-assisted operating workspace for executive assistants. The local-first MVP covers the complete information loop across dashboard, grounded AI chat, calendar, meetings, tasks, follow-ups, imported email, contacts, executive memory, documents, search, settings, and audit history.

## Local development

```bash
cp .env.example .env
# Replace BETTER_AUTH_SECRET with the output of: openssl rand -base64 32
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000`. The health endpoint is available at `/api/health`.

Create an account at `/sign-up`. Elara creates a private workspace for the account, then redirects to the dashboard.

Text generation is optional. Without a configured provider, the Command Center answers common operational questions using deterministic workspace queries and meeting extraction uses a conservative text parser.

Set `AI_PROVIDER` to `openai`, `openrouter`, `gemini`, `cerebras`, `xai` (or its `grok` alias), or `deepseek`, then fill only that provider's API key and optional model variable from `.env.example`. Elara uses the selected provider for grounded answers, email preparation, and meeting analysis. Restart the development server after changing `.env`.

Recorded-audio transcription currently uses OpenAI specifically and requires `OPENAI_API_KEY`, regardless of the text provider selection.

## Transactional email

Elara's environment contract is prepared for Brevo's transactional Email API. In `.env`, set `BREVO_API_KEY` to an API v3 key and set `BREVO_SENDER_EMAIL` to a sender address whose email or domain has been verified in Brevo. `BREVO_SENDER_NAME` defaults to `Elara`, and `BREVO_REPLY_TO_EMAIL` is optional. The template ID variables are reserved for future custom templates and are not currently consumed. Keep the API key server-side and configure the same variables in the hosting environment.

When Brevo is configured, new accounts must verify a six-digit email OTP and password sign-in on an untrusted device requires a second six-digit OTP. OTPs expire after five minutes, are stored hashed, and are attempt-limited. A successfully verified device is trusted for 30 days, and its database-backed session refreshes for the same period. Without Brevo credentials, local development retains password-only authentication so the app is not locked during setup.

All authentication messages use responsive Elara-branded HTML with a plain-text alternative. Purpose-specific templates cover account verification, new-device sign-in, password recovery, email changes, and workspace invitations; they contain no remote tracking images or scripts.

## User mailbox and scheduled email

Gmail is connected through delegated OAuth. Enable the Gmail API, create a Google OAuth web client, and configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a 32-byte base64 `EMAIL_TOKEN_ENCRYPTION_KEY`. Add this exact redirect URI in Google Cloud:

```text
https://YOUR_APP_DOMAIN/api/email/connect/google/callback
```

The authenticated EA can sync inbox messages, create provider drafts, send immediately, or schedule personalized messages to a contact or contact group. Every group member receives a private copy addressed by name. The From display name and signature use the authenticated EA's account name. Em dashes are removed before delivery. Brevo is never used for user-authored mail.

Scheduled mail is processed by `POST /api/jobs/email-dispatch`, protected by `JOB_SECRET`. The Railway service runs `npm run email:dispatch` on `*/5 * * * *`, calls the Vercel production URL, and exits. The same job refreshes connected Gmail inboxes.

The internal assistant contract is documented in `src/lib/ai/AGENT.md`. Explicit send or schedule instructions may execute. Ambiguous, incomplete, or sensitive communications remain drafts for human review, and all outcomes are tenant-scoped and audited.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Architecture decisions

- Next.js App Router provides one typed full-stack application while the product is young.
- Prisma defines the relational model and enforces workspace ownership on operational records.
- AI operations must pass through `src/lib/ai`; provider SDK calls do not belong in UI components.
- High-impact actions are modeled with approval state and audit records before integrations are added.
- Empty product states never imply data or AI analysis that does not exist.
- Authentication is handled server-side with Better Auth. Operational APIs derive workspace scope from the validated session rather than accepting an organization ID from the browser.
- Every account receives one deterministic personal workspace membership. All operational reads and writes use the organization from that server-validated membership.

## MVP boundaries

- Gmail OAuth, inbox synchronization, drafts, personalized groups, direct sends, and scheduled sends are implemented. Deployment still requires Google OAuth credentials and the scheduled Railway service.
- Uploaded files use private local storage under `.data/uploads`. Production deployment should replace this adapter with encrypted object storage.
- Prisma targets PostgreSQL in every environment. Production uses Railway PostgreSQL with PgBouncer; local development requires a PostgreSQL connection string as well.
- Audio transcription requires `OPENAI_API_KEY`; pasted transcripts and all other AI text features work with any supported text provider.
- AI sends or schedules email only when the authenticated user explicitly instructs it and the action passes policy checks. Ambiguous or sensitive messages remain drafts. Calendar cancellation and other high-impact actions remain unavailable.

See `docs/mvp.md` for the acceptance checklist and deployment gaps.
See `docs/security.md` for implemented safeguards and production security requirements.
