import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import type { Repository } from "../shared/types";
import { RequestError } from "./api";

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

export function SearchForm({
  initial,
  label,
  placeholder,
  onSearch,
}: {
  initial: string;
  label: string;
  placeholder: string;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [previousInitial, setPreviousInitial] = useState(initial);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // Synchronize URL navigation without remounting the focused input.
  if (previousInitial !== initial) {
    setPreviousInitial(initial);
    setValue(initial);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    onSearch(value.trim());
  }
  return (
    <form
      className="search-form"
      onSubmit={submit}
      role="search"
      aria-label={label}
    >
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <span className="search-icon" aria-hidden="true">
        ⌕
      </span>
      <input
        ref={inputRef}
        id={inputId}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        maxLength={100}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="search"
        type="search"
      />
      {value && (
        <button
          className="clear-input"
          type="button"
          aria-label={
            label === "Search tags"
              ? "Clear tag filter"
              : "Clear repository search"
          }
          onClick={() => {
            setValue("");
            onSearch("");
            inputRef.current?.focus();
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
      <button className="primary" type="submit">
        Search <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}

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

export function Loading({
  label = "Loading repositories…",
}: {
  label?: string;
}) {
  return (
    <div className="state loading" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

function RetryButton({ delay, retry }: { delay: number; retry: () => void }) {
  const [remaining, setRemaining] = useState(delay);
  useEffect(() => {
    if (!delay) return;
    const until = Date.now() + delay * 1000;
    const timer = window.setInterval(
      () => setRemaining(Math.max(0, Math.ceil((until - Date.now()) / 1000))),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [delay]);
  return (
    <button onClick={retry} disabled={remaining > 0}>
      {remaining > 0 ? `Retry in ${remaining}s` : "Try again"}
    </button>
  );
}

export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const delay = error instanceof RequestError ? (error.retryAfter ?? 0) : 0;
  const notFound = error instanceof RequestError && error.status === 404;
  return (
    <div className="state error" role="alert">
      <span className="state-symbol" aria-hidden="true">
        {notFound ? "∅" : "!"}
      </span>
      <h2>
        {notFound ? "Nothing at this address" : "Unable to load this view"}
      </h2>
      <p>{error.message}</p>
      <RetryButton key={error.message} delay={delay} retry={retry} />
    </div>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="state" role="status">
      <span className="state-symbol" aria-hidden="true">
        ⌕
      </span>
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}

export function Pagination({
  page,
  hasNext,
  onChange,
}: {
  page: number;
  hasNext: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <nav className="pagination" aria-label="Pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Previous
      </button>
      <span aria-current="page">Page {page}</span>
      <button
        disabled={!hasNext || page >= 9999}
        onClick={() => onChange(page + 1)}
      >
        Next →
      </button>
    </nav>
  );
}
