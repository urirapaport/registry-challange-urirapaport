import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { pullCommand } from "../shared/types";
import { api } from "./api";
import {
  EmptyState,
  ErrorState,
  Loading,
  Logo,
  Pagination,
  SearchForm,
} from "./components";
import { formatDate, formatSize, readPage, safeReturnTo } from "./format";

export function CopyCommand({ command }: { command: string }) {
  const [state, setState] = useState<"idle" | "copying" | "copied" | "failed">(
    "idle",
  );
  useEffect(() => {
    if (state !== "copied") return;
    const timer = window.setTimeout(() => setState("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [state]);
  async function copy() {
    setState("copying");
    try {
      await navigator.clipboard.writeText(command);
      setState("copied");
    } catch {
      setState("failed");
    }
  }
  return (
    <div className="copy-cell">
      <button
        className={state === "copied" ? "copy-button copied" : "copy-button"}
        disabled={state === "copying"}
        onClick={() => void copy()}
        aria-label={`Copy ${command}`}
      >
        {state === "copied"
          ? "✓ Copied"
          : state === "copying"
            ? "Copying…"
            : "Copy command"}
      </button>
      <span className="sr-only" role="status">
        {state === "copied" ? `Copied ${command}` : ""}
      </span>
      {state === "failed" && (
        <div className="manual-copy">
          <p className="copy-error" role="alert">
            Copy failed. Copy the selected command manually.
          </p>
          <input
            aria-label="Command to copy manually"
            value={command}
            readOnly
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      )}
    </div>
  );
}

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
  });
  function updateTags(q: string, next: number) {
    const updated = new URLSearchParams();
    const from = params.get("from");
    if (from) updated.set("from", safeReturnTo(from));
    if (q) updated.set("q", q);
    if (next > 1) updated.set("page", String(next));
    setParams(updated);
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
            <p>Find a tag and copy its pull command.</p>
          </div>
        </div>
        <SearchForm
          initial={query}
          label="Search tags"
          placeholder="Search all tags, e.g. alpine"
          onSearch={(value) => updateTags(value, 1)}
        />
        <p className="size-note">
          Sizes are reported image sizes for <code>linux/amd64</code>, not the
          sum of all platforms. Your download may differ.
        </p>
        {query && (
          <button className="clear-tags" onClick={() => updateTags("", 1)}>
            Clear tag search ×
          </button>
        )}
        {tags.isPending ? (
          <Loading label="Loading tags…" />
        ) : tags.isError ? (
          <ErrorState error={tags.error} retry={() => void tags.refetch()} />
        ) : (
          <>
            <p className="result-count" role="status">
              {tags.data.count.toLocaleString("en")}{" "}
              {query ? "matching tags" : "tags"} · Page {page}
            </p>
            {tags.data.items.length ? (
              <div className="tag-table-wrap">
                <table className="tag-table">
                  <thead>
                    <tr>
                      <th scope="col">TAG / PULL COMMAND</th>
                      <th scope="col">UPDATED (UTC)</th>
                      <th scope="col">
                        SIZE <span>linux/amd64</span>
                      </th>
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
                          <td data-label="Size · linux/amd64">
                            {formatSize(tag.size)}
                          </td>
                          <td>
                            <CopyCommand key={command} command={command} />
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
              onChange={(next) => {
                updateTags(query, next);
                tagsHeading.current?.focus({ preventScroll: true });
                tagsHeading.current?.scrollIntoView({ block: "start" });
              }}
            />
          </>
        )}
      </section>
    </div>
  );
}
