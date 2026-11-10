export function Pagination({
  page,
  hasNext,
  onChange,
  disabled = false,
  label = "Pagination",
}: {
  page: number;
  hasNext: boolean;
  onChange: (page: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <nav className="pagination" aria-label={label}>
      <button
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ← Previous
      </button>
      <span aria-current="page">Page {page}</span>
      <button
        disabled={disabled || !hasNext || page >= 9999}
        onClick={() => onChange(page + 1)}
      >
        Next →
      </button>
    </nav>
  );
}
