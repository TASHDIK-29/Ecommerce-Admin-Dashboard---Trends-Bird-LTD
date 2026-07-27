export type AuthSource = "cookie" | "bearer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  authSource: AuthSource;
}

export interface JwtPayloadData {
  userId: string;
  email: string;
  tokenId?: string;
}
