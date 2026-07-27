export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
}

export interface ApiEnvelope<T> {
  statusCode: number;
  success: boolean;
  message: string;
  meta?: ApiMeta;
  data: T;
}

export interface ApiErrorSource {
  path: string;
  message: string;
}

export interface ApiErrorBody {
  statusCode: number;
  success: false;
  message: string;
  errorSources: ApiErrorSource[];
  stack: string | null;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: ApiMeta;
}

export interface SessionRole {
  id: string;
  name: string;
  status: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  avatarId: string | null;
  isActive: boolean;
  role: SessionRole;
  permissions: string[];
}

export interface LoginResult {
  user: SessionUser;
  accessToken: string;
  csrfToken: string;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  searchTerm?: string;
  sort?: string;
  [key: string]: string | number | boolean | undefined;
}
