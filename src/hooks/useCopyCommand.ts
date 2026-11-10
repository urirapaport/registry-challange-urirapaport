import { useEffect, useState } from "react";

export function useCopyCommand(command: string) {
  const [state, setState] = useState<"idle" | "copying" | "copied" | "failed">(
    "idle",
  );

  useEffect(() => {
    if (state !== "copied") {
      return;
    }

    const timer = window.setTimeout(() => setState("idle"), 2500);

    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy() {
    setState("copying");

    try {
      await navigator.clipboard.writeText(command);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return { state, copy };
}
