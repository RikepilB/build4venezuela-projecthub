<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repo hygiene (public / OSS)

This repo is public on GitHub (MIT). Do NOT commit machine-local files: `CLAUDE.local.md`,
`.claude/settings.local.json`, `.mcp.json`, `opencode.json`, `.env*` (except `.env.example`).
New runtime data files default to gitignored unless they are seed data (`data/*.seed.json`,
`data/taxonomy.json`). See `CLAUDE.md` → "Open source / public repo".
