import { z } from "zod";

const profileSchema = z.object({ gravatar_url: z.string().nullish() });

export class PublisherImages {
  private cache = new Map<
    string,
    { expires: number; result: Promise<string | null> }
  >();

  constructor(private fetcher: typeof fetch = fetch) {}

  get(namespace: string): Promise<string | null> {
    const cached = this.cache.get(namespace);

    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }

    this.cache.delete(namespace);

    if (this.cache.size >= 200) {
      this.cache.delete(this.cache.keys().next().value!);
    }

    const result = this.load(namespace).then((url) => {
      const entry = this.cache.get(namespace);
      if (!url && entry?.result === result) {
        entry.expires = Date.now() + 30_000;
      }
      return url;
    });
    this.cache.set(namespace, { expires: Date.now() + 300_000, result });

    return result;
  }

  private async load(namespace: string): Promise<string | null> {
    try {
      const response = await this.fetcher(
        `https://hub.docker.com/v2/users/${encodeURIComponent(namespace)}/`,
        {
          signal: AbortSignal.timeout(10_000),
          headers: { Accept: "application/json" },
        },
      );

      if (!response.ok) return null;

      const profile = profileSchema.safeParse(await response.json());
      if (!profile.success || !profile.data.gravatar_url) return null;

      const url = new URL(profile.data.gravatar_url);
      if (
        url.protocol !== "https:" ||
        !["gravatar.com", "www.gravatar.com", "secure.gravatar.com"].includes(
          url.hostname,
        ) ||
        url.port ||
        url.username ||
        url.password ||
        !/^\/avatar\/[a-f0-9]+$/i.test(url.pathname)
      )
        return null;

      url.search = new URLSearchParams({
        s: "80",
        r: "g",
        d: "404",
      }).toString();
      url.hash = "";
      return url.toString();
    } catch {
      return null;
    }
  }
}
