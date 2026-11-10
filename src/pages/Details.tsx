import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { pullCommand } from "../../shared/types";
import { api } from "../api/client";
import { CopyCommand } from "../components/CopyCommand";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Loading } from "../components/Loading";
import { Logo } from "../components/Logo";
import { Pagination } from "../components/Pagination";
import { PlatformSizes } from "../components/PlatformSizes";
import { SearchForm } from "../components/SearchForm";
import { formatDate, readPage, safeReturnTo } from "../utils/format";

export function Details() {
  const { namespace = "", name = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tagsHeading = useRef<HTMLHeadingElement>(null);

  const query = (params.get("q") ?? "").trim();
  const page = readPage(params.get("page"));

  const repository = useQuery({
    queryKey: ["repository", namespace, name],
    queryFn: ({ signal }) => api.repository(namespace, name, signal),
  });

  const tags = useQuery({
    queryKey: ["tags", namespace, name, query, page],
    queryFn: ({ signal }) => api.tags(namespace, name, query, page, signal),
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === namespace &&
      previousQuery.queryKey[2] === name
        ? previousData
        : undefined,
  });

  function updateTags(q: string, next: number, replace = false) {
    const updated = new URLSearchParams();
    const from = params.get("from");

    if (from) {
      updated.set("from", safeReturnTo(from));
    }

    if (q) {
      updated.set("q", q);
    }

    if (next > 1) {
      updated.set("page", String(next));
    }

    setParams(updated, { replace });
  }

  function changePage(next: number) {
    updateTags(query, next);
    tagsHeading.current?.focus({ preventScroll: true });
    tagsHeading.current?.scrollIntoView({ block: "start" });
  }

  return (
    <div className="details-page">
      <Link className="back-link" to={safeReturnTo(params.get("from"))}>
        ← Back to repositories
      </Link>
      {repository.isPending ? (
        <Loading label="Loading repository…" />
      ) : repository.isError ? (
        <ErrorState
          error={repository.error}
          retry={() => void repository.refetch()}
        />
      ) : (
        <section className="repository-header">
          <div className="repository-title">
            <Logo key={repository.data.fullName} repository={repository.data} />
            <div>
              <div className="eyebrow">REPOSITORY</div>
              <h1>{repository.data.fullName}</h1>
            </div>
            {repository.data.official && (
              <span className="badge">✓ Official image</span>
            )}
          </div>
          <p className="repository-description">
            {repository.data.description || "No description provided."}
          </p>
          <div className="repository-meta">
            <span>
              Owner <strong>{repository.data.owner}</strong>
            </span>
            <span>
              Last updated{" "}
              <strong title={repository.data.updatedAt ?? undefined}>
                {formatDate(repository.data.updatedAt)} <small>(UTC)</small>
              </strong>
            </span>
            <a
              href={`https://hub.docker.com/r/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`}
              target="_blank"
              rel="noreferrer"
              aria-label="View on Docker Hub (opens in a new tab)"
            >
              View on Docker Hub ↗
            </a>
          </div>
        </section>
      )}

      <section className="tags-section" aria-labelledby="tags-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">CHOOSE YOUR VERSION</div>
            <h2 id="tags-title" ref={tagsHeading} tabIndex={-1}>
              Image tags
            </h2>
            <p>
              Tags update as you type. Find a version and copy its pull command.
            </p>
          </div>
        </div>
        <SearchForm
          initial={query}
          label="Search tags"
          placeholder="Search all tags, e.g. alpine"
          onSearch={(value) => updateTags(value, 1)}
          onDebouncedSearch={(value) => updateTags(value, 1, true)}
          isSearching={tags.isFetching}
        />
        <p className="size-note">
          Each size belongs to one platform, not a combined download. Pull
          commands use your Docker host's default platform.
        </p>
        {tags.isPending ? (
          <Loading label="Loading tags…" />
        ) : tags.isError ? (
          <ErrorState error={tags.error} retry={() => void tags.refetch()} />
        ) : (
          <>
            <p className="result-count" role="status">
              {tags.isPlaceholderData
                ? "Updating tags…"
                : `${tags.data.count.toLocaleString("en")} ${query ? "matching tags" : "tags"} · Page ${page}`}
            </p>
            <Pagination
              page={page}
              hasNext={tags.data.hasNext}
              disabled={tags.isPlaceholderData}
              label="Tag pages above results"
              onChange={changePage}
            />
            {tags.data.items.length ? (
              <div
                className="tag-table-wrap"
                aria-busy={tags.isPlaceholderData}
              >
                <table className="tag-table">
                  <thead>
                    <tr>
                      <th scope="col">TAG / PULL COMMAND</th>
                      <th scope="col">UPDATED (UTC)</th>
                      <th scope="col">PLATFORM / SIZE</th>
                      <th scope="col">
                        <span className="sr-only">Copy command</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tags.data.items.map((tag) => {
                      const command = pullCommand(namespace, name, tag.name);

                      return (
                        <tr key={tag.name}>
                          <td>
                            <strong className="tag-name">{tag.name}</strong>
                            <code className="pull-command">{command}</code>
                          </td>
                          <td
                            title={tag.updatedAt ?? undefined}
                            data-label="Updated (UTC)"
                          >
                            {formatDate(tag.updatedAt)}
                          </td>
                          <td className="platform-cell">
                            <PlatformSizes platforms={tag.platforms} />
                          </td>
                          <td>
                            <CopyCommand
                              key={command}
                              command={command}
                              disabled={tags.isPlaceholderData}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title={query ? "No matching tags" : "No tags on this page"}
                message={
                  query
                    ? "Try a shorter tag name or clear your search."
                    : "This repository may not have published tags. If you are on a later page, try the previous page."
                }
              />
            )}
            <Pagination
              page={page}
              hasNext={tags.data.hasNext}
              disabled={tags.isPlaceholderData}
              label="Tag pages below results"
              onChange={changePage}
            />
          </>
        )}
      </section>
    </div>
  );
}
