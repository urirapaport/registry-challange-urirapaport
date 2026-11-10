import { useState } from "react";
import type { Repository } from "../../shared/types";

const logos = new Set([
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
]);

export function Logo({ repository }: { repository: Repository }) {
  const [failed, setFailed] = useState(false);
  const hasLogo =
    repository.namespace === "library" && logos.has(repository.name);

  return (
    <span className="logo">
      {hasLogo && !failed ? (
        <img
          src={`/logos/${repository.name}.svg`}
          alt={`${repository.name} logo`}
          onError={() => setFailed(true)}
          width="38"
          height="38"
        />
      ) : (
        <span
          role="img"
          aria-label={`No logo available for ${repository.fullName}`}
          className="monogram"
        >
          {repository.name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}
