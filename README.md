# Registry

A focused Docker Hub image explorer: search repositories, open details, search paginated tags, and copy a pull command. Includes ten curated popular images with real metadata and local project logos. No account or Docker installation is needed.

The original exercise is preserved in [docs/assignment.md](docs/assignment.md).

## Run locally

Prerequisites: **Node.js 24 LTS** (tested with 24.18.0), npm, and internet access to Docker Hub. No secrets, database, or `.env` file are required.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Vite serves the UI; Node serves the API on port 3001. Stop with Ctrl+C.

For a production build served entirely by Node:

```sh
npm run build
npm start
```

Open **http://127.0.0.1:3001**. Direct repository links and refresh work without a Vite server. The server binds to loopback for local use. `PORT` can change the production port; development expects API port 3001.

### Certificate trust on managed networks

If Node reports `UNABLE_TO_VERIFY_LEAF_SIGNATURE` and your organization's CA is already trusted by the OS, use Node's system CA store for that terminal session:

```powershell
# PowerShell; set before npm ci or starting the server
$env:NODE_OPTIONS="--use-system-ca"
```

```sh
# macOS / Linux shell equivalent
export NODE_OPTIONS=--use-system-ca
```

This was required in the development environment. It is not hardcoded into scripts and does not disable TLS validation. If the certificate is not trusted by the OS, fix the trust configuration rather than bypass verification.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run smoke
```

- `npm test`: deterministic domain and server tests using small fixtures and injected fetch mocks.
- `npm run test:e2e`: Chromium tests against the production build, with mocked Docker responses. Starts Node automatically if needed. Tests clipboard contents, navigation, concurrent searches, failure recovery, and mobile layout. Build first.
- `npm run smoke`: **separate live** Docker Hub smoke test; needs internet and is intentionally outside the repeatable test suite.
- `npm run format:check`: formatting verification; `npm run format` applies it.

## Architecture

```text
React pages -> src/api/client.ts -> explicit Express routes
                                  |
                           DockerHub adapter -> Docker Hub
                                  |
                        validated normalized data
```

| Location                                         | Responsibility                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `src/main.tsx`                                   | Browser entry point and providers                                                               |
| `src/app/`                                       | App layout, routes, focus behavior and query defaults                                           |
| `src/styles/global.css`                          | Shared visual design and responsive styles                                                      |
| `src/pages/Explore.tsx`, `src/pages/Details.tsx` | Two pages and their URL state                                                                   |
| `src/components/`                                | One component per file: search, cards, logos, pagination, copying and status UI                 |
| `src/hooks/`                                     | Clipboard feedback and debounced search timing, separate from the UI                            |
| `src/api/client.ts`                              | Same-origin client requests and typed request errors                                            |
| `src/utils/format.ts`                            | Dates, sizes and URL helpers                                                                    |
| `shared/types.ts`                                | Small UI data contracts and pull command generation                                             |
| `server/app.ts`, `server/validation.ts`          | Repository and publisher image routes, bounded input, safe errors and production static serving |
| `server/dockerHub.ts`                            | Docker endpoints, timeout, error handling and limited caching                                   |
| `server/dockerHubSchemas.ts`                     | Runtime validation of Docker Hub responses                                                      |
| `server/publisherImages.ts`                      | Optional publisher avatar lookup and bounded cache                                              |
| `server/dockerHubNormalizers.ts`                 | Conversion of upstream data to shared UI contracts                                              |
| `tests/`, `scripts/smoke.ts`                     | Deterministic tests and separate live check                                                     |

React Router handles deep links and query parameters. TanStack Query supplies keyed server state, cancellation and short-lived client caching, so old searches cannot replace new ones. Zod validates external responses. Express handles routing and local static serving. One package and two TypeScript configurations separate DOM and Node environments.

The client is grouped by responsibility: `app/` composes the application, `pages/` owns URL state and page queries, `components/` contains one UI component per file, `hooks/` isolates stateful behavior such as clipboard feedback and debounced search, `api/` handles HTTP, `utils/` holds pure helpers, and `styles/` holds the shared stylesheet. Imports point directly to each component. The server uses focused files for routes, input validation, upstream requests, response schemas and normalization; additional controller/service folders would add indirection without separating new responsibilities.

## Decisions and limits

- Repository search is explicitly submitted. Tag search runs after a 500 ms typing pause; Enter and Search submit immediately. Automatic tag updates replace the current history entry rather than adding one per pause. Query and page live in the URL; a new query resets pagination. Detail links preserve the explore URL.
- Clear buttons restore input focus; pagination returns focus to the results. Repository search and tag results have pagination above and below their lists. Repository cards remain visible but inactive while another page of the same search loads, with an updating status and disabled pagination. Copy confirmation clears after 2.5 seconds, and a selected read-only field supports manual copying when clipboard access fails.
- Tag results stay visible while a new filter or page loads for the same repository, with an updating status and temporarily disabled copy/pagination controls. The input clear button is the single tag-search reset action.
- Details and tags load independently. Loading, empty, not-found and retry states are visible. Clipboard success appears only after writing; failures leave a selectable command.
- Tag search is server-side across tags, not a filter of the visible page. Repositories use 12 rows per page and tags use 10. No exhaustive prefetch.
- Sizes are reported separately for each platform, including architecture variants and Windows versions. All known platforms are shown per tag, with expandable long lists. There is no platform filter or exhaustive tag fetch. Tag pagination is available above and below the table. Missing sizes are unavailable; sizes are not summed or exact download estimates. Dates are UTC; supplied timestamps are available as tooltips.
- Official images use namespace `library` for API requests and omit it in pull commands. Namespaced repositories retain their namespace.
- Popular means curated, not a live ranking. The fixed showcase has a five-minute server cache and in-flight deduplication. Client queries are fresh for one minute and retained for five minutes after becoming unused. Search/tag results have no server cache. Publisher image lookups have a separate bounded five-minute cache.
- Ten local Devicon logos cover the showcase. Other results load the publisher avatar from Docker Hub independently of repository data, with an accessible initials fallback if unavailable. Publisher lookups share a five-minute cache capped at 200 entries; images load from Gravatar with no referrer. Publisher avatars are identified as such, not as project logos. License and source attribution for local logos are in `public/logos/`.
- Search and the tag-name filter worked live but were not found in the official reference reviewed. Anonymous tag access also relies on observed behavior. See [API evidence](docs/api-investigation.md).
- Timeouts, runtime validation, bounded inputs, fixed upstream origin and a 429 cooldown limit failure impact. No automatic retries or arbitrary-URL proxy.
- No authentication, persistence, favorites, analytics, CVE scoring or deployment. The product focuses on finding an image and copying a command.

See [verification](docs/verification.md) for executed checks and limits, and [submission summary](docs/submission-summary.md) for the rationale. The PDF is in `output/pdf/registry-summary.pdf`.
