import type { z } from "zod";
import type { Page, Repository, Tag } from "../shared/types.js";
import { ApiError } from "./errors.js";
import { details, pageSchema, searchItem, tag } from "./dockerHubSchemas.js";
import { normalizeSearch, normalizeTag } from "./dockerHubNormalizers.js";

export const popularNames = [
  "nginx",
  "redis",
  "postgres",
  "node",
  "python",
  "mysql",
  "mongo",
  "ubuntu",
  "debian",
  "httpd",
];

export class DockerHub {
  private showcase?: { expires: number; value: Page<Repository> };
  private showcaseRequest?: Promise<Page<Repository>>;
  private cooldownUntil = 0;

  constructor(
    private fetcher: typeof fetch = fetch,
    private timeoutMs = 10_000,
  ) {}

  private async get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    const remaining = Math.ceil((this.cooldownUntil - Date.now()) / 1000);

    if (remaining > 0) {
      throw new ApiError(
        429,
        `Docker Hub is rate limiting requests. Try again in ${remaining} seconds.`,
        remaining,
      );
    }

    try {
      const response = await this.fetcher(`https://hub.docker.com/v2/${path}`, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { Accept: "application/json" },
      });

      if (response.status === 404) {
        throw new ApiError(404, "Repository or page not found on Docker Hub.");
      }

      if (response.status === 429) {
        const delay = retryDelay(response.headers.get("retry-after"));

        this.cooldownUntil = Date.now() + delay * 1000;

        throw new ApiError(
          429,
          `Docker Hub is rate limiting requests. Try again in ${delay} seconds.`,
          delay,
        );
      }

      if (!response.ok) {
        throw new ApiError(
          502,
          "Docker Hub is temporarily unavailable. Please try again.",
        );
      }

      const parsed = schema.safeParse(await response.json());

      if (!parsed.success) {
        throw new ApiError(
          502,
          "Docker Hub returned an unexpected response. Please try again.",
        );
      }

      return parsed.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new ApiError(
          504,
          "Docker Hub took too long to respond. Please try again.",
        );
      }

      throw new ApiError(502, "Could not reach Docker Hub. Please try again.");
    }
  }

  async search(query: string, page: number): Promise<Page<Repository>> {
    const params = new URLSearchParams({
      query,
      page: String(page),
      page_size: "12",
    });

    const data = await this.get(
      `search/repositories/?${params}`,
      pageSchema(searchItem),
    );

    return {
      items: data.results.map(normalizeSearch),
      count: data.count,
      hasNext: Boolean(data.next),
    };
  }

  async repository(namespace: string, name: string): Promise<Repository> {
    const data = await this.get(this.path(namespace, name), details);

    return {
      namespace: data.namespace,
      name: data.name,
      fullName:
        data.namespace === "library"
          ? data.name
          : `${data.namespace}/${data.name}`,
      owner: data.namespace,
      official: data.namespace === "library",
      description: data.description ?? "",
      updatedAt: data.last_updated ?? null,
    };
  }

  async tags(
    namespace: string,
    name: string,
    page: number,
    query: string,
  ): Promise<Page<Tag>> {
    const params = new URLSearchParams({ page: String(page), page_size: "10" });

    if (query) {
      params.set("name", query);
    }

    const data = await this.get(
      `${this.path(namespace, name)}/tags?${params}`,
      pageSchema(tag),
    );

    return {
      items: data.results.map(normalizeTag),
      count: data.count,
      hasNext: Boolean(data.next),
    };
  }

  popular(): Promise<Page<Repository>> {
    if (this.showcase && this.showcase.expires > Date.now()) {
      return Promise.resolve(this.showcase.value);
    }

    if (this.showcaseRequest) {
      return this.showcaseRequest;
    }

    // One bounded cache entry prevents ten upstream requests on every home visit.
    this.showcaseRequest = Promise.all(
      popularNames.map((name) => this.repository("library", name)),
    )
      .then((items) => {
        const value = { items, count: items.length, hasNext: false };
        this.showcase = { value, expires: Date.now() + 300_000 };

        return value;
      })
      .finally(() => {
        this.showcaseRequest = undefined;
      });

    return this.showcaseRequest;
  }

  private path(namespace: string, name: string): string {
    return `namespaces/${encodeURIComponent(namespace)}/repositories/${encodeURIComponent(name)}`;
  }
}

function retryDelay(header: string | null): number {
  const seconds =
    header && /^\d+$/.test(header)
      ? Number(header)
      : header
        ? Math.ceil((Date.parse(header) - Date.now()) / 1000)
        : 60;

  return Number.isFinite(seconds) ? Math.max(1, Math.min(seconds, 3600)) : 60;
}
