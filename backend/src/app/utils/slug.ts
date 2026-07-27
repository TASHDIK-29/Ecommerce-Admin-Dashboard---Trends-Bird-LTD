import slugify from "slugify";

export const toSlug = (input: string): string =>
  slugify(input, { lower: true, strict: true, trim: true });

/**
 * Produces a slug that does not collide with an existing one.
 *
 * The candidate is always rebuilt from the ORIGINAL base — appending to the
 * already-suffixed value is what produces drift like `phones-1-2-3` after a
 * few collisions.
 *
 * @param exists callback that reports whether a candidate is already taken
 */
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
