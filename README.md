# Elara

Elara is an AI-assisted operating workspace for executive assistants. The local-first MVP covers the complete information loop across dashboard, grounded AI chat, calendar, meetings, tasks, follow-ups, imported email, contacts, executive memory, documents, search, settings, and audit history.

## Local development

```bash
cp .env.example .env
# Replace BETTER_AUTH_SECRET with the output of: openssl rand -base64 32
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open `http://localhost:3000`. The health endpoint is available at `/api/health`.

Create an account at `/sign-up`. Elara creates a private workspace for the account, then redirects to the dashboard.

Text generation is optional. Without a configured provider, the Command Center answers common operational questions using deterministic workspace queries and meeting extraction uses a conservative text parser.

Set `AI_PROVIDER` to `openai`, `openrouter`, `gemini`, `cerebras`, `xai` (or its `grok` alias), or `deepseek`, then fill only that provider's API key and optional model variable from `.env.example`. Elara uses the selected provider for grounded answers, email preparation, and meeting analysis. Restart the development server after changing `.env`.

Recorded-audio transcription currently uses OpenAI specifically and requires `OPENAI_API_KEY`, regardless of the text provider selection.

## Transactional email

Elara's environment contract is prepared for Brevo's transactional Email API. In `.env`, set `BREVO_API_KEY` to an API v3 key and set `BREVO_SENDER_EMAIL` to a sender address whose email or domain has been verified in Brevo. `BREVO_SENDER_NAME` defaults to `Elara`; `BREVO_REPLY_TO_EMAIL` and the three template ID variables are optional. Keep the API key server-side and configure the same variables in the hosting environment before enabling verification, password-reset, or invitation delivery.

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

## MVP boundaries

- Email and calendar work immediately through manual import/entry. OAuth provider synchronization remains an integration deployment task because it requires provider credentials and redirect configuration.
- Uploaded files use private local storage under `.data/uploads`. Production deployment should replace this adapter with encrypted object storage.
- Audio transcription requires `OPENAI_API_KEY`; pasted transcripts and all other AI text features work with any supported text provider.
- AI never sends email, cancels meetings, or performs other high-impact external actions. Drafts and extracted meeting actions require user review.

See `docs/mvp.md` for the acceptance checklist and deployment gaps.
