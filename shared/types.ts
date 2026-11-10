export interface Repository {
  namespace: string;
  name: string;
  fullName: string;
  owner: string;
  official: boolean;
  description: string;
  updatedAt: string | null;
}

export interface Tag {
  name: string;
  updatedAt: string | null;
  platforms: PlatformImage[];
}

export interface PlatformImage {
  os: string;
  architecture: string;
  variant: string | null;
  osVersion: string | null;
  size: number | null;
}

export interface Page<T> {
  items: T[];
  count: number;
  hasNext: boolean;
}

export function pullCommand(
  namespace: string,
  name: string,
  tag: string,
): string {
  return `docker pull ${namespace === "library" ? name : `${namespace}/${name}`}:${tag}`;
}
