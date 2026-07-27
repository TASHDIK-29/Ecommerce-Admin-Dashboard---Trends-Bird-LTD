export interface IVariantInput {
  sku: string;
  attributeValueIds: string[];
  price: number;
  salePrice?: number | null;
  stock?: number;
  lowStockThreshold?: number | null;
  weight?: number | null;
  isActive?: boolean;
  mediaIds?: string[];
}

export interface IMediaAttachmentInput {
  mediaId: string;
  variantId?: string | null;
  attributeValueId?: string | null;
  isThumbnail?: boolean;
  isGallery?: boolean;
  sortOrder?: number;
}

export interface ICreateProductPayload {
  name: string;
  slug?: string;
  sku: string;
  shortDescription?: string;
  longDescription?: string;
  hasVariants?: boolean;
  price?: number;
  salePrice?: number | null;
  stock?: number;
  lowStockThreshold?: number | null;
  weight?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  brandId?: string | null;
  categoryIds?: string[];
  attributeIds?: string[];
  media?: IMediaAttachmentInput[];
  variants?: IVariantInput[];
}

export interface IUpdateProductPayload {
  name?: string;
  slug?: string;
  sku?: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  price?: number | null;
  salePrice?: number | null;
  stock?: number | null;
  lowStockThreshold?: number | null;
  weight?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  brandId?: string | null;
  categoryIds?: string[];
  attributeIds?: string[];
}

export interface IUpdateVariantPayload {
  sku?: string;
  attributeValueIds?: string[];
  price?: number;
  salePrice?: number | null;
  stock?: number;
  lowStockThreshold?: number | null;
  weight?: number | null;
  isActive?: boolean;
}

export interface IGenerateVariantsPayload {
  attributes: { attributeId: string; valueIds: string[] }[];
  skuPrefix?: string;
  price: number;
  salePrice?: number | null;
  stock?: number;
  replaceExisting?: boolean;
}

export interface IAttachMediaPayload {
  attachments: IMediaAttachmentInput[];
}

export interface IUpdateAttachmentPayload {
  isThumbnail?: boolean;
  isGallery?: boolean;
  sortOrder?: number;
}

export interface IReorderMediaPayload {
  order: { attachmentId: string; sortOrder: number }[];
}

export interface IProductListQuery {
  searchTerm?: string;
  categoryId?: string;
  brandId?: string;
  isActive?: string;
  isFeatured?: string;
  hasVariants?: string;
  stockStatus?: string;
  page?: number;
  limit?: number;
  sort?: string;
}
