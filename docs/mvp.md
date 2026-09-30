# Elara MVP acceptance checklist

## Implemented

- Secure sign-up, sign-in, sign-out, sessions, workspace creation, roles, and organization-scoped queries.
- Live daily dashboard using calendar events, due and overdue tasks, follow-ups, important email, and notifications.
- Command Center with persisted conversation history, streamed text, workspace grounding, deterministic no-key mode, and audited AI reads.
- Calendar event creation, editing, deletion, time zones, locations, meeting links, and overlap notifications.
- Meeting creation, attendees, agenda, transcript capture, audio upload/transcription, transcript-grounded draft minutes, decisions/action extraction, and explicit approval before task creation.
- Task creation, deadlines, priorities, status changes, source attribution, and audit history.
- Follow-up creation, contact association, deadlines, overdue surfacing, and resolution.
- Email import, workspace search, summaries, reviewable reply drafts, important-email surfacing, and email-to-task creation.
- Contact/company records plus persistent projects, confirmed decisions, and commitments.
- Document upload, private download, text extraction for common PDF/Office/text formats, OCR attempts for scanned PDFs, search, and AI context.
- Global search, executive/workspace settings, scheduling preferences, notifications, and visible activity history.

## Human-control guarantees

- Read and analysis operations may run immediately.
- AI-generated meeting minutes and email replies are labeled as drafts.
- Extracted meeting tasks are only created after explicit approval.
- No email sending, calendar cancellation, booking, payment, or other high-impact external action is performed automatically.
- Every important mutation includes organization scope and an audit record.

## Deployment configuration still required

These are environment and infrastructure concerns rather than simulated local product workflows:

1. PostgreSQL and encrypted object storage for production.
2. Transactional email for verification and password reset.
3. Google/Microsoft OAuth credentials for live email and calendar synchronization.
4. Production secret management, TLS, backups, monitoring, and retention policies.
5. A key for OpenAI, OpenRouter, Gemini, Cerebras, xAI/Grok, or DeepSeek if hosted text generation is desired. Audio transcription specifically requires an OpenAI key.
