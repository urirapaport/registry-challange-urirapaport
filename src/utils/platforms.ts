import type { PlatformImage } from "../../shared/types";

export function platformLabel(platform: PlatformImage): string {
  const variant = platform.variant ? `/${platform.variant}` : "";
  const version = platform.osVersion ? ` (${platform.osVersion})` : "";

  return `${platform.os}/${platform.architecture}${variant}${version}`;
}
