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
