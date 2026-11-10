import { RequestError } from "../api/client";
import { RetryButton } from "./RetryButton";

export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const delay = error instanceof RequestError ? (error.retryAfter ?? 0) : 0;
  const notFound = error instanceof RequestError && error.status === 404;

  return (
    <div className="state error" role="alert">
      <span className="state-symbol" aria-hidden="true">
        {notFound ? "∅" : "!"}
      </span>
      <h2>
        {notFound ? "Nothing at this address" : "Unable to load this view"}
      </h2>
      <p>{error.message}</p>
      <RetryButton key={error.message} delay={delay} retry={retry} />
    </div>
  );
}
