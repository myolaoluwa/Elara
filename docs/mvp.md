# Elara MVP acceptance checklist

## Implemented

- Secure sign-up, email OTP verification, new-device OTP challenges, persistent sign-in/sign-out sessions, race-safe workspace creation, roles, and organization-scoped queries.
- Live daily dashboard using calendar events, due and overdue tasks, follow-ups, important email, and notifications.
- Command Center with persisted conversation history, streamed text, workspace grounding, deterministic no-key mode, and audited AI reads.
- Calendar event creation, editing, deletion, time zones, locations, meeting links, and overlap notifications.
- Meeting creation, attendees, agenda, transcript capture, audio upload/transcription, transcript-grounded draft minutes, decisions/action extraction, and explicit approval before task creation.
- Task creation, deadlines, priorities, status changes, source attribution, and audit history.
- Follow-up creation, contact association, deadlines, overdue surfacing, and resolution.
- Gmail OAuth, inbox synchronization, workspace search, summaries, Gmail-backed reply drafts, important-email surfacing, email-to-task creation, direct sending, personalized contact groups, and scheduled delivery.
- Professional transactional templates and complete password-recovery UI for verification, new-device login, password resets, email changes, and future invitations.
- Contact/company records plus persistent projects, confirmed decisions, and commitments.
- Document upload, private download, text extraction for common PDF/Office/text formats, OCR attempts for scanned PDFs, search, and AI context.
- Global search, executive/workspace settings, scheduling preferences, notifications, and visible activity history.

## Human-control guarantees

- Read and analysis operations may run immediately.
- AI-generated meeting minutes and ambiguous or sensitive email replies are labeled as drafts.
- Extracted meeting tasks are only created after explicit approval.
- Email sends and schedules require an explicit authenticated-user instruction. Calendar cancellation, booking, payment, and unrelated high-impact actions are not performed automatically.
- Every important mutation includes organization scope and an audit record.

## Deployment configuration still required

These are environment and infrastructure concerns rather than simulated local product workflows:

1. Private encrypted object storage for uploaded documents; local uploads are not durable on Vercel.
2. A valid Brevo API v3 key and verified sender for email verification and password reset delivery.
3. Google OAuth credentials for live Gmail delegation. Microsoft mail is not implemented yet.
4. Production backups, monitoring, shared/distributed rate limiting, and retention policies.
5. A key for OpenAI, OpenRouter, Gemini, Cerebras, xAI/Grok, or DeepSeek. Audio transcription specifically requires an OpenAI key.
