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
