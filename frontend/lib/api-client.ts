import type { ApiEnvelope, ApiErrorSource, ListQuery, PaginatedResult } from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export class ApiError extends Error {
  statusCode: number;
  errorSources: ApiErrorSource[];

  constructor(statusCode: number, message: string, errorSources: ApiErrorSource[] = []) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorSources = errorSources;
  }

  get isForbidden(): boolean {
    return this.statusCode === 403;
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  get isConflict(): boolean {
    return this.statusCode === 409;
  }

  get isValidation(): boolean {
    return this.statusCode === 422 || this.statusCode === 400;
  }
}

const CSRF_COOKIE = "csrfToken";
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const readCookie = (name: string): string | undefined => {
  if (typeof document === "undefined") return undefined;

  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
};

let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  onUnauthorized = handler;
};

/**
 * Concurrent 401s must trigger exactly one refresh. Without this, several
 * parallel requests would each call /auth/refresh; because the backend rotates
 * the refresh token, the second call would present an already-rotated token,
 * trip reuse detection and revoke the whole session.
 */
let refreshPromise: Promise<boolean> | null = null;

const runRefresh = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...csrfHeader(),
      },
      body: "{}",
    });

    return response.ok;
  } catch {
    return false;
  }
};

const refreshSession = (): Promise<boolean> => {
  refreshPromise ??= runRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

const csrfHeader = (): Record<string, string> => {
  const token = readCookie(CSRF_COOKIE);
  return token ? { "X-CSRF-Token": token } : {};
};

export const buildQuery = (query?: ListQuery): string => {
  if (!query) return "";

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    const asString = String(value);
    if (asString.trim() === "") continue;
    params.set(key, asString);
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: ListQuery;
  signal?: AbortSignal;
}

const NO_RETRY_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"];

const send = async (path: string, options: RequestOptions): Promise<Response> => {
  const method = options.method ?? "GET";
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {};
  if (!isFormData && options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (MUTATING.has(method)) {
    Object.assign(headers, csrfHeader());
  }

  return fetch(`${API_URL}${path}${buildQuery(options.query)}`, {
    method,
    credentials: "include",
    headers,
    signal: options.signal,
    body: isFormData
      ? (options.body as FormData)
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });
};

const toApiError = async (response: Response): Promise<ApiError> => {
  try {
    const body = await response.json();
    return new ApiError(
      body?.statusCode ?? response.status,
      body?.message ?? response.statusText,
      Array.isArray(body?.errorSources) ? body.errorSources : [],
    );
  } catch {
    return new ApiError(response.status, response.statusText || "Request failed.");
  }
};

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> => {
  let response: Response;

  try {
    response = await send(path, options);
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new ApiError(0, "Cannot reach the server. Check that the API is running.");
  }

  if (response.status === 401 && !NO_RETRY_PATHS.includes(path)) {
    const refreshed = await refreshSession();

    if (refreshed) {
      response = await send(path, options);
    } else {
      onUnauthorized?.();
      throw await toApiError(response);
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return { statusCode: 204, success: true, message: "", data: null as T };
  }

  return (await response.json()) as ApiEnvelope<T>;
};

export const api = {
  get: async <T>(path: string, query?: ListQuery, signal?: AbortSignal): Promise<T> =>
    (await request<T>(path, { query, signal })).data,

  list: async <T>(path: string, query?: ListQuery, signal?: AbortSignal): Promise<PaginatedResult<T>> => {
    const envelope = await request<T[]>(path, { query, signal });
    return {
      data: envelope.data ?? [],
      meta: envelope.meta ?? { page: 1, limit: 10, total: 0, totalPage: 0 },
    };
  },

  post: async <T>(path: string, body?: unknown): Promise<T> =>
    (await request<T>(path, { method: "POST", body })).data,

  patch: async <T>(path: string, body?: unknown): Promise<T> =>
    (await request<T>(path, { method: "PATCH", body })).data,

  delete: async <T>(path: string, query?: ListQuery, body?: unknown): Promise<T> =>
    (await request<T>(path, { method: "DELETE", query, body })).data,
};
