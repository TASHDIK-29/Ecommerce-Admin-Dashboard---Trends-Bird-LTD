export interface IUpdateMediaPayload {
  altText?: string | null;
  title?: string | null;
}

export interface IMediaListQuery {
  searchTerm?: string;
  type?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface IUploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
}
