export type AttributeTypeInput =
  | "DROPDOWN"
  | "RADIO"
  | "CHECKBOX"
  | "COLOR_SWATCH"
  | "IMAGE_SWATCH";

export interface IAttributeValueInput {
  value: string;
  slug?: string;
  colorCode?: string | null;
  mediaId?: string | null;
  sortOrder?: number;
}

export interface ICreateAttributePayload {
  name: string;
  slug?: string;
  type?: AttributeTypeInput;
  values?: IAttributeValueInput[];
}

export interface IUpdateAttributePayload {
  name?: string;
  slug?: string;
  type?: AttributeTypeInput;
}

export interface IAddValuesPayload {
  values: IAttributeValueInput[];
}

export interface IUpdateValuePayload {
  value?: string;
  slug?: string;
  colorCode?: string | null;
  mediaId?: string | null;
  sortOrder?: number;
}

export interface IAttributeListQuery {
  searchTerm?: string;
  type?: string;
  page?: number;
  limit?: number;
  sort?: string;
}
