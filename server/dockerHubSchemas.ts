import { z } from "zod";

const optionalText = z.string().nullish();

export const searchItem = z.object({
  repo_name: z.string(),
  repo_owner: optionalText,
  is_official: z.boolean().optional(),
  short_description: optionalText,
});

export const details = z.object({
  name: z.string(),
  namespace: z.string(),
  description: optionalText,
  last_updated: optionalText,
});

const image = z.object({
  architecture: optionalText,
  os: optionalText,
  variant: optionalText,
  os_version: optionalText,
  size: z.number().nullish(),
});

export const tag = z.object({
  name: z.string().regex(/^[\w][\w.-]{0,127}$/),
  last_updated: optionalText,
  images: z.array(image).nullish(),
});

export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    count: z.number().int().nonnegative(),
    next: z.string().nullish(),
    results: z.array(item),
  });
}
