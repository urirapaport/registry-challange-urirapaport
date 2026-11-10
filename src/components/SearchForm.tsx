import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useDebouncedSearch } from "../hooks/useDebouncedSearch";

export function SearchForm({
  initial,
  label,
  placeholder,
  onSearch,
  onDebouncedSearch,
  isSearching = false,
}: {
  initial: string;
  label: string;
  placeholder: string;
  onSearch: (value: string) => void;
  onDebouncedSearch?: (value: string) => void;
  isSearching?: boolean;
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

  const { cancel: cancelPendingSearch } = useDebouncedSearch(
    value,
    initial,
    onDebouncedSearch,
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    cancelPendingSearch();
    onSearch(value.trim());
  }

  return (
    <form
      className="search-form"
      onSubmit={submit}
      role="search"
      aria-label={label}
      aria-busy={isSearching}
    >
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <span className="search-icon" aria-hidden="true">
        {isSearching ? <span className="spinner search-spinner" /> : "⌕"}
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
            cancelPendingSearch();
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
