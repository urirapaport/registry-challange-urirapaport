import assert from "node:assert/strict";
import { DockerHub } from "../server/dockerHub.js";
import { pullCommand } from "../shared/types.js";

const hub = new DockerHub();
const popular = await hub.popular();
assert.equal(popular.items.length, 10);
assert(popular.items.every((item) => item.description && item.updatedAt));
const search = await hub.search("nginx", 1);
assert(search.items.some((item) => item.fullName === "nginx"));
const next = await hub.search("nginx", 2);
assert.notEqual(search.items[0].fullName, next.items[0].fullName);
assert.equal((await hub.search("zznoimage93829173", 1)).count, 0);
assert.equal(
  (await hub.repository("nginx", "nginx-ingress")).namespace,
  "nginx",
);
const tags = await hub.tags("library", "nginx", 1, "alpine");
assert(tags.items.length > 0);
assert(
  tags.items.some((tag) =>
    tag.platforms.some((image) => image.os === "linux" && image.size !== null),
  ),
);
assert(
  tags.items.every((tag) =>
    tag.platforms.every(
      (image) => image.os !== "unknown" && image.architecture !== "unknown",
    ),
  ),
);
assert(tags.items.every((tag) => tag.name.includes("alpine")));
assert.equal(
  (await hub.tags("library", "nginx", 1, "zznoimage93829173")).count,
  0,
);
assert.notEqual(
  (await hub.tags("library", "nginx", 2, "alpine")).items[0].name,
  tags.items[0].name,
);
assert.equal(
  pullCommand("library", "nginx", tags.items[0].name),
  `docker pull nginx:${tags.items[0].name}`,
);
await assert.rejects(() => hub.repository("library", "zznoimage93829173"), {
  status: 404,
});
console.log(
  "Live smoke passed: 10 showcase images, search and tag pagination, empty results, namespaced details, size metadata, and 404.",
);
console.log(
  `Example tag: ${tags.items[0].name}; platforms: ${tags.items[0].platforms.map((image) => `${image.os}/${image.architecture}${image.variant ? `/${image.variant}` : ""}: ${image.size}`).join(", ")}`,
);
