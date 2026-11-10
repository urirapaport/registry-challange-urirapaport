import { useEffect, useState } from "react";

export function CopyCommand({ command }: { command: string }) {
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

  return (
    <div className="copy-cell">
      <button
        className={state === "copied" ? "copy-button copied" : "copy-button"}
        disabled={state === "copying"}
        onClick={() => void copy()}
        aria-label={`Copy ${command}`}
      >
        {state === "copied"
          ? "✓ Copied"
          : state === "copying"
            ? "Copying…"
            : "Copy command"}
      </button>
      <span className="sr-only" role="status">
        {state === "copied" ? `Copied ${command}` : ""}
      </span>
      {state === "failed" && (
        <div className="manual-copy">
          <p className="copy-error" role="alert">
            Copy failed. Copy the selected command manually.
          </p>
          <input
            aria-label="Command to copy manually"
            value={command}
            readOnly
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      )}
    </div>
  );
}
