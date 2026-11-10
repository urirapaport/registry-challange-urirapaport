import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
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
  const avatar = useQuery({
    queryKey: ["publisher-avatar", repository.namespace],
    queryFn: ({ signal }) => api.publisherAvatar(repository.namespace, signal),
    enabled: !hasLogo,
    staleTime: (query) => (query.state.data?.url ? 300_000 : 30_000),
  });
  const source = hasLogo ? `/logos/${repository.name}.svg` : avatar.data?.url;

  return (
    <span className="logo">
      {source && !failed ? (
        <img
          src={source}
          alt={
            hasLogo
              ? `${repository.name} logo`
              : `${repository.owner} publisher avatar`
          }
          referrerPolicy="no-referrer"
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
