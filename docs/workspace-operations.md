# Workspace operations

## Storage modes

`/en/workspace` and `/es/workspace` always support browser-local tracking. Creating a
shared copy is optional and never uploads local work automatically. Shared work is
accessible only to authenticated event members, with owner/editor/viewer permissions.

Shared participation uses Supabase anonymous authentication (guest sessions), not
verified email accounts. Session cookies are HttpOnly and Secure in production. A
guest's name and task owner labels are not proof of identity. Owners must save their
private recovery link to recover access after changing devices or clearing cookies.
Keep recovery links out of issue reports, screenshots and chat messages.

## Provisioning

1. Create a dedicated Supabase project within the approved budget. Do not reuse a
   database containing unrelated private application data.
2. Apply `database/workspaces.sql` as the `workspace_v1` migration. It contains private
   tables, default-deny row security, restricted function grants and an authenticated
   public RPC wrapper. Run the database advisors after applying it.
3. Enable anonymous sign-ins in Supabase Auth. Keep provider rate limits enabled.
   Review abuse protection before increasing capacity. No email delivery or external
   invitation service is required: the owner copies a single-use invitation link.
4. Configure server-side `WORKSPACE_SUPABASE_URL` and
   `WORKSPACE_SUPABASE_PUBLISHABLE_KEY` in the hosting environment. Use a publishable
   key, never a service-role key. Neither variable needs a `NEXT_PUBLIC_` prefix.
   Never print or commit environment files. Redeploy after changing configuration.
5. Verify anonymous creation, guest cookie renewal, a second browser accepting an
   editor invitation, viewer write denial, cross-event denial, stale-save conflicts,
   revocation and owner recovery against the deployed database. Local SQL and mocked
   browser tests do not establish that production Auth is configured correctly.

Without both variables, `/api/workspaces` reports `configured: false`; the sharing
action is hidden and every shared mutation returns 503. Private pages and responses
use no-store/noindex; workspace content is never in the public catalog or sitemap.

## Operational limits

- Local: 30 events per browser; 50 projects/event, 200 tasks/project, 30 delivery items.
- Shared: 10 owned events per guest, 30 joined events, 50 participants/event,
  20 active invitations/event and 120 document saves/minute/event.
- The initial free-tier deployment is bounded to 200 events total and 100 creations
  per hour. Documents have a 1.9 MB limit; portable backups have a 2 MB import limit.
- Invitation links expire in 7 days and can be redeemed once. Recovery links remain
  valid until replaced. Replacing a link does not revoke already joined participants;
  remove their access separately in Team access.
- The most recent 200 activity records per event are retained. They contain action,
  actor ID, revision and time, not document contents or invitation secrets.
- Foreground pages check for changes every 10 seconds. A revision mismatch rejects
  the save and leaves the form open. This is shared persistence with periodic refresh,
  not simultaneous character-level editing or an offline synchronization queue.

## Incident and rollback procedure

Check Vercel deployment status and application errors, then Supabase Auth/database
health and advisors. Do not include payloads, cookies or links in logs. A 409 is an
edit conflict; 403 is denied access; 429 is a quota/provider rate limit; 503 indicates
configuration, provider or network failure. Confirm which layer failed before retrying.

If a release breaks the public site, restore the previous known-good Vercel deployment.
Do not drop database tables to roll back application code. Disable shared creation by
removing the new workspace configuration only if needed; existing data must be preserved.
Owners can export a portable backup from the shared workspace while authorized access
is available. Database backup/retention guarantees depend on the selected Supabase plan;
do not claim that the free tier provides a paid backup service.

## Release evidence and boundaries

`tests/integration/shared-workspace-db.test.ts` executes the shipped SQL on PostgreSQL
via PGlite and proves role, event, invite, revocation, recovery and revision behavior.
API tests check origin enforcement, body limits, schema validation, token hashing and
private error responses. Browser fixtures test interface and recovery behavior only.
Real provider verification is a separate release gate before sharing is enabled.

Launch review: no analytics were added. Provider rate limits and application quotas
exist; CAPTCHA has not been configured. There is no reviewed privacy/terms policy for
hosted participant data. The UI provides a factual transfer notice; it does not claim
legal sufficiency. These product/legal decisions remain advisory, not fabricated policy.
