import { useEffect, useRef } from "react";

export function useDebouncedSearch(
  value: string,
  initial: string,
  onSearch?: (value: string) => void,
) {
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!onSearch || value.trim() === initial) {
      return;
    }

    timer.current = window.setTimeout(() => {
      onSearch(value.trim());
    }, 500);

    return () => window.clearTimeout(timer.current);
  }, [value, initial, onSearch]);

  function cancel() {
    window.clearTimeout(timer.current);
  }

  return { cancel };
}
