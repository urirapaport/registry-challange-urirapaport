# Verification log

Executed November 9, 2026, on Windows with Node 24.18.0. Commands are in README. Fixtures and live checks are deliberately separate.

| Check             | Evidence                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Types             | `npm run typecheck` passed for client/shared and Node/shared code.                                                                   |
| Lint              | `npm run lint` passed without disabled rules.                                                                                        |
| Unit/integration  | `npm test`: 37 tests passed, including identity, commands, sizes, input, error mapping, cooldown, caching and fixed upstream origin. |
| Build             | `npm run build` passed. Express serves the built client and API.                                                                     |
| Chromium fixtures | `npm run test:e2e`: 17 scenarios passed against production assets with mocked API responses.                                         |
| Live API          | `npm run smoke` passed: ten showcase entries, search/tag pagination, empty results, namespaced details and 404.                      |
| Live browser      | Ten actual showcase entries/logos, nginx search, official details, tags and exact clipboard content inspected. Final checks below.   |

The rapid-search test initially failed with input remounting on URL changes. The input now remains mounted, URL navigation synchronizes its draft, and a focus assertion guards the interaction. The test waits for the first route transition before submitting a second overlapping request.

Browser fixture scenarios cover explicit search; pagination reset; official and namespaced clipboard text; tag search and pagination; denied clipboard without false success; independent tag failure and recovery; not-found state; direct detail links and refresh; return to search context; old responses not replacing new searches; 375-pixel layout without horizontal overflow; keyboard search and skip-link focus; and failed-logo fallback.

Live counts and tag names change. No Docker image was pulled or executed. Firefox, Safari, full screen-reader behavior, high-volume load, and actual upstream 429/timeouts have not been independently exercised; failures use fixtures.

## Dependency audit

Full `npm audit` reported 10 moderate findings in the development lint dependency chain, rooted in minimatch advisory GHSA-g3hv-75wg-m249. The app accepts no arbitrary user glob patterns. This tooling limitation is disclosed rather than suppressed or force-upgraded across major versions. Production-only audit is recorded with final checks.

## Final checks

- Fresh directory: copied only source/configuration/lockfile/assets, ran `npm ci`, `npm run build`, and `npm test` successfully. No existing node_modules or dist was reused.
- Started that fresh production build on port 3002. Home and direct repository URLs returned HTML 200; live popular/search API routes returned JSON 200, with exactly ten showcase entries.
- Live browser: searched nginx; opened official nginx and namespaced nginx/nginx-ingress; searched alpine tags; moved to page 2; refreshed the detail URL; returned to the saved search; copied and read back `docker pull nginx:stable-trixie-perl` and `docker pull nginx/nginx-ingress:5.7.1-alpine`.
- Inspected desktop (1280 pixels) and mobile (375 pixels) layouts with live data. Browser error/warning log was empty during the live flow. Automated navigation also reported no page errors.
- `npm audit --omit=dev`: zero vulnerabilities. Development-only findings above remain.
- Submission PDF: three A4 pages generated with ReportLab; all pages rendered with Poppler and visually inspected for clipping, overflow, missing glyphs and readability.
- Development startup: `npm run dev` started Vite on 5173 and Node on 3001; home, proxied search and proxied tag-search routes all returned 200 with live data.

## UX refinement audit

The follow-up review added one-click clear buttons that restore input focus, pagination that focuses and scrolls to the result heading, route-change focus on main content, touch-friendly controls, explicit new-tab link names, and a 2.5-second copy confirmation. Clipboard rejection now reveals a focused, selected read-only command field for keyboard copying.

| Control or state                                         | Verification                                                                                                   |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Repository/tag search inputs                             | Explicit submission, Enter key, URL sync, overlapping requests, 100-character input and pagination reset       |
| Inline clear buttons                                     | Clear active query, reset page and keep input focus                                                            |
| Text clear actions, suggestions, home and not-found link | Correct navigation and restored list                                                                           |
| Previous/Next                                            | Disabled boundary states, correct data/URL and focus returned to the list heading                              |
| Copy buttons                                             | Exact clipboard text, temporary confirmation and selected manual fallback on failure                           |
| Retry                                                    | Failure recovery; 429 countdown prevents early/automatic retries                                               |
| External links                                           | Correct destination, new-tab attributes and accessible names                                                   |
| Layout                                                   | 320px long-input/tag edge cases; 375px and 1280px page checks; no horizontal overflow                          |
| Accessibility                                            | axe-core WCAG A/AA rule sets on showcase, search and details at 375px and 1280px; no violations in these scans |

Contrast findings in secondary text and table headings were corrected. Long descriptions exposed a minimum-width issue in the single-column card grid; a zero-minimum grid track and wrapping fix it. Buttons and search/manual-copy fields have a minimum 44px height; mobile inputs use 16px text to avoid automatic focus zoom in browsers that apply it.

The final suite contains 37 unit/server tests and 17 browser scenarios. Automated accessibility scans do not prove complete accessibility. Screen-reader evaluation and Firefox/Safari checks remain outside the verification performed. Interactive visual tooling became unavailable partway through the follow-up; the final responsive and contrast checks used the automated Chromium suite.

## Tag search debounce verification

Verified November 10, 2026, after splitting components into individual files. Tag search waits 500 ms after typing, resets pagination, preserves the explore return URL and replaces the current history entry. Enter and Search submit immediately; clear, URL navigation and unmount cancel a pending timer. Two additional Chromium scenarios exercise these behaviors with a controlled clock and confirm that repository search remains explicit. All 15 browser scenarios passed, including responsive and accessibility checks.

## Stable tag results during filtering

Retain previous tag data only within the same repository while a new query loads. Display an updating status instead of the stale count; disable copying and pagination until the new results arrive. Remove the duplicate tag-clear button and keep the input clear action. Slow-response Chromium checks at 375px and 1280px compare table height, table position and footer position during the request, and verify controls recover after the response.

## Platform display and top pagination (November 10)

All 37 unit/server tests and 17 Chromium scenarios passed, along with build, strict type checks and lint. OS/architecture selectors were removed following inconsistent live upstream filtering. Every known platform is retained per tag; expandable lists include ARM variants and Windows versions with individual sizes. Tests verify legacy selector URL parameters cannot hide platforms, both pagination controls stay synchronized through page three and back, boundary buttons disable correctly, search resets pagination, reload preserves page and return context is retained. Mobile/desktop screenshots were inspected and axe scans passed. The prior live smoke and Linux/Windows API checks remain applicable; no backend behavior changed in this UI refinement. No push was performed.

## Submission summary claim audit (November 10)

Reviewed the summary against the final source and existing successful build/lint/typecheck, 37 unit/server tests and 17 browser scenarios. No application code changed during this audit.

| Claim group                                                        | Evidence reviewed                                                                                                                      |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Assignment and future improvements                                 | Original requirements in docs/assignment.md                                                                                            |
| Endpoints, identity, size metadata, caching and cooldown           | server/dockerHub.ts; shared/types.ts; fresh live API calls                                                                             |
| Routes, validation, safe error responses and production deep links | server/app.ts; server/validation.ts; direct browser navigation                                                                         |
| Search, debounce, URL state, focus and dual pagination             | src/pages; src/hooks/useDebouncedSearch.ts; existing Chromium results                                                                  |
| Client cache and refetch settings                                  | src/app/queryClient.ts                                                                                                                 |
| Clipboard confirmation and manual fallback                         | src/hooks/useCopyCommand.ts; src/components/CopyCommand.ts; fixture tests and live clipboard checks                                    |
| Logos, license and attribution                                     | public/logos; src/components/Logo.tsx                                                                                                  |
| API reference and CORS                                             | Official details/tags reference rechecked; live search/details/tags responses had no Access-Control-Allow-Origin with localhost Origin |
| Dependency findings                                                | Fresh npm audit: 10 moderate development findings; npm audit --omit=dev: 0                                                             |

The live smoke passed again. Fresh Chromium checks verified ten showcase cards, repository search, official and namespaced details, and exact clipboard text without page errors. An initial browser script timed out while navigating immediately after search; rerunning with an explicit search transition wait and DOM readiness succeeded. This was not treated as a passed first attempt.

Summary wording now distinguishes upstream data from cached showcase data, validates only consumed response fields, limits retry disabling to the affected view, describes tests as scenario checks rather than proofs, and dates dependency findings. Historical lessons are supported by the earlier verification log; they are not presented as newly reproduced defects. No Docker images were pulled or run; Firefox/Safari and complete screen-reader testing remain outside the verified scope.
