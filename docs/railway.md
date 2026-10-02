# Railway production setup

Vercel runs Elara's full-stack Next.js application, including its server route handlers. Railway provides managed PostgreSQL with PgBouncer and runs the short-lived scheduled worker. This avoids duplicating the web application while retaining durable state and reliable scheduled execution.

## Vercel web service variables

Set these as server-only Vercel variables. Do not use a `NEXT_PUBLIC_` prefix for secrets.

- `DATABASE_URL`: the Railway PostgreSQL public TLS proxy URL with `pgbouncer=true` and a conservative connection limit.
- `BETTER_AUTH_URL`: the public HTTPS Vercel production URL.
- `BETTER_AUTH_SECRET`: a unique random value of at least 32 bytes.
- `EMAIL_PROVIDER=brevo`
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, and optionally `BREVO_REPLY_TO_EMAIL`.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from a Google OAuth web client with Gmail API enabled.
- `EMAIL_TOKEN_ENCRYPTION_KEY`: output of `openssl rand -base64 32`. Treat key rotation as a data migration because existing mailbox tokens use it.
- `JOB_SECRET`: a separate output of `openssl rand -base64 32`.
- `AI_PROVIDER` plus the selected provider's model and API key.
- `OPENAI_API_KEY` additionally if audio transcription is enabled with a non-OpenAI text provider.

The Google OAuth client must allow exactly:

```text
https://YOUR_RAILWAY_DOMAIN/api/email/connect/google/callback
```

## Railway scheduled service

The repository-backed Railway service uses this start command:

```bash
npm run email:dispatch
```

Set `APP_URL` to the Vercel production URL, share the same `JOB_SECRET`, and set the cron schedule to `*/5 * * * *`. The process calls the authenticated job endpoint once and exits, as Railway cron services require.

### Browser push reminders

Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and a valid `VAPID_SUBJECT` (`mailto:` or HTTPS URL) on Vercel. The public key is returned only to authenticated app users; never expose the private key to the browser. Configure `JOB_SECRET` and `APP_URL` on the Railway worker as above.

Create a second Railway cron service from the same repository with the start command:

```bash
npm run reminders:dispatch
```

Set its schedule to `* * * * *` (once per minute). It calls `POST /api/jobs/reminder-dispatch`, which claims due alarms in PostgreSQL and sends Web Push to each registered device. Delivery normally occurs within a minute, subject to the browser push service, network, device power, and OS notification settings. The dispatcher retries transient failures up to five times and removes expired subscriptions. Apply the database migration before deploying the app and worker:

```bash
npx prisma migrate deploy
```

Verify the live path from the Alarms page using **Enable notifications**, then **Send test push**. Schedule a near-future alarm and confirm delivery with the browser closed. The browser must support Web Push, permission must remain granted, and iOS/iPadOS requires adding the site to the Home Screen.

## Database deployment

Prisma targets PostgreSQL. Apply committed migrations before a release:

```bash
npx prisma migrate deploy
```

The initial PostgreSQL migration is committed under `prisma/migrations` and has been validated against the Railway database.
