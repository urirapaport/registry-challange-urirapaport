import { Link } from "react-router-dom";
import type { Repository } from "../../shared/types";
import { Logo } from "./Logo";

export function RepositoryCard({
  repository,
  returnTo,
}: {
  repository: Repository;
  returnTo: string;
}) {
  const href = `/repositories/${encodeURIComponent(repository.namespace)}/${encodeURIComponent(repository.name)}?${new URLSearchParams({ from: returnTo })}`;

  return (
    <Link className="repo-card" to={href}>
      <div className="card-top">
        <Logo repository={repository} />
        <span className="card-arrow" aria-hidden="true">
          →
        </span>
      </div>
      <h3>{repository.fullName}</h3>
      <p className="description">
        {repository.description || "No description provided."}
      </p>
      <div className="card-bottom">
        <span>
          by <strong>{repository.owner}</strong>
        </span>
        {repository.official && <span className="badge">✓ Official image</span>}
      </div>
    </Link>
  );
}
