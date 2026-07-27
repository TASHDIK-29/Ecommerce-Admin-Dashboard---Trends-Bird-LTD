export type GenderInput = "MALE" | "FEMALE" | "OTHER";

export interface ICreateUserPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  gender?: GenderInput;
  avatarId?: string;
  roleId: string;
  isActive?: boolean;
}

export interface IUpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  gender?: GenderInput;
  avatarId?: string | null;
  roleId?: string;
  isActive?: boolean;
}

export interface IUpdateStatusPayload {
  isActive: boolean;
}

export interface IUserListQuery {
  searchTerm?: string;
  roleId?: string;
  isActive?: string;
  page?: number;
  limit?: number;
  sort?: string;
}
