import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Loading } from "../components/Loading";
import { Pagination } from "../components/Pagination";
import { RepositoryCard } from "../components/RepositoryCard";
import { SearchForm } from "../components/SearchForm";
import { readPage } from "../utils/format";

export function Explore() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const resultsHeading = useRef<HTMLHeadingElement>(null);

  const query = (params.get("q") ?? "").trim();
  const page = readPage(params.get("page"));

  const repositories = useQuery({
    queryKey: query ? ["search", query, page] : ["popular"],
    queryFn: ({ signal }) =>
      query ? api.search(query, page, signal) : api.popular(signal),
    placeholderData: (previousData, previousQuery) =>
      query &&
      previousQuery?.queryKey[0] === "search" &&
      previousQuery.queryKey[1] === query
        ? previousData
        : undefined,
  });

  function changeSearch(value: string) {
    setParams(value ? { q: value } : {});
  }

  function changePage(next: number) {
    setParams({ q: query, page: String(next) });
    resultsHeading.current?.focus({ preventScroll: true });
    resultsHeading.current?.scrollIntoView({ block: "start" });
  }

  return (
    <>
      <section className="hero">
        <div className="eyebrow">
          <span className="tiny-square" /> THE CONTAINER DIRECTORY
        </div>
        <h1>
          Find your next
          <br />
          <span>building block.</span>
        </h1>
        <p>
          Explore Docker Hub images. Find the right tag.
          <br className="desktop-break" /> Take your next pull command with you.
        </p>
        <SearchForm
          initial={query}
          label="Search repositories"
          placeholder="Search repositories, e.g. nginx"
          onSearch={changeSearch}
          isSearching={Boolean(query) && repositories.isFetching}
        />
        <div className="suggestions">
          <span>Start with</span>
          {["nginx", "postgres", "python"].map((name) => (
            <Link key={name} to={`/?q=${name}`}>
              {name}
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
        <div className="hero-code" aria-hidden="true">
          <span>01</span> find image
          <br />
          <span>02</span> choose tag
          <br />
          <span>03</span> <b>docker pull</b>
          <div className="code-cursor" />
        </div>
      </section>

      <section className="results" aria-labelledby="results-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              {query ? "SEARCH RESULTS" : "A GOOD PLACE TO START"}
            </div>
            <h2 id="results-title" ref={resultsHeading} tabIndex={-1}>
              {query ? `Results for “${query}”` : "Popular repositories"}
            </h2>
            <p>
              {query
                ? "Public repositories from Docker Hub."
                : "Ten familiar images, handpicked. Live details from Docker Hub."}
            </p>
          </div>
          {query && (
            <Link className="text-link" to="/">
              Clear search ×
            </Link>
          )}
        </div>
        {repositories.isPending ? (
          <Loading />
        ) : repositories.isError ? (
          <ErrorState
            error={repositories.error}
            retry={() => void repositories.refetch()}
          />
        ) : (
          <>
            <p className="result-count" role="status">
              {repositories.isPlaceholderData
                ? "Updating repositories…"
                : query
                  ? `${repositories.data.count.toLocaleString("en")} repositories · Page ${page}`
                  : "10 curated picks · Not a live ranking"}
            </p>
            {query && (
              <Pagination
                page={page}
                hasNext={repositories.data.hasNext}
                disabled={repositories.isPlaceholderData}
                label="Repository pages above results"
                onChange={changePage}
              />
            )}
            {repositories.data.items.length ? (
              <div
                className="repo-grid"
                aria-busy={repositories.isPlaceholderData}
                inert={repositories.isPlaceholderData}
              >
                {repositories.data.items.map((repository) => (
                  <RepositoryCard
                    key={`${repository.namespace}/${repository.name}`}
                    repository={repository}
                    returnTo={location.pathname + location.search}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No repositories found"
                message="Try a different keyword or return to the popular repositories."
              />
            )}
            {query && (
              <Pagination
                page={page}
                hasNext={repositories.data.hasNext}
                disabled={repositories.isPlaceholderData}
                label="Repository pages below results"
                onChange={changePage}
              />
            )}
          </>
        )}
      </section>
    </>
  );
}
