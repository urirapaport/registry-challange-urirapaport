import type { z } from "zod";
import type { Repository, Tag } from "../shared/types.js";
import { ApiError } from "./errors.js";
import { searchItem, tag } from "./dockerHubSchemas.js";

export function normalizeSearch(item: z.infer<typeof searchItem>): Repository {
  const parts = item.repo_name.split("/");
  const name = parts.at(-1)!;
  const namespace =
    parts.length === 2
      ? parts[0]
      : item.is_official
        ? "library"
        : item.repo_owner;

  // A missing nonofficial owner cannot safely be guessed to mean "library".
  if (
    !namespace ||
    parts.length > 2 ||
    !/^[a-z0-9][a-z0-9._-]*$/.test(namespace) ||
    !/^[a-z0-9][a-z0-9._-]*$/.test(name)
  ) {
    throw new ApiError(
      502,
      "Docker Hub returned an unrecognized repository identity.",
    );
  }

  return {
    namespace,
    name,
    fullName: namespace === "library" ? name : `${namespace}/${name}`,
    owner: namespace,
    official: namespace === "library",
    description: item.short_description ?? "",
    updatedAt: null,
  };
}

export function normalizeTag(item: z.infer<typeof tag>): Tag {
  const platforms = (item.images ?? []).flatMap((entry) => {
    const os = entry.os?.trim().toLowerCase();
    const architecture = entry.architecture?.trim().toLowerCase();

    if (
      !os ||
      !architecture ||
      os === "unknown" ||
      architecture === "unknown"
    ) {
      return [];
    }

    return [
      {
        os,
        architecture,
        variant: entry.variant?.trim() || null,
        osVersion: entry.os_version?.trim() || null,
        size: entry.size != null && entry.size >= 0 ? entry.size : null,
      },
    ];
  });

  return {
    name: item.name,
    updatedAt: item.last_updated ?? null,
    platforms,
  };
}
