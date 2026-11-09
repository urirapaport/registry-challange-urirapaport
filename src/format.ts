export function formatSize(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0)
    return "Unavailable";
  if (bytes < 1024) return `${bytes} B`;
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  return `${(bytes / 1024 ** unit).toFixed(1)} ${["B", "KiB", "MiB", "GiB"][unit]}`;
}

export function formatDate(value: string | null): string {
  if (!value || Number.isNaN(Date.parse(value))) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function readPage(value: string | null): number {
  return value && /^[1-9]\d{0,3}$/.test(value) ? Number(value) : 1;
}

export function safeReturnTo(value: string | null): string {
  return value === "/" || value?.startsWith("/?") ? value : "/";
}
