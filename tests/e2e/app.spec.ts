import { expect, test } from "@playwright/test";
import type { Page, Route } from "@playwright/test";

for (const width of [375, 1280]) {
  test(`repository pagination retains layout and synchronizes controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    let releasePage: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releasePage = resolve;
    });
    await page.route("**/api/search?*", async (route) => {
      const params = new URL(route.request().url()).searchParams;
      const number = Number(params.get("page") || 1);
      if (number === 2) await gate;
      const empty = params.get("q") === "empty";
      await reply(route, {
        items: empty
          ? []
          : Array.from({ length: number === 3 ? 1 : 12 }, (_, i) =>
              repo(`result-${number}-${i}`, "demo"),
            ),
        count: empty ? 0 : 25,
        hasNext: !empty && number < 3,
      });
    });
    await page.goto("/?q=demo");
    const top = page.getByRole("navigation", {
      name: "Repository pages above results",
    });
    const bottom = page.getByRole("navigation", {
      name: "Repository pages below results",
    });
    const grid = page.locator(".repo-grid");
    await expect(page.locator(".repo-card")).toHaveCount(12);
    await expect(top.getByRole("button", { name: "Previous" })).toBeDisabled();
    const dimensions = () =>
      page.evaluate(() => {
        const grid = document
          .querySelector(".repo-grid")!
          .getBoundingClientRect();
        return {
          height: grid.height,
          top: grid.top + scrollY,
          footer:
            document.querySelector("footer")!.getBoundingClientRect().top +
            scrollY,
        };
      });
    const before = await dimensions();
    await top.getByRole("button", { name: "Next" }).click();
    await expect(page.locator(".result-count")).toHaveText(
      "Updating repositories…",
    );
    await expect(grid).toHaveAttribute("aria-busy", "true");
    await expect(grid).toHaveAttribute("inert", "");
    await expect(page.locator(".repo-card")).toHaveCount(12);
    await expect(page.locator(".search-spinner")).toBeVisible();
    for (const controls of [top, bottom]) {
      await expect(
        controls.getByRole("button", { name: "Next" }),
      ).toBeDisabled();
      await expect(
        controls.getByRole("button", { name: "Previous" }),
      ).toBeDisabled();
    }
    const during = await dimensions();
    expect(during.height).toBeCloseTo(before.height, 0);
    expect(during.top).toBeCloseTo(before.top, 0);
    expect(during.footer).toBeCloseTo(before.footer, 0);
    releasePage();
    await expect(grid).toHaveAttribute("aria-busy", "false");
    await expect(grid).not.toHaveAttribute("inert");
    await expect(page.locator(".repo-card").first()).toContainText(
      "result-2-0",
    );
    await expect(bottom).toContainText("Page 2");
    await top.getByRole("button", { name: "Next" }).click();
    await expect(page.locator(".repo-card")).toHaveCount(1);
    await expect(bottom).toContainText("Page 3");
    await expect(top.getByRole("button", { name: "Next" })).toBeDisabled();
    await expect(bottom.getByRole("button", { name: "Next" })).toBeDisabled();
    await bottom.getByRole("button", { name: "Previous" }).click();
    await expect(top).toContainText("Page 2");
    await page.reload();
    await expect(top).toContainText("Page 2");
    await page.screenshot({
      path: `test-results/repository-pagination-${width}.png`,
      fullPage: true,
    });
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.getByRole("searchbox").fill("empty");
    await page.getByRole("searchbox").press("Enter");
    await expect(
      page.getByRole("heading", { name: "No repositories found" }),
    ).toBeVisible();
    await expect(page.locator(".repo-card")).toHaveCount(0);
    await page.getByRole("button", { name: "Clear repository search" }).click();
    await expect(page.locator(".repo-card")).toHaveCount(10);
    await expect(page.locator(".pagination")).toHaveCount(0);
  });
}

const names = [
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
const repo = (name = "nginx", namespace = "library") => ({
  namespace,
  name,
  fullName: namespace === "library" ? name : `${namespace}/${name}`,
  owner: namespace,
  official: namespace === "library",
  description: `A ${name} repository fixture.`,
  updatedAt: "2026-11-01T12:00:00Z",
});
const reply = (route: Route, data: unknown, status = 200) =>
  route.fulfill({ status, json: data });

async function mockApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pageNumber = url.searchParams.get("page") ?? "1";
    if (url.pathname.endsWith("/avatar")) return reply(route, { url: null });
    if (url.pathname.endsWith("/popular"))
      return reply(route, {
        items: names.map((name) => repo(name)),
        count: 10,
        hasNext: false,
      });
    if (url.pathname.endsWith("/search")) {
      const q = url.searchParams.get("q");
      return reply(route, {
        items:
          q === "empty"
            ? []
            : pageNumber === "2"
              ? [repo("nginx-ingress", "nginx")]
              : [repo(q ?? "nginx")],
        count: q === "empty" ? 0 : 24,
        hasNext: pageNumber === "1",
      });
    }
    if (url.pathname.endsWith("/tags"))
      return reply(route, {
        items: [
          {
            name: pageNumber === "1" ? "1.2-alpine" : "1.1-alpine",
            updatedAt: "2026-11-01T12:00:00Z",
            platforms: [
              {
                os: "linux",
                architecture: "amd64",
                variant: null,
                osVersion: null,
                size: 1048576,
              },
            ],
          },
        ],
        count: 11,
        hasNext: pageNumber === "1",
      });
    const segments = url.pathname.split("/");
    return reply(route, repo(segments.at(-1), segments.at(-2)));
  });
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("showcase, explicit search, pagination, details, exact clipboard and return context", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".repo-card")).toHaveCount(10);
  await expect(page.locator(".logo img")).toHaveCount(10);
  await page
    .getByRole("searchbox", { name: "Search repositories", exact: true })
    .fill("nginx");
  await expect(page.locator(".repo-card")).toHaveCount(10);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=nginx/);
  await page.getByRole("button", { name: "Next" }).first().click();
  await page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", {
        name: "nginx/nginx-ingress",
        exact: true,
      }),
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "nginx/nginx-ingress", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Copy docker pull nginx/nginx-ingress:1.2-alpine",
      exact: true,
    })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("docker pull nginx/nginx-ingress:1.2-alpine");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Image tags" })).toBeVisible();
  await page.getByRole("link", { name: "Back to repositories" }).click();
  await expect(page).toHaveURL("/?q=nginx&page=2");
  await page.getByRole("searchbox").fill("empty");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No repositories found" }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/page=2/);
  expect(errors).toEqual([]);
});

test("official pull command, tag pagination, tag search reset and copy failure", async ({
  page,
}) => {
  await page.goto("/repositories/library/nginx");
  await page
    .getByRole("button", {
      name: "Copy docker pull nginx:1.2-alpine",
      exact: true,
    })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("docker pull nginx:1.2-alpine");
  await page.getByRole("button", { name: "Next" }).first().click();
  await expect(
    page.getByText("docker pull nginx:1.1-alpine", { exact: true }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("alpine");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=alpine/);
  await expect(page).not.toHaveURL(/page=2/);
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: () => Promise.reject(new Error("denied")),
      configurable: true,
    });
  });
  await page
    .getByRole("button", {
      name: "Copy docker pull nginx:1.2-alpine",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText("Copy failed");
  await expect(
    page.getByRole("button", {
      name: "Copy docker pull nginx:1.2-alpine",
      exact: true,
    }),
  ).toHaveText("Copy command");
});

test("tags can fail independently and recover; missing repository is clear", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/api/repositories/library/nginx/tags?*", (route) =>
    fail
      ? reply(route, { message: "Docker Hub took too long to respond." }, 504)
      : reply(route, { items: [], count: 0, hasNext: false }),
  );
  await page.goto("/repositories/library/nginx");
  await expect(
    page.getByRole("heading", { name: "nginx", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("too long");
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "No tags on this page" }),
  ).toBeVisible();
  await page.route("**/api/repositories/library/missing", (route) =>
    reply(
      route,
      { message: "Repository or page not found on Docker Hub." },
      404,
    ),
  );
  await page.goto("/repositories/library/missing");
  await expect(
    page.getByRole("heading", { name: "Nothing at this address" }),
  ).toBeVisible();
});

test("a slower previous search never replaces the latest search", async ({
  page,
}) => {
  await page.route("**/api/search?*", async (route) => {
    const q = new URL(route.request().url()).searchParams.get("q")!;
    if (q === "slow") await new Promise((resolve) => setTimeout(resolve, 400));
    await reply(route, { items: [repo(q)], count: 1, hasNext: false });
  });
  await page.goto("/");
  await page.getByRole("searchbox").fill("slow");
  await page.getByRole("searchbox").press("Enter");
  await expect(page).toHaveURL(/q=slow/);
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.getByRole("searchbox").fill("fast");
  await page.getByRole("searchbox").press("Enter");
  await expect(
    page.getByRole("heading", { name: "fast", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(500);
  await expect(
    page.getByRole("heading", { name: "fast", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "slow", exact: true }),
  ).toHaveCount(0);
});

test("mobile layout, keyboard search and failed logo fallback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/logos/nginx.svg", (route) => route.abort());
  await page.goto("/");
  await expect(
    page.getByRole("img", { name: "No logo available for nginx" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.getByRole("searchbox").focus();
  await page.keyboard.type("nginx");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "nginx", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/repositories/library/nginx");
  await expect(
    page.getByRole("button", {
      name: "Copy docker pull nginx:1.2-alpine",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("clear actions preserve input focus and pagination returns to results", async ({
  page,
}) => {
  await page.goto("/?q=nginx&page=2");
  await expect(
    page.getByRole("heading", { name: "nginx/nginx-ingress", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Previous" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Results for “nginx”" }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Previous" }).first(),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Clear repository search" }).click();
  await expect(page.getByRole("searchbox")).toBeFocused();
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.locator(".repo-card")).toHaveCount(10);
  await page.getByRole("link", { name: "postgres", exact: true }).click();
  await expect(page).toHaveURL(/q=postgres/);
  await page.getByRole("link", { name: "Clear search ×", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/repositories/library/nginx?q=alpine&page=2");
  await page.getByRole("button", { name: "Previous" }).first().click();
  await expect(page.getByRole("heading", { name: "Image tags" })).toBeFocused();
  await page.getByRole("button", { name: "Clear tag filter" }).click();
  await expect(page.getByRole("searchbox")).toBeFocused();
  await expect(page).not.toHaveURL(/q=|page=/);
  await page.getByRole("searchbox").fill("alpine");
  await page.getByRole("searchbox").press("Enter");
  await expect(
    page.getByRole("button", { name: "Clear tag search ×", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Clear tag filter" }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(
    page.getByRole("link", {
      name: "View on Docker Hub (opens in a new tab)",
      exact: true,
    }),
  ).toHaveAttribute("href", "https://hub.docker.com/r/library/nginx");
  await page.getByRole("link", { name: "Registry home" }).click();
  await expect(page.locator(".repo-card")).toHaveCount(10);
  await page.goto("/missing-ui-page");
  await page
    .getByRole("link", { name: "Explore repositories", exact: true })
    .click();
  await expect(page).toHaveURL("/");
});

test("copy confirmation resets and manual fallback is selected for keyboard use", async ({
  page,
}) => {
  await page.goto("/repositories/library/nginx");
  const button = page.getByRole("button", {
    name: "Copy docker pull nginx:1.2-alpine",
    exact: true,
  });
  await button.click();
  await expect(button).toHaveText("✓ Copied");
  await expect(button).toHaveText("Copy command", { timeout: 4000 });
  await page.evaluate(() =>
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: () => Promise.reject(new Error("denied")),
      configurable: true,
    }),
  );
  await button.click();
  const fallback = page.getByRole("textbox", {
    name: "Command to copy manually",
  });
  await expect(fallback).toBeFocused();
  await expect(fallback).toHaveValue("docker pull nginx:1.2-alpine");
  expect(
    await fallback.evaluate((input: HTMLInputElement) =>
      input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0),
    ),
  ).toBe("docker pull nginx:1.2-alpine");
});

test("rate-limit retry waits, then recovers without automatic requests", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/popular", (route) => {
    requests += 1;
    return requests === 1
      ? reply(
          route,
          { message: "Please wait before trying again.", retryAfter: 2 },
          429,
        )
      : reply(route, {
          items: names.map((name) => repo(name)),
          count: 10,
          hasNext: false,
        });
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Retry in/ })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeEnabled({ timeout: 4000 });
  expect(requests).toBe(1);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".repo-card")).toHaveCount(10);
  expect(requests).toBe(2);
});

for (const width of [375, 1280]) {
  test(`accessibility and input layout at ${width}px`, async ({ page }) => {
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/?q=nginx", "/repositories/library/nginx"]) {
      await page.goto(path);
      await expect(
        page
          .locator(
            path.includes("/repositories/") ? ".copy-button" : ".repo-card",
          )
          .first(),
      ).toBeVisible();
      await page.screenshot({
        path: `test-results/ux-${width}-${path.includes("/repositories/") ? "details" : path.includes("?") ? "search" : "explore"}.png`,
      });
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        results.violations.map(({ id, nodes }) => ({
          id,
          elements: nodes.map(({ target, failureSummary }) => ({
            target,
            failureSummary,
          })),
        })),
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      for (const button of await page.getByRole("button").all()) {
        const box = await button.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
}

test("long input and tag names remain usable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto("/");
  await page.getByRole("searchbox").fill("n".repeat(100));
  await page.getByRole("searchbox").press("Enter");
  await expect(page.locator(".repo-card")).toHaveCount(1);
  await page.screenshot({
    path: "test-results/narrow-long-input.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const clear = page.getByRole("button", { name: "Clear repository search" });
  await expect(clear).toBeVisible();
  await clear.click();
  await page.route("**/api/repositories/library/nginx/tags?*", (route) =>
    reply(route, {
      items: [
        {
          name: "v" + "1".repeat(127),
          platforms: [
            {
              os: "linux",
              architecture: "amd64",
              variant: null,
              osVersion: null,
              size: null,
            },
          ],
          updatedAt: null,
        },
      ],
      count: 1,
      hasNext: false,
    }),
  );
  await page.goto("/repositories/library/nginx");
  await expect(page.getByText("Unavailable", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next" }).first(),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("tag search debounces typing, resets pagination and replaces browser history", async ({
  page,
}) => {
  const tagRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith("/tags")) {
      tagRequests.push(url.searchParams.get("q") ?? "");
    }
  });

  await page.goto("/?q=nginx");
  await page.locator(".repo-card").click();
  await expect(
    page.getByText("docker pull nginx:1.2-alpine", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next" }).first().click();
  await expect(
    page.getByText("docker pull nginx:1.1-alpine", { exact: true }),
  ).toBeVisible();

  await page.clock.install();
  await page.clock.pauseAt(new Date());
  tagRequests.length = 0;
  const input = page.getByRole("searchbox", {
    name: "Search tags",
    exact: true,
  });
  await input.fill("al");
  await page.clock.runFor(300);
  await input.fill("alpine");
  await page.clock.runFor(300);
  expect(tagRequests).toEqual([]);
  await expect(page).toHaveURL(/page=2/);

  await page.clock.runFor(200);
  await expect(page).toHaveURL(/q=alpine/);
  await expect(page).not.toHaveURL(/page=2/);
  await expect(input).toBeFocused();
  await expect.poll(() => tagRequests).toEqual(["alpine"]);
  expect(new URL(page.url()).searchParams.get("from")).toBe("/?q=nginx");

  await input.fill("pending");
  await page.goBack();
  await expect(input).toHaveValue("");
  await page.clock.runFor(600);
  await expect(page).not.toHaveURL(/q=|page=/);
  expect(tagRequests).not.toContain("pending");
  await page.goBack();
  await expect(page).toHaveURL("/?q=nginx");
});

test("tag submit and clear cancel pending debounce; repository search stays explicit", async ({
  page,
}) => {
  const tagRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith("/tags")) {
      tagRequests.push(url.searchParams.get("q") ?? "");
    }
  });

  await page.goto("/repositories/library/nginx");
  await expect(
    page.getByText("docker pull nginx:1.2-alpine", { exact: true }),
  ).toBeVisible();
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  tagRequests.length = 0;
  const input = page.getByRole("searchbox");
  await input.fill("alpine");
  await input.press("Enter");
  await expect(page).toHaveURL(/q=alpine/);
  await expect.poll(() => tagRequests).toEqual(["alpine"]);
  await page.clock.runFor(600);
  expect(tagRequests).toEqual(["alpine"]);

  await input.fill("stable");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=stable/);
  await expect.poll(() => tagRequests).toEqual(["alpine", "stable"]);
  await input.fill("pending");
  await page
    .getByRole("button", { name: "Clear tag filter", exact: true })
    .click();
  await page.clock.runFor(600);
  await expect(page).not.toHaveURL(/q=/);
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  expect(tagRequests).not.toContain("pending");

  await input.fill("abandoned");
  await page.getByRole("link", { name: "Back to repositories" }).click();
  await expect(page).toHaveURL("/");
  await page.clock.runFor(600);
  await expect(page).toHaveURL("/");
  expect(tagRequests).not.toContain("abandoned");
  await page.getByRole("searchbox").fill("redis");
  await page.clock.runFor(1000);
  await expect(page).toHaveURL("/");
  await expect(page.locator(".repo-card")).toHaveCount(10);
});

for (const width of [375, 1280]) {
  test(`tag results keep their layout while a new filter loads at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    let releaseSearch: () => void = () => {};
    const searchGate = new Promise<void>((resolve) => {
      releaseSearch = resolve;
    });
    await page.route(
      "**/api/repositories/library/nginx/tags?*",
      async (route) => {
        const filtered =
          new URL(route.request().url()).searchParams.get("q") === "alpine";
        if (filtered) {
          await searchGate;
        }
        await reply(route, {
          items: Array.from({ length: 10 }, (_, index) => ({
            name: `${filtered ? "alpine" : "stable"}-${index}`,
            updatedAt: "2026-11-01T12:00:00Z",
            platforms: [
              {
                os: "linux",
                architecture: "amd64",
                variant: null,
                osVersion: null,
                size: 1048576,
              },
            ],
          })),
          count: 20,
          hasNext: true,
        });
      },
    );

    await page.goto("/repositories/library/nginx");
    const table = page.locator(".tag-table-wrap");
    await expect(page.locator(".tag-name")).toHaveCount(10);
    const input = page.getByRole("searchbox");
    await input.focus();
    const before = await table.boundingBox();
    const footerBefore = await page.locator("footer").boundingBox();
    await input.fill("alpine");
    await expect(page.locator(".result-count")).toHaveText("Updating tags…");
    await expect(
      page.getByRole("search", { name: "Search tags", exact: true }),
    ).toHaveAttribute("aria-busy", "true");
    await expect(page.locator(".search-spinner")).toBeVisible();
    await expect(table).toHaveAttribute("aria-busy", "true");
    await expect(page.locator(".tag-name").first()).toHaveText("stable-0");
    await expect(
      page.getByRole("button", {
        name: "Copy docker pull nginx:stable-0",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Next" }).first(),
    ).toBeDisabled();
    await expect(input).toBeFocused();
    const during = await table.boundingBox();
    const footerDuring = await page.locator("footer").boundingBox();
    expect(before).not.toBeNull();
    expect(during?.height).toBeCloseTo(before!.height, 0);
    expect(during?.y).toBeCloseTo(before!.y, 0);
    expect(footerDuring?.y).toBeCloseTo(footerBefore!.y, 0);
    await page.screenshot({ path: `test-results/tags-updating-${width}.png` });

    releaseSearch();
    await expect(table).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".search-spinner")).toHaveCount(0);
    await expect(page.locator(".tag-name").first()).toHaveText("alpine-0");
    await expect(
      page.getByRole("button", {
        name: "Copy docker pull nginx:alpine-0",
        exact: true,
      }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Next" }).first(),
    ).toBeEnabled();
  });
}

for (const width of [375, 1280]) {
  test(`all platform sizes and both pagination controls work at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route(
      "**/api/repositories/library/nginx/tags?*",
      async (route) => {
        const number = Number(
          new URL(route.request().url()).searchParams.get("page") || 1,
        );
        await reply(route, {
          count: 21,
          hasNext: number < 3,
          items: [
            {
              name: "version-" + number,
              updatedAt: null,
              platforms: [
                {
                  os: "linux",
                  architecture: "amd64",
                  variant: null,
                  osVersion: null,
                  size: 1048576,
                },
                {
                  os: "linux",
                  architecture: "arm",
                  variant: "v7",
                  osVersion: null,
                  size: null,
                },
                {
                  os: "windows",
                  architecture: "amd64",
                  variant: null,
                  osVersion: "10.0.20348",
                  size: 4194304,
                },
              ],
            },
          ],
        });
      },
    );
    await page.goto(
      "/repositories/library/nginx?from=%2F%3Fq%3Dnginx&os=linux&arch=arm",
    );
    const top = page.getByRole("navigation", {
      name: "Tag pages above results",
    });
    const bottom = page.getByRole("navigation", {
      name: "Tag pages below results",
    });
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByText("linux/arm/v7", { exact: true })).toBeVisible();
    await page.locator("summary").click();
    await expect(
      page.getByText("windows/amd64 (10.0.20348)", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("4.0 MiB", { exact: true })).toBeVisible();
    await expect(top.getByRole("button", { name: "Previous" })).toBeDisabled();
    await top.getByRole("button", { name: "Next" }).click();
    await expect(page.locator(".tag-name")).toHaveText("version-2");
    await expect(bottom).toContainText("Page 2");
    await top.getByRole("button", { name: "Next" }).click();
    await expect(page.locator(".tag-name")).toHaveText("version-3");
    await expect(top.getByRole("button", { name: "Next" })).toBeDisabled();
    await expect(bottom.getByRole("button", { name: "Next" })).toBeDisabled();
    await bottom.getByRole("button", { name: "Previous" }).click();
    await expect(page.locator(".tag-name")).toHaveText("version-2");
    await expect(top).toContainText("Page 2");
    await page.reload();
    await expect(top).toContainText("Page 2");
    await page.getByRole("searchbox").fill("version");
    await page.getByRole("searchbox").press("Enter");
    await expect(page.locator(".tag-name")).toHaveText("version-1");
    await expect(page).not.toHaveURL(/page=2|os=|arch=/);
    await page.locator("summary").click();
    await page.screenshot({
      path: `test-results/platforms-pagination-${width}.png`,
      fullPage: true,
    });
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("link", { name: "Back to repositories" }).click();
    await expect(page).toHaveURL("/?q=nginx");
  });
}

test("publisher avatars load independently and failed images fall back", async ({
  page,
}) => {
  await page.route("**/api/search?**", (route) =>
    reply(route, {
      items: [repo("one", "fluent"), repo("two", "fluent")],
      count: 2,
      hasNext: false,
    }),
  );
  let avatarRequests = 0;
  await page.route("**/api/publishers/fluent/avatar", (route) => {
    avatarRequests++;
    return reply(route, {
      url: "https://www.gravatar.com/avatar/abc123?d=404",
    });
  });
  await page.route("https://www.gravatar.com/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="green"/></svg>',
    }),
  );
  await page.goto("/?q=fluent");
  await expect(
    page.getByRole("img", { name: "fluent publisher avatar" }),
  ).toHaveCount(2);
  expect(avatarRequests).toBe(1);
  await page.route("https://www.gravatar.com/**", (route) => route.abort());
  await page.reload();
  await expect(
    page.getByRole("img", { name: "No logo available for fluent/one" }),
  ).toBeVisible();
  await expect(page.locator(".repo-card")).toHaveCount(2);
});
