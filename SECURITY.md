# Security

Disclosure: open a private security advisory on the repo, or email the maintainer. Do not file
public issues for vulnerabilities.

This is a P0 hackathon MVP. Below is **current evidence**, **remaining risk**, and **verification
gaps** — not a claim of being secure against all vulnerabilities.

## Current evidence (implemented + checked)
- **Input validation** — every external boundary parses through Zod (`src/lib/schemas.ts`):
  submit Server Action, both importers, and repository reads (per-record validation; bad rows
  dropped, not trusted).
- **XSS** — output is React-escaped; no `dangerouslySetInnerHTML`. Verified: a `<script>` search
  query renders inert (raw `<script>` absent from response).
- **External-link safety** — `repo_url`/`demo_url`/`linkedin_url` are Zod `https://`-only
  (blocks `javascript:`/`data:`) and rendered with `rel="noopener noreferrer nofollow"`.
- **Prompt-injection posture** — scraped/sheet/form content is treated as data, not instructions
  (`.claude/rules/common/coding-rules.md`); never concatenated into a prompt (no LLM in P0).
- **Secrets** — only in `.env.local` (gitignored); `GITHUB_TOKEN` read from env in scripts and
  never logged. No secrets in source or `data/*.json`.
- **Proxy is not an auth boundary** — `src/proxy.ts` only rewrites locale (cf. CVE-2025-29927).
- **Security headers** — `next.config.ts` sets nosniff, `X-Frame-Options: DENY`,
  `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy, HSTS, and a baseline CSP.
- **Rate limiting (outbound)** — GitHub discovery backs off on 403/429 honoring
  `Retry-After`/`X-RateLimit-Reset`; the sheet is cached to JSON, not fetched per request.
- **PII** — missing-persons registries are **link-out only**; never scraped or auto-merged.
- **Automated tests** — Vitest (unit + integration) + Playwright e2e cover the critical flows
  (submit, search, votes, public API, navigation), gated in CI (`lint → tsc → test → build`).
- **CI scanning** — Gitleaks scans full history for secrets and Semgrep runs SAST (findings →
  the Security tab) on every push/PR; Dependabot opens weekly npm + GitHub-Actions update PRs.

## Remaining risk
- **No inbound rate limit / auth** — there is no login and no per-IP throttle on the submit
  action (honeypot + Zod length caps only). Acceptable for a local demo; not for a public URL.
- **CSP allows `'unsafe-inline'`** for script/style (Next injects inline bootstrap without a
  nonce). Weakens XSS defense-in-depth; a nonce-based CSP is the P1 fix.
- **Dev write path** — submissions append to `data/projects.seed.json` on the local FS; no
  integrity controls. Fine for `next dev`; a read-only host (Vercel) rejects the write by design.
- **Coverage not exhaustive** — Vitest + Playwright cover the critical flows, but the
  sheet/GitHub importers and some edge paths are still only manually checked.

## Verification gaps (next proof needed)
- Unit tests for the sheet/GitHub importers (the core flows are already covered by Vitest + Playwright).
- Triage the first Semgrep findings in the Security tab; consider a coverage-threshold gate.
- Nonce-based CSP and inbound rate limiting once a shared URL is deployed (P1).
- LLM output validation + `<untrusted_data>` delimiting when P2 adds embeddings/RAG.
