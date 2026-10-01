# ProjectHub hackathon workspace

## Outcome and implementation plan

### Shared release continuation

The release adds optional shared persistence to the existing local workflow.
Guest participation avoids requiring a separate event website or email setup.

1. Keep the local workflow and add an explicit shared-copy action with a data-transfer
   notice. No local work uploads automatically.
2. Use Supabase guest authentication for immediate participation without email or
   advance organizer setup. Guest sessions are held in HttpOnly cookies. Display names
   and task owners are coordination labels, not verified identities.
3. Keep workspaces and membership records private. PostgreSQL authorizes every operation
   by authenticated user ID and event role. Owner, editor and viewer permissions are
   checked in the database, and saves compare an integer revision atomically.
4. Owners create single-use editor/viewer invitations (7 days), revoke invitations or
   participant access, and save/replace a private owner recovery link. Link secrets use
   256 random bits; only SHA-256 hashes are stored. Browser URL fragments are cleared
   before API calls. Recovery is disclosed explicitly because guest access depends on
   this browser unless the owner saves that link.
5. Synchronize through a 10-second foreground refresh and after each successful save.
   Keep open forms on conflicts or network failures. Include member controls, activity,
   JSON backup and mobile verification. Do not describe this as simultaneous text editing.
6. Test the actual SQL in PostgreSQL (PGlite), API request/security boundaries, browser
   owner/editor/viewer journeys, hosted checks and production. Shared controls remain
   hidden until the database and guest authentication are configured and verified.

Paid upgrades, external messages and publication of private workspace contents are
outside this release. Production smoke data will be synthetic and clearly labelled.

El Umbral remains the Build4Venezuela discovery and coordination site. ProjectHub is
the reusable workspace underneath it: a participant or organizer can start tracking
an event without an event website, account, fixed deadline, or advance planning.

1. Replace body/UI monospace with Geist Sans. Keep Fraunces for the existing wordmark
   and editorial hero; retain a small mono face for identifiers and numbers.
2. Add an event-independent workspace domain, validated portable document format,
   and browser persistence adapter. Separate events, projects, tasks, and deliverables.
3. Build bilingual quick setup, event/project switching, task ownership, deadlines,
   blockers, computed progress, and a submission checklist. Connect the public board.
4. Verify domain behavior, persistence failures, imports, desktop/mobile flows,
   typography and the existing board. Run lint, types, unit tests and production build.

## Design intent

- Audience: solo participants, volunteer coordinators, and small hackathon teams.
- Job: decide the next useful action, see who owns it and what prevents delivery.
- Primary action: start a workspace; inside a project, add or update a task.
- Promise: an immediately usable plan for any hackathon, including unplanned events.
  No claims of organizer endorsement, live collaboration, or emergency verification.
- Direction: the existing dusk/amber El Umbral identity, with readable sans typography
  and a compact work surface. Fraunces remains the editorial signature. No new logo.
- Composition: event switcher → event objective/deadline → project list → task board
  and delivery checklist. Empty states explain the next action; numbers derive from
  saved tasks, never seeded activity or invented participants.
- Responsive: project navigation stacks above work on phones. Task columns become a
  vertical list of sections; status selects work by keyboard and touch without dragging.
- Accessibility: visible labels, focus outlines, status text, native controls,
  non-color status signals, explicit save errors and no required animation.

## Scope and honest storage contract

The default mode is a **local workspace**, saved in this browser on this origin.
It supports multiple hackathons and projects, JSON backup/import and a read-only
catalog-to-workspace starting point. It does not edit the public catalog or publish
team progress. Owners are coordination labels, not authenticated assignments.
Export/import is a point-in-time handoff, not synchronization. Clearing browser data
removes local work; the interface explains this and exposes backup controls.

The quick-start modes are optional planning aids, not official hackathon requirements.
Crisis mode prompts verification of sources, useful scope and a maintainer handoff;
the tracker does not collect incident reports or act as an emergency-response system.

## Architecture and migration path

`src/lib/workspace/` owns Zod schemas, pure progress/template operations and the
storage adapter. Components receive localized copy and call this domain. No workspace
schema imports Venezuela taxonomy, public project status, memberships, Redis or dates.
`src/lib/hackathons/` holds the current public event configuration; the public countdown
receives its deadline explicitly. Existing public catalog/API behavior stays intact.

The relationship is `workspace (event) → projects → tasks + delivery checklist`.
Workspace and child IDs are stable, generated UUIDs. Deadlines are optional ISO dates
with explicit offsets. Format version 1 validates bounded strings, collections, URLs,
dates and identifier uniqueness before any imported content is saved or rendered.
Imports create a separate copy; they never overwrite existing work. Storage failures
leave the last saved state intact. Compare-before-write detects stale local edits.

The optional shared implementation described above adds guest sessions, private event
memberships, atomic revisions, invitation/recovery links and a bounded activity log.
See [workspace operations](workspace-operations.md) for setup and production gates.
Further service development can add:

- Verified email accounts and optional upgrades from existing guest memberships.
- Optional public event discovery and richer organizer controls.
- Realtime updates or offline synchronization beyond the current periodic refresh.
- Event-specific branding, rules, submission URLs and dates as configuration; routes
  such as `/events/[eventSlug]`. El Umbral becomes one configured event surface.
- Live provider validation of the implemented quotas, isolation, concurrent edits,
  session renewal and recovery before activating hosted sharing.

Do not reuse the current unauthenticated public submit/join actions as an authorization
model for private workspaces. Local work does not modify the public catalog. Sharing is an explicit participant action.

## Verification record

Verified locally on 2026-09-29:

- `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed.
- `npm test`: 176 tests passed across 23 files, including 15 workspace domain tests.
- Production Playwright run: 28 tests passed across desktop Chromium and Pixel 5:
  `node node_modules/@playwright/test/cli.js test tests/e2e/workspace.spec.ts tests/e2e/board.spec.ts tests/e2e/home.spec.ts tests/e2e/mobile-nav.spec.ts --workers=2 --retries=0`.
- Covered event/project creation, tasks and owners, deadlines and blockers, reload
  persistence, export/import, checklist editing, stale-tab conflicts, storage quota
  failures, Spanish crisis setup, catalog starters, and existing board/navigation.
- Rendered anti-slop review passed for the local workspace: retained the dusk/amber
  identity, confirmed Geist body text, compacted the active event header, reserved
  emphasis for the primary task action, and verified the amber progress indicator.
  At 390px, document width equals viewport width. The final workspace browser log
  contained no errors or warnings. This is local visual evidence, not a production audit.
- Rendered screenshots are kept in the private release evidence, outside the public repository.

The release continuation upgrades Next.js to 16.3.7 and resolves the runtime-only
repository override file tracing warning. The latest production build has no tracing
warning. `npm audit` reports no known vulnerabilities. The expanded suite passes
214 unit/integration tests, including actual SQL authorization, nested document
validation and API boundaries. Licensed font files are bundled locally so both builds
and page rendering are independent of Google Fonts availability.
Shared browser fixtures verify UI behavior; live provider verification is still a
separate activation gate. The 38 desktop/mobile scenarios have passed across the final
suite and focused startup rerun; hosted CI repeats the full suite before merge.

## Launch review

- Local rendered review: pass. Geist body text, Fraunces display, amber action/progress
  hierarchy, touch-size controls and readable stacked mobile columns are retained.
- Functional evidence: lint, types, build and 214 unit/integration tests pass. The
  shared SQL tests prove permissions directly against PostgreSQL. Browser fixtures
  are not described as a live database smoke test.
- Mechanical audit: workspace routes declare noindex; existing public canonical,
  sitemap and navigation behavior stays intact. JSON recovery/export and clear storage
  labels are present. Public-domain HTTPS and primary-action checks run after deploy.
- Advisory readiness: no analytics added; application/provider quotas are documented.
  CAPTCHA and a reviewed policy for hosted participant data are not configured. The
  factual transfer notice is not a legal policy. Operations/rollback guidance is in
  [workspace operations](workspace-operations.md).


## Social preview refresh

The share card introduces El Umbral's ProjectHub tracker to hackathon participants
and organizers, while retaining Build4Venezuela as this site's event context.
It uses the existing dusk/amber palette and wordmark, a clear headline, and an
explicitly labeled example board showing tasks moving toward delivery. It contains
no participant data, metrics, or claims that hosted sharing is active.

Spanish and English use separate 1200 by 630 cards, generated with the bundled
Next.js image font. The image URL includes a release identifier so crawlers receive
a new asset identity. Every page that replaces the layout's Open Graph object must
include the common image metadata; the crawler regression checks both languages,
all public page templates, and the image's actual PNG dimensions.

Rendered review: pass for both localized cards at 1200 by 630. The wordmark and
headline lead, the example board explains the tracker, and labels stay within their
panels. Keep the established palette and product illustration. Functional crawler
and deployed-image verification are separate release checks.

Local validation passes: lint, TypeScript, 217 unit/integration tests, production
build, and crawler checks on 24 localized routes with both PNG responses. The old
unversioned image URL redirects to the current card for cached metadata references.
The image file relies on the locale layout's static params; declaring another
`generateStaticParams` after `generateImageMetadata` triggers an inconsistent route
lookup in Next.js 16.3.7. Independent code review found no remaining issues.


## Quick-start iteration: design and implementation plan

Audience: participants and small teams arriving with an idea and little planning.
The public `/[locale]/start` entry introduces a generic ProjectHub workflow under the
existing El Umbral identity. Its primary action creates one event, one project,
three editable unfinished tasks and the mode-specific checklist in one atomic save.
The optional event name, duration and owner avoid requiring organizer setup.

Keep the approved imagery/fonts and dusk/amber palette. Use a compact editorial
introduction, a dominant usable form, and a small explanation of storage/handoff.
The page feeds the existing tracker; it does not maintain a second project store.
Project context is one optional bounded text field for audience, constraints,
decisions, sources and continuation instructions. Old v1 backups remain readable.
A reviewed Markdown brief and a project-only JSON backup provide explicit snapshot
handoffs. Neither creates a public hosted project link or synchronized editing.

Implement in order: optional context and SQL parity; pure quick-start/handoff
operations; one-step UI using existing conflict-safe persistence; selected-project
URL continuity; homepage/nav entry points; locale/filter/focus/vote feedback fixes.
Validate old backups, UTF-16 limits, SQL validation, same-tab save failures, fresh
and returning users, selected project reload, clipboard denial, backup import,
English/Spanish desktop/mobile use, and the existing social metadata. Hosted team
sharing remains separately gated by provider confirmation and live validation.


### Quick-start launch review

Rendered review: pass on a 1265px desktop canvas and a 390px mobile viewport.
The introduction explains the audience and action; the dominant form uses the
existing type/palette, optional setup folds away, and mobile controls stack without
horizontal overflow. The tracker keeps context beside progress and exposes a
reviewable handoff separately from tasks. No social artwork changes are included.

Mechanical audit: `/en/start` and `/es/start` have localized canonical/hreflang,
description and the approved versioned social card; both enter the public sitemap.
The tracker remains noindex. The primary flow saves locally, preserves old events,
and navigates to a specific selected project. Missing device-local bookmarks offer
explicit recovery; failed storage saves preserve input. Download and clipboard
fallbacks are available. Public HTTPS and deployed route checks follow deployment.

| Advisory item | Status | Evidence / decision |
| --- | --- | --- |
| Analytics | Not added | No new measurement or participant-data transfer in this flow. |
| Bot protection | Not applicable to local setup | New setup writes only browser storage; public catalog controls retain existing server checks. |
| Privacy | Local storage notice present | Copies are explicit snapshots; hosted participant-data policy remains an activation decision. |
| Operations | Present | See workspace-operations.md for logs, incidents and Vercel rollback. |

Hosted sharing activation and its policy/provider decisions remain outside this
local quick-start release. No vendor, legal policy or analytics was added.

Review identified and fixed duplicate submits during delayed navigation, explicit
missing-selection fallback, and handoff preview label pollution. Verification
results are recorded below. Browser Back now follows the live router URL while
preserving in-progress forms.

Local release gates: lint, TypeScript, production build and 239 unit/integration
tests pass. All 37 desktop browser cases pass, including quick-start creation,
relative deadlines, context edits, portable import with fresh IDs, clipboard/storage
failure recovery, delayed navigation, missing bookmarks, browser Back and existing
catalog/shared-viewer regressions. Windows browser process/recording stalls required
native log capture and a local video-off configuration; assertions and CI settings
remain unchanged. Hosted CI repeats both desktop and mobile before merge.
