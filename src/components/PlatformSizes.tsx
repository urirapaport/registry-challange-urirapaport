import type { PlatformImage } from "../../shared/types";
import { formatSize } from "../utils/format";
import { platformLabel } from "../utils/platforms";

export function PlatformSizes({ platforms }: { platforms: PlatformImage[] }) {
  if (!platforms.length) {
    return (
      <span className="platform-unavailable">
        Platform information unavailable
      </span>
    );
  }

  function sizes(items: PlatformImage[]) {
    return (
      <dl className="platform-sizes">
        {items.map((platform, index) => (
          <div key={`${platformLabel(platform)}-${index}`}>
            <dt>{platformLabel(platform)}</dt>
            <dd>{formatSize(platform.size)}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <div>
      {sizes(platforms.slice(0, 2))}
      {platforms.length > 2 && (
        <details className="more-platforms">
          <summary>
            {platforms.length - 2} more{" "}
            {platforms.length === 3 ? "platform" : "platforms"}
          </summary>
          {sizes(platforms.slice(2))}
        </details>
      )}
    </div>
  );
}
