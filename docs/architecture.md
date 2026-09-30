# Elara architecture

## Current slice

The local-first MVP through product phases 1–9 is implemented. It provides an authenticated, organization-scoped workflow from capture through understanding, organization, memory, action, and follow-up. Production provider synchronization remains adapter configuration rather than being simulated with fake connections.

## Boundaries

- `src/app`: routes and server endpoints.
- `src/components`: reusable product UI.
- `src/lib/ai`: the only entry point for model providers and later tool orchestration.
- `src/lib/tasks`: validated task inputs and organization-scoped task operations.
- `src/lib/operations`: shared validation and audited writes for operational modules.
- `src/lib/documents`: private storage and content extraction adapters.
- `src/lib/meetings`: transcript-grounded analysis.
- `src/lib/auth.ts`: the server-only authentication configuration.
- `src/lib/workspace.ts`: the session-to-workspace boundary used by pages and APIs.
- `src/lib`: domain configuration and, next, application services.
- `prisma/schema.prisma`: source of truth for persistent relationships.

Every workspace-owned query must include `organizationId`. API handlers obtain that identifier from the validated server session, never from a client claim. Task mutations and their audit entries share a database transaction.

## Human control

AI capabilities use three permission levels:

1. `read`: search, analyze, summarize, and classify.
2. `suggest`: draft or propose a change without applying it.
3. `execute`: mutate records or external systems; important actions require explicit approval unless a user-defined rule permits them.

`AIAction` stores permission and approval state. `ActivityLog` is the append-only operational record.

## Post-MVP priorities

1. Keep PostgreSQL migrations production-safe and replace local document files with encrypted object storage.
2. Add Google and Microsoft provider adapters with least-privilege OAuth scopes.
3. Add transactional email verification, password reset, invitations, and richer membership administration.
4. Add background jobs for synchronization, document extraction, briefings, and reminders.
5. Add browser recording and realtime transcription after the bounded audio-upload workflow is operationally proven.
