export type RoleStatusInput = "ACTIVE" | "INACTIVE";

export interface ICreateRolePayload {
  name: string;
  description?: string;
  status?: RoleStatusInput;
  permissionIds?: string[];
  grantAll?: boolean;
}

export interface IUpdateRolePayload {
  name?: string;
  description?: string;
  status?: RoleStatusInput;
  permissionIds?: string[];
}

export interface IModifyPermissionsPayload {
  permissionIds: string[];
}

export interface IRoleListQuery {
  searchTerm?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort?: string;
}
