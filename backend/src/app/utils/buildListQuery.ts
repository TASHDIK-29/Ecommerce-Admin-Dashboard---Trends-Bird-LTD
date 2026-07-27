import { StatusCodes } from "http-status-codes";

import { AppError } from "../error/AppError";
import type { TMeta } from "./sendResponse";

/** Raw `req.query` after validation — every value is a string or absent. */
export type RawQuery = Record<string, unknown>;

export type WhereFragment = Record<string, unknown>;

export type FilterSpec =
  | { type: "string" }
  | { type: "boolean" }
  | { type: "enum"; values: readonly string[] }
  | { type: "custom"; build: (raw: string) => WhereFragment | undefined };

export interface ListQueryConfig {
  /** Fields the `searchTerm` runs a case-insensitive contains over. Dotted paths allowed ("brand.name"). */
  searchableFields?: readonly string[];
  /** Query params that may be turned into `where` clauses, and how to read each. */
  filters?: Record<string, FilterSpec>;
  /** Fields the client may sort by. Anything else is rejected rather than silently ignored. */
  sortableFields?: readonly string[];
  /** Applied when the client sends no `sort`. */
  defaultSort?: Record<string, "asc" | "desc">;
  maxLimit?: number;
}

export interface ListQueryResult {
  where: WhereFragment;
  orderBy: Record<string, unknown>[];
  skip: number;
  take: number;
  page: number;
  limit: number;
}

/** Turns "brand.name" + value into { brand: { name: value } }. */
const nest = (path: string, value: unknown): WhereFragment => {
  const segments = path.split(".");
  return segments.reduceRight<unknown>(
    (acc, segment) => ({ [segment]: acc }),
    value,
  ) as WhereFragment;
};

const asString = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return undefined;
};

const parseBoolean = (raw: string): boolean | undefined => {
  if (["true", "1"].includes(raw.toLowerCase())) return true;
  if (["false", "0"].includes(raw.toLowerCase())) return false;
  return undefined;
};

/**
 * Builds the `where` / `orderBy` / `skip` / `take` for a paginated list
 * endpoint from `req.query`.
 *
 * Deliberately returns the `where` rather than running the query, so the
 * caller counts with *the same* `where` it selects with:
 *
 *   const [rows, total] = await prisma.$transaction([
 *     prisma.thing.findMany({ where, orderBy, skip, take }),
 *     prisma.thing.count({ where }),
 *   ]);
 *
 * That is the fix for the classic pagination bug where the total is the
 * unfiltered collection count and the UI over-reports the number of pages.
 */
export const buildListQuery = (
  query: RawQuery,
  config: ListQueryConfig = {},
): ListQueryResult => {
  const {
    searchableFields = [],
    filters = {},
    sortableFields = [],
    defaultSort = { createdAt: "desc" },
    maxLimit = 100,
  } = config;

  const conditions: WhereFragment[] = [];

  // --- search -------------------------------------------------------------
  const searchTerm = asString(query.searchTerm);
  if (searchTerm && searchableFields.length > 0) {
    conditions.push({
      OR: searchableFields.map((field) =>
        nest(field, { contains: searchTerm, mode: "insensitive" }),
      ),
    });
  }

  // --- filters ------------------------------------------------------------
  for (const [param, spec] of Object.entries(filters)) {
    const raw = asString(query[param]);
    if (raw === undefined) continue;

    switch (spec.type) {
      case "string":
        conditions.push(nest(param, raw));
        break;

      case "boolean": {
        const parsed = parseBoolean(raw);
        if (parsed === undefined) {
          throw new AppError(
            StatusCodes.UNPROCESSABLE_ENTITY,
            `Query parameter "${param}" must be true or false.`,
            [{ path: param, message: "Expected true or false." }],
          );
        }
        conditions.push(nest(param, parsed));
        break;
      }

      case "enum": {
        const match = spec.values.find(
          (value) => value.toLowerCase() === raw.toLowerCase(),
        );
        if (!match) {
          throw new AppError(
            StatusCodes.UNPROCESSABLE_ENTITY,
            `Query parameter "${param}" must be one of: ${spec.values.join(", ")}.`,
            [{ path: param, message: `Expected one of: ${spec.values.join(", ")}.` }],
          );
        }
        conditions.push(nest(param, match));
        break;
      }

      case "custom": {
        const fragment = spec.build(raw);
        if (fragment) conditions.push(fragment);
        break;
      }
    }
  }

  // --- sorting ------------------------------------------------------------
  const sortParam = asString(query.sort);
  let orderBy: Record<string, unknown>[];

  if (sortParam) {
    orderBy = sortParam.split(",").map((token) => {
      const descending = token.startsWith("-");
      const field = descending ? token.slice(1) : token;

      if (!sortableFields.includes(field)) {
        throw new AppError(
          StatusCodes.UNPROCESSABLE_ENTITY,
          `Cannot sort by "${field}". Allowed: ${sortableFields.join(", ")}.`,
          [{ path: "sort", message: `Unsupported sort field "${field}".` }],
        );
      }

      return nest(field, descending ? "desc" : "asc");
    });
  } else {
    orderBy = Object.entries(defaultSort).map(([field, direction]) =>
      nest(field, direction),
    );
  }

  // --- pagination ---------------------------------------------------------
  const page = Math.max(1, Number(query.page) || 1);
  const requestedLimit = Number(query.limit) || 10;
  const limit = Math.min(Math.max(1, requestedLimit), maxLimit);

  return {
    where: conditions.length > 0 ? { AND: conditions } : {},
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  };
};

export const buildMeta = (total: number, page: number, limit: number): TMeta => ({
  page,
  limit,
  total,
  totalPage: Math.ceil(total / limit) || 0,
});
