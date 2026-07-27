export interface ICreateGroupPayload {
  name: string;
  description?: string;
  actions: string[];
}

export interface IUpdateGroupPayload {
  name?: string;
  description?: string;
  actions?: string[];
}

export interface ICreatePermissionPayload {
  groupId: string;
  action: string;
  description?: string;
}

export interface IUpdatePermissionPayload {
  action?: string;
  description?: string;
}

export interface IListQuery {
  searchTerm?: string;
  groupId?: string;
  page?: number;
  limit?: number;
  sort?: string;
}
