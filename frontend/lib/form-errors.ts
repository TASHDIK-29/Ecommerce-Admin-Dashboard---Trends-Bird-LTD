import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiError } from "./api-client";

/**
 * Maps the API's errorSources[] onto the matching form fields so a rejected
 * slug or SKU is shown against that input rather than only as a toast.
 *
 * Returns the messages that had no matching field, so the caller can surface
 * them at form level.
 */
export const applyApiErrors = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
): string[] => {
  if (!(error instanceof ApiError)) {
    return [error instanceof Error ? error.message : "Something went wrong."];
  }

  const unmatched: string[] = [];
  let matched = false;

  for (const source of error.errorSources) {
    const field = source.path.split(".").pop() ?? source.path;

    if (knownFields.includes(field)) {
      setError(field as Path<T>, { type: "server", message: source.message });
      matched = true;
    } else {
      unmatched.push(source.message);
    }
  }

  if (!matched && unmatched.length === 0) {
    unmatched.push(error.message);
  }

  if (matched && unmatched.length > 0) {
    return [];
  }

  return unmatched.length > 0 ? unmatched : [error.message];
};

export const errorMessage = (error: unknown): string => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
};
