import { describe, expect, it } from "vitest";
import { normalizeSearch, normalizeTag } from "../server/dockerHub";
import { pullCommand } from "../shared/types";
import { formatDate, formatSize, safeReturnTo } from "../src/format";
import { pageNumber, queryText, repositorySegment } from "../server/validation";

describe("repository identity and commands", () => {
  it("maps unqualified official images to library", () => {
    expect(
      normalizeSearch({
        repo_name: "nginx",
        repo_owner: "",
        is_official: true,
      }),
    ).toMatchObject({
      namespace: "library",
      name: "nginx",
      fullName: "nginx",
      owner: "library",
      official: true,
    });
    expect(pullCommand("library", "nginx", "1.27-alpine")).toBe(
      "docker pull nginx:1.27-alpine",
    );
  });
  it("derives a namespace from a qualified name even with an empty owner", () => {
    expect(
      normalizeSearch({ repo_name: "nginx/nginx-ingress", repo_owner: "" }),
    ).toMatchObject({
      namespace: "nginx",
      name: "nginx-ingress",
      official: false,
    });
    expect(pullCommand("nginx", "nginx-ingress", "5.0")).toBe(
      "docker pull nginx/nginx-ingress:5.0",
    );
  });
  it("uses a supplied owner without guessing missing nonofficial identities", () => {
    expect(
      normalizeSearch({ repo_name: "app", repo_owner: "team" }).fullName,
    ).toBe("team/app");
    expect(() => normalizeSearch({ repo_name: "app", repo_owner: "" })).toThrow(
      "identity",
    );
    expect(() => normalizeSearch({ repo_name: "evil/name/other" })).toThrow();
  });
});

describe("tag sizes and missing data", () => {
  it("chooses only linux/amd64 instead of summing platforms or attestations", () => {
    expect(
      normalizeTag({
        name: "v1",
        images: [
          { os: "unknown", architecture: "unknown", size: 2 },
          { os: "linux", architecture: "arm64", size: 120 },
          { os: "linux", architecture: "amd64", size: 100 },
        ],
      }).size,
    ).toBe(100);
  });
  it("preserves zero and reports missing or invalid sizes honestly", () => {
    expect(normalizeTag({ name: "v1" }).size).toBeNull();
    expect(
      normalizeTag({
        name: "v1",
        images: [{ os: "linux", architecture: "amd64", size: -1 }],
      }).size,
    ).toBeNull();
    expect(
      normalizeTag({
        name: "v1",
        images: [{ os: "linux", architecture: "amd64", size: 0 }],
      }).size,
    ).toBe(0);
    expect(formatSize(null)).toBe("Unavailable");
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(1048576)).toBe("1.0 MiB");
    expect(formatDate(null)).toBe("Unknown");
    expect(formatDate("invalid")).toBe("Unknown");
  });
});

describe("input boundaries", () => {
  it.each(["0", "-1", "1.5", "10000", "1e2", ["1"], {}])(
    "rejects invalid pages %j",
    (value) => expect(() => pageNumber(value)).toThrow(),
  );
  it("accepts bounded pages and trimmed queries", () => {
    expect(pageNumber(undefined)).toBe(1);
    expect(pageNumber("9999")).toBe(9999);
    expect(queryText(" nginx ")).toBe("nginx");
  });
  it.each(["a/b", "..", "a?x=1", "name;ls", "UPPER"])(
    "rejects unsafe path %s",
    (value) => expect(() => repositorySegment(value)).toThrow(),
  );
  it("rejects structured, long and control-character queries", () => {
    expect(() => queryText(["nginx"])).toThrow();
    expect(() => queryText("x".repeat(101))).toThrow();
    expect(() => queryText("a\nb")).toThrow();
  });
  it("only accepts local explore return links", () => {
    expect(safeReturnTo("/?q=nginx&page=2")).toBe("/?q=nginx&page=2");
    expect(safeReturnTo("//evil.test")).toBe("/");
    expect(safeReturnTo("https://evil.test")).toBe("/");
  });
});
