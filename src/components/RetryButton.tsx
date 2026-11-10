import { useEffect, useState } from "react";

export function RetryButton({
  delay,
  retry,
}: {
  delay: number;
  retry: () => void;
}) {
  const [remaining, setRemaining] = useState(delay);

  useEffect(() => {
    if (!delay) {
      return;
    }

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
