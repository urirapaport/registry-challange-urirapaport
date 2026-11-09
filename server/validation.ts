import { ApiError } from "./errors.js";

export function pageNumber(value: unknown): number {
  if (value === undefined) return 1;
  if (typeof value !== "string" || !/^[1-9]\d{0,3}$/.test(value)) {
    throw new ApiError(400, "Page must be a whole number between 1 and 9999.");
  }
  return Number(value);
}

export function queryText(value: unknown): string {
  if (value === undefined) return "";
  if (
    typeof value !== "string" ||
    value.length > 100 ||
    [...value].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  ) {
    throw new ApiError(400, "Search must be plain text up to 100 characters.");
  }
  return value.trim();
}

export function repositorySegment(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 255 ||
    !/^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$/.test(value)
  ) {
    throw new ApiError(400, "Invalid repository name or namespace.");
  }
  return value;
}
