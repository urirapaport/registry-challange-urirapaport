import { afterEach, expect, it, vi } from "vitest";
import request from "supertest";
import { PublisherImages } from "../server/publisherImages";
import { createApp } from "../server/app";

const profile = (url: string | null) =>
  new Response(JSON.stringify({ gravatar_url: url }));
afterEach(() => vi.useRealTimers());

it("shares publisher fetches, caches results and refreshes after expiry", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () =>
      profile("https://www.gravatar.com/avatar/abc123?d=mm"),
    );
  const images = new PublisherImages(fetcher);
  const [first, second] = await Promise.all([
    images.get("fluent"),
    images.get("fluent"),
  ]);
  expect(first).toBe("https://www.gravatar.com/avatar/abc123?s=80&r=g&d=404");
  expect(second).toBe(first);
  await images.get("fluent");
  expect(fetcher).toHaveBeenCalledTimes(1);
  vi.setSystemTime(Date.now() + 300_001);
  await images.get("fluent");
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("treats missing, unsafe, malformed and failed images as optional", async () => {
  for (const response of [
    profile(null),
    profile("https://evil.example/avatar/abc"),
    profile("http://gravatar.com/avatar/abc"),
    profile("https://www.gravatar.com.evil.example/avatar/abc"),
    new Response("bad JSON"),
    new Response("", { status: 429 }),
  ]) {
    const images = new PublisherImages(
      vi.fn<typeof fetch>().mockResolvedValue(response),
    );
    expect(await images.get("team")).toBeNull();
    expect(await images.get("team")).toBeNull();
  }
  const images = new PublisherImages(
    vi.fn<typeof fetch>().mockRejectedValue(new Error("timeout")),
  );
  expect(await images.get("team")).toBeNull();
});

it("bounds the publisher cache", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => profile(null));
  const images = new PublisherImages(fetcher);
  for (let i = 0; i < 201; i++) await images.get(`team${i}`);
  await images.get("team0");
  expect(fetcher).toHaveBeenCalledTimes(202);
});

it("validates publisher routes and returns optional image data", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => profile(null));
  const app = createApp(undefined, new PublisherImages(fetcher));
  expect((await request(app).get("/api/publishers/bad%3F/avatar")).status).toBe(
    400,
  );
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    (await request(app).get("/api/publishers/fluent/avatar")).body,
  ).toEqual({ url: null });
  expect(String(fetcher.mock.calls[0][0])).toBe(
    "https://hub.docker.com/v2/users/fluent/",
  );
});

it("retries unavailable publisher images after a short cache interval", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => profile(null));
  const images = new PublisherImages(fetcher);
  await images.get("team");
  await images.get("team");
  expect(fetcher).toHaveBeenCalledTimes(1);
  vi.setSystemTime(Date.now() + 30_001);
  await images.get("team");
  expect(fetcher).toHaveBeenCalledTimes(2);
});
