// This hub's own canonical origin (the custom domain). Single source of truth for
// metadataBase, canonical/OG URLs, the sitemap and robots. Apex is canonical; the
// www host redirects to it at the edge (Vercel). https-only, no trailing slash.
export const SITE_URL = "https://elumbralvzla.org";

// Outbound links to the official Build4Venezuela site. The hub is a discovery
// layer; finished/MVP-ready projects get submitted to the official projects page.
export const BUILD4VENEZUELA_PROJECTS_URL = "https://build4venezuela.com/projects";
export const BUILD4VENEZUELA_URL = "https://build4venezuela.com";

// VZLA Response Hub — a citizen-built umbrella emergency hub (find people, damage maps,
// shelters, verified donations, official hotlines). Referenced from the landing + listed
// in /resources and /communities. Link-out only.
export const VZLA_RESPONSE_HUB_URL = "https://www.vzlaresponsehub.org";

// Crafter Station — dev collective behind several relief projects in this hub
// (e.g. mission-ve, github.com/crafter-station/*). Footer credit links here.
export const CRAFTER_STATION_URL = "https://github.com/crafter-station";

// This hub's own source repo — public (MIT). The header GitHub icon + the footer
// "contribute" link point here so visitors can star, fork, and open PRs.
export const PROJECTHUB_REPO_URL = "https://github.com/RikepilB/build4venezuela-projecthub";
