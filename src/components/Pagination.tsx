export function Pagination({
  page,
  hasNext,
  onChange,
  disabled = false,
}: {
  page: number;
  hasNext: boolean;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  return (
    <nav className="pagination" aria-label="Pagination">
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
