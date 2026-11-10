import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { DockerHub } from "../server/dockerHub";
import { createApp } from "../server/app";

const json = (body: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers });
afterEach(() => vi.restoreAllMocks());

describe("server and Docker Hub boundary", () => {
  it("encodes a query and uses a fixed page size", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      json({
        count: 1,
        next: null,
        results: [{ repo_name: "nginx", is_official: true }],
      }),
    );
    const response = await request(createApp(new DockerHub(fetcher))).get(
      "/api/search?q=a%26b&page=2&page_size=9999",
    );
    expect(response.status).toBe(200);
    expect(response.body.items[0].namespace).toBe("library");
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://hub.docker.com/v2/search/repositories/?query=a%26b&page=2&page_size=12",
    );
  });
  it.each([
    "/api/search?q=x&page=-1",
    "/api/search?q=x&q=y",
    "/api/search",
    "/api/repositories/bad%3F/name",
    "/api/search?q=" + "x".repeat(101),
  ])("rejects invalid input before upstream access: %s", async (url) => {
    const fetcher = vi.fn<typeof fetch>();
    expect(
      (await request(createApp(new DockerHub(fetcher))).get(url)).status,
    ).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    [404, 404],
    [500, 502],
    [403, 502],
  ])("maps upstream %i to safe %i", async (upstream, expected) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ secret: "hidden" }, upstream));
    const response = await request(createApp(new DockerHub(fetcher))).get(
      "/api/repositories/library/nginx",
    );
    expect(response.status).toBe(expected);
    expect(response.text).not.toContain("hidden");
    expect(response.text).not.toContain("stack");
  });
  it("handles invalid JSON, schemas, network errors and timeout without leaking details", async () => {
    for (const failure of [
      () => Promise.resolve(new Response("invalid")),
      () => Promise.resolve(json({ wrong: true })),
      () => Promise.reject(new Error("private TLS detail")),
      () => Promise.reject(new DOMException("timed out", "TimeoutError")),
    ]) {
      const response = await request(
        createApp(new DockerHub(vi.fn(failure))),
      ).get("/api/search?q=x");
      expect([502, 504]).toContain(response.status);
      expect(response.text).not.toContain("private");
    }
  });
  it("waits for Retry-After and does not amplify upstream throttling", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({}, 429, { "Retry-After": "120" }));
    const app = createApp(new DockerHub(fetcher));
    const first = await request(app).get("/api/search?q=x");
    expect(first.status).toBe(429);
    expect(first.headers["retry-after"]).toBe("120");
    expect((await request(app).get("/api/search?q=y")).status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("deduplicates simultaneous showcase loads and caches only successful results", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) =>
      json({
        namespace: "library",
        name: String(url).split("/").at(-1),
        description: "real fixture",
      }),
    );
    const hub = new DockerHub(fetcher);
    const [first, second] = await Promise.all([hub.popular(), hub.popular()]);
    expect(first.items).toHaveLength(10);
    expect(second).toEqual(first);
    await hub.popular();
    expect(fetcher).toHaveBeenCalledTimes(10);
  });
  it("does not cache a failed showcase request", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({}, 503));
    const hub = new DockerHub(fetcher);
    await expect(hub.popular()).rejects.toThrow();
    fetcher.mockImplementation(async (url) =>
      json({ namespace: "library", name: String(url).split("/").at(-1) }),
    );
    expect((await hub.popular()).items).toHaveLength(10);
    expect(fetcher).toHaveBeenCalledTimes(20);
  });
  it("never follows an arbitrary upstream pagination URL", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        json({ count: 5, next: "https://evil.test", results: [] }),
      );
    const hub = new DockerHub(fetcher);
    expect((await hub.tags("library", "nginx", 2, "alpine")).hasNext).toBe(
      true,
    );
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://hub.docker.com/v2/namespaces/library/repositories/nginx/tags?page=2&page_size=10&name=alpine",
    );
  });
  it("returns JSON for unknown API routes", async () => {
    expect((await request(createApp()).get("/api/unknown")).status).toBe(404);
  });
});

it("returns per-platform sizes through the API without a hardcoded architecture", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    json({
      count: 1,
      next: null,
      results: [
        {
          name: "mixed",
          full_size: 99999,
          images: [
            { os: "linux", architecture: "arm64", variant: "v8", size: 120 },
            {
              os: "windows",
              architecture: "amd64",
              os_version: "10.0.20348",
              size: 300,
            },
            { os: "unknown", architecture: "unknown", size: 20 },
          ],
        },
      ],
    }),
  );
  const response = await request(createApp(new DockerHub(fetcher))).get(
    "/api/repositories/library/example/tags",
  );
  expect(response.status).toBe(200);
  expect(response.body.items[0].platforms).toHaveLength(2);
  expect(response.body.items[0].platforms[1]).toMatchObject({
    os: "windows",
    size: 300,
    osVersion: "10.0.20348",
  });
  expect(response.body.items[0]).not.toHaveProperty("size");
});
