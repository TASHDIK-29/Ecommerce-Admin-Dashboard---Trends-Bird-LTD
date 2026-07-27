export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

export interface ISessionUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  avatarId: string | null;
  isActive: boolean;
  role: {
    id: string;
    name: string;
    status: string;
  };
  permissions: string[];
}

export interface ILoginResult {
  tokens: IAuthTokens;
  user: ISessionUser;
}
