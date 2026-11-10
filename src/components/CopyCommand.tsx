import { useCopyCommand } from "../hooks/useCopyCommand";

export function CopyCommand({
  command,
  disabled = false,
}: {
  command: string;
  disabled?: boolean;
}) {
  const { state, copy } = useCopyCommand(command);

  return (
    <div className="copy-cell">
      <button
        className={state === "copied" ? "copy-button copied" : "copy-button"}
        disabled={disabled || state === "copying"}
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
