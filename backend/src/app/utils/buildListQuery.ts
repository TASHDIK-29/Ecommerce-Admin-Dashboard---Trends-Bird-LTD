import { StatusCodes } from "http-status-codes";

import { AppError } from "../error/AppError";
import type { TMeta } from "./sendResponse";

export type RawQuery = Record<string, unknown>;

export type WhereFragment = Record<string, unknown>;

export type FilterSpec =
  | { type: "string" }
  | { type: "boolean" }
  | { type: "enum"; values: readonly string[] }
  | { type: "custom"; build: (raw: string) => WhereFragment | undefined };

export interface ListQueryConfig {
  searchableFields?: readonly string[];
  filters?: Record<string, FilterSpec>;
  sortableFields?: readonly string[];
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

export const buildListQuery = <T extends object>(
  query: T,
  config: ListQueryConfig = {},
): ListQueryResult => {
  const raw = query as RawQuery;

  const {
    searchableFields = [],
    filters = {},
    sortableFields = [],
    defaultSort = { createdAt: "desc" },
    maxLimit = 100,
  } = config;

  const conditions: WhereFragment[] = [];

  const searchTerm = asString(raw.searchTerm);
  if (searchTerm && searchableFields.length > 0) {
    conditions.push({
      OR: searchableFields.map((field) =>
        nest(field, { contains: searchTerm, mode: "insensitive" }),
      ),
    });
  }

  for (const [param, spec] of Object.entries(filters)) {
    const rawValue = asString(raw[param]);
    if (rawValue === undefined) continue;

    switch (spec.type) {
      case "string":
        conditions.push(nest(param, rawValue));
        break;

      case "boolean": {
        const parsed = parseBoolean(rawValue);
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
          (value) => value.toLowerCase() === rawValue.toLowerCase(),
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
        const fragment = spec.build(rawValue);
        if (fragment) conditions.push(fragment);
        break;
      }
    }
  }

  const sortParam = asString(raw.sort);
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

  const page = Math.max(1, Number(raw.page) || 1);
  const requestedLimit = Number(raw.limit) || 10;
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
