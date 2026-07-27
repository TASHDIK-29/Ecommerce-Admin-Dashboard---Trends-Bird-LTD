export interface ICreateCategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  imageId?: string | null;
  parentId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface IUpdateCategoryPayload {
  name?: string;
  slug?: string;
  description?: string;
  imageId?: string | null;
  parentId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface ICategoryListQuery {
  searchTerm?: string;
  parentId?: string;
  isActive?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface ICategoryTreeQuery {
  isActive?: string;
}

export interface ICategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageId: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  depth: number;
  children: ICategoryTreeNode[];
}
