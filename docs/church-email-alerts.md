# Church administrator email alerts

## What is prepared

- A new inviter registration creates an alert for every verified `church_admin` account linked to that church.
- The administrator's email comes from their verified sign-in account, joined through their saved profile church assignment. No email addresses need to be added to the publicly readable church directory.
- A daily summary counts **new attendee registrations**, not attendance confirmations, from midnight inclusive to the next midnight exclusive in **Africa/Accra**. It includes a zero count on quiet days.
- The intended delivery time is **00:05 Ghana time**, covering the day that just ended.
- Templates include the existing logo, gold accents, dark navy panel, familiar typography, a plain-text alternative, and a church dashboard link.
- Registrations are queued in the database, rather than relying on the visitor's browser staying open. Existing inviter-to-member notifications are not changed.

## Activation status

Prepared source and SQL only. **Not activated** until database approval, a Resend API key, and a verified sender are supplied. Adding the API key alone does not install the database trigger, database webhook, or daily schedule.

## Server secrets

Enter private values through **Project Settings → Secrets**; never commit an API key to source or put it in a `VITE_` variable.

| Name | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Your own Resend API key, used only by the server. |
| `RESEND_FROM_EMAIL` | Your Resend-verified sender address, optionally `100% Answered Prayer <address>`. Do not use `onboarding@resend.dev` for church administrators. |
| `APP_SITE_URL` | Optional HTTPS public application URL; defaults to `https://cekbu.lovable.app`. |
| `EMAIL_LOGO_URL` | Optional HTTPS image address; defaults to `/images/email-logo.webp` under the application URL. |

The managed backend supplies its own server credentials. They are never provided to visitors or requested from you.

## Database installation

The additive SQL is in `supabase/church_email_alerts.sql`. It creates only one new server-only delivery table, an inviter insert trigger, and protected helpers. Existing registration, church access, and administrator policies are not changed. Apply the file once; it is a migration, not the full consolidated `my_all.sql` schema.

Churches need at least one linked, verified administrator with the protected `church_admin` role to receive alerts. The Super Admin's existing church assignment control remains the fallback. Creating a church record without linking an administrator does not establish an alert recipient.

## Delivery configuration after approval

1. Apply the additive SQL and deploy `church-email-alerts`.
2. Configure a **Database Webhook** for INSERT on `public.church_email_alerts` to invoke the worker. It accepts the native database webhook payload or `{ "action": "drain" }`. Supply server-to-server authorization securely, never from browser code; do not expose the worker publicly.
3. Repair/enable managed scheduling authentication through the platform's scheduling tools before installing HTTP callbacks. Configure one daily callback at **00:05 Africa/Accra** with `{ "action": "daily" }`.
4. Configure a bounded retry/drain workflow: wake on enqueue, drain additional batches while `remaining > 0`, respect `available_at`, and stop when the queue has drained. Do not install a permanent sub-minute polling job. The worker claims up to 25 records per call; large daily batches need follow-up calls.
5. Keep the worker server-only. Its current authorization accepts the backend service credential; if the managed scheduler uses its own credential, wire the generated scheduler verification helper before activating that callback. Do not hand-author HTTP cron SQL or expose service credentials.

The declarative activation settings are in `supabase/church-email-alerts.config.json`. These delivery steps require live setup; they are not automatically performed by this SQL file or JSON configuration.

## Reliability and privacy

- Unique event keys prevent duplicate queue records; the same key is passed to Resend's idempotency header.
- Atomic claims use `FOR UPDATE SKIP LOCKED`, a ten-minute lease, and a claim token, preventing concurrent workers from completing each other's jobs.
- Up to five delivery attempts are allowed. Retryable provider failures use exponential backoff and `Retry-After`; permanent provider failures remain visible as failed records.
- Retries expire after 23 hours, before Resend's 24-hour idempotency retention expires. There is no unlimited automatic retry.
- Before sending, the server rechecks the recipient's church assignment, role, verified email, and current email address. Reassigned or deleted administrators do not receive stale church data.
- Email subjects are single-line; all dynamic HTML values are escaped. No attendee contact details are included in daily summaries.
- Only the service role can read or modify the delivery table and call queue helpers.

## Verification before enabling

1. Create/link a verified Church A administrator and another Church B administrator.
2. Register an inviter under Church A; verify exactly one queued alert per Church A administrator, none for Church B, and confirm receipt through Resend.
3. Register attendees under both churches, including records on both sides of midnight Ghana time; verify each summary contains only its church's completed-day count.
4. Retry the same event and daily callback; confirm no duplicate records or delivered messages.
5. Reassign an administrator while a message is pending; confirm that message is skipped.
6. Verify an anonymous request to the worker returns 401 and anonymous table/RPC access is denied.

Local rule tests: `bunx vitest run src/test/church-alerts.test.ts`.