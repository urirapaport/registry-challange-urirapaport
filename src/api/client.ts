import type { Page, Repository, Tag } from "../../shared/types";

export class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`/api/${path}`, { signal });

  if (!response.ok) {
    const body: { message?: string; retryAfter?: number } = await response
      .json()
      .catch(() => ({}));

    throw new RequestError(
      body.message ?? "Unable to load data. Please try again.",
      response.status,
      body.retryAfter,
    );
  }

  return response.json() as Promise<T>;
}

const repositoryPath = (namespace: string, name: string) =>
  `repositories/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;

export const api = {
  publisherAvatar: (namespace: string, signal: AbortSignal) =>
    get<{ url: string | null }>(
      `publishers/${encodeURIComponent(namespace)}/avatar`,
      signal,
    ),

  popular: (signal: AbortSignal) => get<Page<Repository>>("popular", signal),

  search: (q: string, page: number, signal: AbortSignal) =>
    get<Page<Repository>>(
      `search?${new URLSearchParams({ q, page: String(page) })}`,
      signal,
    ),

  repository: (namespace: string, name: string, signal: AbortSignal) =>
    get<Repository>(repositoryPath(namespace, name), signal),

  tags: (
    namespace: string,
    name: string,
    q: string,
    page: number,
    signal: AbortSignal,
  ) =>
    get<Page<Tag>>(
      `${repositoryPath(namespace, name)}/tags?${new URLSearchParams({ q, page: String(page) })}`,
      signal,
    ),
};
