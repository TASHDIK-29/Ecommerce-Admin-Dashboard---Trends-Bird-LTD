import slugify from "slugify";

export const toSlug = (input: string): string =>
  slugify(input, { lower: true, strict: true, trim: true });

export const generateUniqueSlug = async (
  source: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> => {
  const base = toSlug(source);
  let candidate = base;
  let suffix = 1;

  while (await exists(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};
