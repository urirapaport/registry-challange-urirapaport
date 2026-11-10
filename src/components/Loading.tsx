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
