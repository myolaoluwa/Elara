# Security posture

This document records the controls implemented for the MVP and the infrastructure work required before handling sensitive production data.

## Application controls

- Authentication, sessions, password policy, and workspace isolation are enforced on the server with Better Auth and organization-scoped database queries.
- Email verification and password reset delivery are enabled automatically when both `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` are configured. Password resets revoke existing sessions.
- State-changing API routes reject cross-origin browser requests, enforce bounded request bodies, validate input, keep viewer memberships read-only, and apply best-effort per-process rate limits.
- Uploaded documents are size-limited, checked against their declared file type, stored outside the public directory, and served as sandboxed downloads with `nosniff` and `no-store` headers.
- AI requests are time-limited and output-limited. Workspace context is minimized and delimited from instructions to reduce prompt-injection risk.
- High-impact actions remain reviewable. Meeting action approval uses an atomic claim so retries cannot create duplicate tasks.
- Browser security headers include a Content Security Policy, clickjacking protection, MIME sniffing protection, a restrictive permissions policy, and HSTS in production.
- Secrets remain server-side and `.env` is excluded from source control.

## Production requirements

The application controls do not replace production infrastructure. Before storing real customer data:

1. Replace SQLite with managed PostgreSQL. A SQLite database on a serverless filesystem is not durable or safe for concurrent production use.
2. Replace `.data/uploads` with private encrypted object storage using short-lived authorized downloads. A serverless filesystem is ephemeral and may be read-only.
3. Put rate limiting behind a shared store or edge service. The built-in limiter is intentionally best-effort and is not shared across instances.
4. Configure unique production secrets, Brevo sender verification, TLS, backups, monitoring, alerting, retention/deletion policies, and dependency scanning.
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
