export type BrandStatusInput = "ACTIVE" | "INACTIVE";

export interface ICreateBrandPayload {
  name: string;
  slug?: string;
  description?: string;
  logoId?: string | null;
  status?: BrandStatusInput;
}

export interface IUpdateBrandPayload {
  name?: string;
  slug?: string;
  description?: string;
  logoId?: string | null;
  status?: BrandStatusInput;
}

export interface IBrandListQuery {
  searchTerm?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort?: string;
}
