# Docker Hub API investigation

Investigated November 9, 2026. These are observations, not promises of future API stability. No other candidates' implementations were used.

## Sources and discovery

Started with the original [assignment](https://github.com/echo-ha/registry-challange), its Docker Hub search reference, candidate endpoint examples supplied for investigation, and the [official API reference](https://docs.docker.com/reference/api/hub/latest/). Inspected relevant response fields with small unauthenticated Node fetch requests.

| Operation          | Endpoint relative to `https://hub.docker.com`                | Evidence                                                                                                                           |
| ------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Search             | `/v2/search/repositories/?query=nginx&page_size=2&page=1`    | HTTP 200, results and next-page URL. Page 2 differed. Not found in the official reference reviewed.                                |
| Details            | `/v2/namespaces/library/repositories/nginx`                  | HTTP 200, name, namespace, description and last_updated. Documented route.                                                         |
| Namespaced details | `/v2/namespaces/nginx/repositories/nginx-ingress`            | HTTP 200; namespace `nginx`.                                                                                                       |
| Tags               | `/v2/namespaces/library/repositories/nginx/tags?page_size=2` | HTTP 200, count, next and tags. Route and pagination are documented.                                                               |
| Tag search         | Same tags route with `name=alpine`                           | Sampled names contained `alpine`; count decreased from 1,381 to 795; page 2 differed. Filter not listed in the reference reviewed. |
| Empty search       | Search with `query=zznoimage93829173`                        | HTTP 200, count 0, empty results.                                                                                                  |
| Empty tag search   | Tags with `name=zznoimage93829173`                           | HTTP 200, count 0, empty results.                                                                                                  |
| Missing repository | `/v2/namespaces/library/repositories/zznoimage93829173`      | HTTP 404.                                                                                                                          |

Counts and tag names are snapshots, never hardcoded in the app. `npm run smoke` rechecks boundaries without assuming exact counts or a stable default tag order.

The [details documentation](https://docs.docker.com/reference/api/hub/latest/operations/GetRepository/) explicitly describes anonymous public access. The [tags documentation](https://docs.docker.com/reference/api/hub/latest/operations/ListRepositoryTags/) shows bearer authentication, but public tag requests succeeded anonymously. The app relies on observed access. Search and the tag-name filter are integration risks isolated in `server/dockerHub.ts`.

## Normalization

- Official result: `repo_name="nginx"`, `repo_owner=""`, `is_official=true`. Normalize namespace and owner to `library`, display name to `nginx`.
- Nonofficial result: `repo_name="nginx/nginx-ingress"`, empty owner. Derive namespace from the qualified name. A supplied owner is used only for unqualified nonofficial names. Ambiguous identity becomes a controlled integration error, never an invented `library` repository.
- Official pull: `docker pull nginx:<tag>`. Namespaced pull: `docker pull nginx/nginx-ingress:<tag>`. No invented default tag; `latest` is not described as stable.
- Search samples did not expose logos; sampled details did not expose `avatar_url` or `logo_url`. This does not establish that every Docker API lacks logos.

## Size semantics

For sampled `stable-trixie-perl`, `full_size` was 75,777,314 bytes. `images` contained several platform sizes and architecture/OS `unknown` entries; linux/amd64 was also 75,777,314 bytes. One equality does not establish universal `full_size` semantics.

Policy: use only `images[].size` for `os=linux, architecture=amd64`, in binary units. Label the platform. Do not sum platforms, use unknown entries, or substitute `full_size`. Missing is `Unavailable`; genuine zero remains `0 B`. This is reported image size, not a transfer prediction with cached layers.

## Showcase and logos

Ten curated projects: nginx, Redis, PostgreSQL, Node.js, Python, MySQL, MongoDB, Ubuntu, Debian and Apache httpd. No live top-ten claim or unverified sorting parameter. Descriptions and timestamps are real API metadata. A single five-minute server cache entry and in-flight deduplication prevent repeated ten-request fan-out. Failure shows retry rather than fabricated cards.

Ten logos are vendored from [Devicon](https://github.com/devicons/devicon) at the commit recorded in `public/logos/SOURCE.txt`. MIT license: `public/logos/LICENSE.txt`; trademarks remain with owners. Local assets avoid decorative API fan-out. Other results and failed loads have an accessible initials fallback explicitly announcing a missing logo. Arbitrary search results do not all have real brand logos; this is a limitation.

## Network and resilience

Requests with `Origin: http://localhost:5173` had no `Access-Control-Allow-Origin`. Browser requests go through Node; production serves client and API on the same origin.

Node's default CA store could not verify the local TLS chain. Node 24's `--use-system-ca` succeeded. This is an optional environment setting, not application code; verification stays enabled.

The adapter has a ten-second timeout, Zod checks, safe errors and no automatic retries. A 429 sets a process-wide cooldown using `Retry-After` (60 seconds if absent; at most one hour). Pagination converts `next` to a boolean and never follows upstream-supplied URLs. Fixed page sizes: 12 repositories, 10 tags. Page numbers: 1 to 9,999.
