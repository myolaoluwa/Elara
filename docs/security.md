# Security posture

This document records the controls implemented for the MVP and the infrastructure work required before handling sensitive production data.

## Application controls

- Authentication, sessions, password policy, and workspace isolation are enforced on the server with Better Auth and organization-scoped database queries.
- Email verification and password reset delivery are enabled automatically when both `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` are configured. Signup uses a six-digit email OTP; password sign-in from an untrusted device requires a second OTP. Codes expire after five minutes, are stored hashed, and are attempt-limited. Password resets revoke existing sessions.
- Verified devices and database sessions persist for 30 days with daily session refresh. New-device trust is held in a signed cookie and is rotated after successful sign-in.
- State-changing API routes reject cross-origin browser requests, enforce bounded request bodies, validate input, keep viewer memberships read-only, and apply best-effort per-process rate limits.
- Uploaded documents are size-limited, checked against their declared file type, stored outside the public directory, and served as sandboxed downloads with `nosniff` and `no-store` headers.
- AI requests are time-limited and output-limited. Workspace context is minimized and delimited from instructions to reduce prompt-injection risk.
- High-impact actions remain reviewable. Meeting action approval uses an atomic claim so retries cannot create duplicate tasks.
- Browser security headers include a Content Security Policy, clickjacking protection, MIME sniffing protection, a restrictive permissions policy, and HSTS in production.
- Secrets remain server-side and `.env` is excluded from source control.
- Google OAuth uses authorization code flow with PKCE and one-time, expiring state records. Access and refresh tokens are encrypted at rest with AES-256-GCM and never returned to the browser.
- User-authored email is sent only through the authenticated user's tenant-owned mailbox. Group delivery creates a separate message per recipient, strips header injection, validates addresses, removes em dashes, and records delivery state without logging tokens.
- Scheduled delivery atomically claims each message before calling Gmail. A failed or interrupted send is not silently retried, reducing duplicate-delivery risk.

## Production requirements

The application controls do not replace production infrastructure. Before storing real customer data:

1. Keep Railway PostgreSQL, PgBouncer, migrations, backups, and connection limits monitored. Vercel must use the public TLS proxy URL; Railway-internal services should use the private reference URL.
2. Replace `.data/uploads` with private encrypted object storage using short-lived authorized downloads. Local filesystem state is not suitable for horizontally scaled production services.
3. Put rate limiting behind a shared store or edge service. The built-in limiter is intentionally best-effort and is not shared across instances.
4. Configure unique production secrets, Brevo sender verification, Google OAuth consent/credentials, a scheduled email service, TLS, backups, monitoring, alerting, retention/deletion policies, and dependency scanning.
5. Review provider data-processing terms before sending workspace context to an AI provider, and use the minimum data and retention settings appropriate for the organization.

## Verification

Run the following before each release:

```bash
npm audit
npm run lint
npm run typecheck
npm test
npm run build
```

Security is an ongoing process. These controls address the issues found in the MVP review, but they are not a guarantee that future changes are vulnerability-free.
