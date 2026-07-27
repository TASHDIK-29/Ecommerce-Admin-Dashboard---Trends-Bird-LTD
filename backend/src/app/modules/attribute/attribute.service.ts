import { StatusCodes } from "http-status-codes";

import { prisma } from "../../config/prisma";
import { AppError } from "../../error/AppError";
import { buildListQuery, buildMeta } from "../../utils/buildListQuery";
import { generateUniqueSlug, toSlug } from "../../utils/slug";
import {
  attributeDetailSelect,
  attributeSearchableFields,
  attributeSortableFields,
  attributeValueSelect,
  COLOR_TYPE,
  IMAGE_TYPE,
} from "./attribute.constant";
import type {
  AttributeTypeInput,
  IAddValuesPayload,
  IAttributeListQuery,
  IAttributeValueInput,
  ICreateAttributePayload,
  IUpdateAttributePayload,
  IUpdateValuePayload,
} from "./attribute.interface";

interface ResolvedValue {
  value: string;
  slug: string;
  colorCode: string | null;
  mediaId: string | null;
  sortOrder: number;
}

const assertReferenceMatchesType = (
  type: AttributeTypeInput,
  input: { value: string; colorCode?: string | null; mediaId?: string | null },
): void => {
  const path = `values.${input.value}`;

  if (type === COLOR_TYPE) {
    if (!input.colorCode) {
      throw new AppError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        `"${input.value}" needs a hex colour because this attribute is a colour swatch.`,
        [{ path, message: "colorCode is required for colour swatch attributes." }],
      );
    }
    if (input.mediaId) {
      throw new AppError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        `"${input.value}" cannot carry a media reference on a colour swatch attribute.`,
        [{ path, message: "mediaId is not allowed on colour swatch attributes." }],
      );
    }
    return;
  }

  if (type === IMAGE_TYPE) {
    if (!input.mediaId) {
      throw new AppError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        `"${input.value}" needs a media reference because this attribute is an image swatch.`,
        [{ path, message: "mediaId is required for image swatch attributes." }],
      );
    }
    if (input.colorCode) {
      throw new AppError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        `"${input.value}" cannot carry a hex colour on an image swatch attribute.`,
        [{ path, message: "colorCode is not allowed on image swatch attributes." }],
      );
    }
    return;
  }

  if (input.colorCode || input.mediaId) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      `"${input.value}" cannot carry a reference value on a ${type.toLowerCase()} attribute.`,
      [{ path, message: "Reference values are only for colour or image swatch attributes." }],
    );
  }
};

const assertMediaExists = async (mediaIds: string[]): Promise<void> => {
  const ids = [...new Set(mediaIds)];
  if (ids.length === 0) return;

  const found = await prisma.media.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (found.length === ids.length) return;

  const foundIds = new Set(found.map((media) => media.id));
  throw new AppError(
    StatusCodes.UNPROCESSABLE_ENTITY,
    "One or more referenced media assets do not exist.",
    ids.filter((id) => !foundIds.has(id)).map((id) => ({
      path: "mediaId",
      message: `No media with id ${id}.`,
    })),
  );
};

const resolveValues = (
  type: AttributeTypeInput,
  inputs: IAttributeValueInput[],
  takenValues: Set<string>,
  takenSlugs: Set<string>,
): ResolvedValue[] => {
  const resolved: ResolvedValue[] = [];

  for (const input of inputs) {
    assertReferenceMatchesType(type, input);

    const normalizedValue = input.value.trim();
    const key = normalizedValue.toLowerCase();

    if (takenValues.has(key)) {
      throw new AppError(
        StatusCodes.CONFLICT,
        `"${normalizedValue}" already exists on this attribute.`,
        [{ path: "values", message: "Values must be unique within an attribute." }],
      );
    }

    let slug = input.slug ?? toSlug(normalizedValue);
    if (!slug) {
      throw new AppError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        `"${normalizedValue}" cannot be turned into a slug.`,
        [{ path: "values", message: "Provide a slug for this value." }],
      );
    }

    if (takenSlugs.has(slug)) {
      let suffix = 1;
      const base = slug;
      while (takenSlugs.has(slug)) {
        slug = `${base}-${suffix}`;
        suffix += 1;
      }
    }

    takenValues.add(key);
    takenSlugs.add(slug);

    resolved.push({
      value: normalizedValue,
      slug,
      colorCode: input.colorCode ?? null,
      mediaId: input.mediaId ?? null,
      sortOrder: input.sortOrder ?? resolved.length,
    });
  }

  return resolved;
};

const assertNameAvailable = async (name: string, excludeId?: string): Promise<void> => {
  const existing = await prisma.attribute.findUnique({ where: { name }, select: { id: true } });
  if (!existing || existing.id === excludeId) return;

  throw new AppError(StatusCodes.CONFLICT, `An attribute named "${name}" already exists.`, [
    { path: "name", message: "This attribute name is already taken." },
  ]);
};

const assertSlugAvailable = async (slug: string, excludeId?: string): Promise<void> => {
  const existing = await prisma.attribute.findUnique({ where: { slug }, select: { id: true } });
  if (!existing || existing.id === excludeId) return;

  throw new AppError(StatusCodes.CONFLICT, `An attribute with the slug "${slug}" already exists.`, [
    { path: "slug", message: "This slug is already taken." },
  ]);
};

const loadAttributeOrThrow = async (id: string) => {
  const attribute = await prisma.attribute.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      values: { select: { id: true, value: true, slug: true } },
    },
  });

  if (!attribute) {
    throw new AppError(StatusCodes.NOT_FOUND, "Attribute not found.");
  }

  return attribute;
};

const createAttribute = async (payload: ICreateAttributePayload) => {
  await assertNameAvailable(payload.name);

  const slug = payload.slug
    ? payload.slug
    : await generateUniqueSlug(payload.name, async (candidate) =>
        Boolean(await prisma.attribute.findUnique({ where: { slug: candidate }, select: { id: true } })),
      );

  await assertSlugAvailable(slug);

  const type = payload.type ?? "DROPDOWN";
  const values = resolveValues(type, payload.values ?? [], new Set(), new Set());

  await assertMediaExists(values.flatMap((v) => (v.mediaId ? [v.mediaId] : [])));

  return prisma.attribute.create({
    data: {
      name: payload.name,
      slug,
      type,
      values: { create: values },
    },
    select: attributeDetailSelect,
  });
};

const getAttributes = async (query: IAttributeListQuery) => {
  const { where, orderBy, skip, take, page, limit } = buildListQuery(query, {
    searchableFields: attributeSearchableFields,
    sortableFields: attributeSortableFields,
    filters: {
      type: {
        type: "enum",
        values: ["DROPDOWN", "RADIO", "CHECKBOX", "COLOR_SWATCH", "IMAGE_SWATCH"],
      },
    },
    defaultSort: { name: "asc" },
  });

  const [data, total] = await prisma.$transaction([
    prisma.attribute.findMany({ where, orderBy, skip, take, select: attributeDetailSelect }),
    prisma.attribute.count({ where }),
  ]);

  return { data, meta: buildMeta(total, page, limit) };
};

const getAttributeById = async (id: string) => {
  const attribute = await prisma.attribute.findUnique({
    where: { id },
    select: attributeDetailSelect,
  });

  if (!attribute) {
    throw new AppError(StatusCodes.NOT_FOUND, "Attribute not found.");
  }

  return attribute;
};

const updateAttribute = async (id: string, payload: IUpdateAttributePayload) => {
  const attribute = await loadAttributeOrThrow(id);

  if (payload.name && payload.name !== attribute.name) {
    await assertNameAvailable(payload.name, id);
  }

  if (payload.slug && payload.slug !== attribute.slug) {
    await assertSlugAvailable(payload.slug, id);
  }

  if (payload.type && payload.type !== attribute.type) {
    const existing = await prisma.attributeValue.findMany({
      where: { attributeId: id },
      select: { value: true, colorCode: true, mediaId: true },
    });

    for (const value of existing) {
      assertReferenceMatchesType(payload.type, value);
    }
  }

  await prisma.attribute.update({
    where: { id },
    data: { name: payload.name, slug: payload.slug, type: payload.type },
  });

  return getAttributeById(id);
};

const deleteAttribute = async (id: string) => {
  const attribute = await prisma.attribute.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { values: true } } },
  });

  if (!attribute) {
    throw new AppError(StatusCodes.NOT_FOUND, "Attribute not found.");
  }

  await prisma.attribute.delete({ where: { id } });

  return { id: attribute.id, name: attribute.name, deletedValues: attribute._count.values };
};

const addValues = async (id: string, payload: IAddValuesPayload) => {
  const attribute = await loadAttributeOrThrow(id);

  const takenValues = new Set(attribute.values.map((v) => v.value.toLowerCase()));
  const takenSlugs = new Set(attribute.values.map((v) => v.slug));

  const values = resolveValues(
    attribute.type as AttributeTypeInput,
    payload.values,
    takenValues,
    takenSlugs,
  );

  await assertMediaExists(values.flatMap((v) => (v.mediaId ? [v.mediaId] : [])));

  await prisma.attributeValue.createMany({
    data: values.map((value) => ({ ...value, attributeId: id })),
  });

  return getAttributeById(id);
};

const updateValue = async (id: string, valueId: string, payload: IUpdateValuePayload) => {
  const attribute = await loadAttributeOrThrow(id);

  const current = await prisma.attributeValue.findFirst({
    where: { id: valueId, attributeId: id },
    select: { id: true, value: true, slug: true, colorCode: true, mediaId: true },
  });

  if (!current) {
    throw new AppError(StatusCodes.NOT_FOUND, "Attribute value not found on this attribute.");
  }

  const nextValue = payload.value?.trim() ?? current.value;
  const nextColor = payload.colorCode === undefined ? current.colorCode : payload.colorCode;
  const nextMedia = payload.mediaId === undefined ? current.mediaId : payload.mediaId;

  assertReferenceMatchesType(attribute.type as AttributeTypeInput, {
    value: nextValue,
    colorCode: nextColor,
    mediaId: nextMedia,
  });

  if (nextMedia) await assertMediaExists([nextMedia]);

  const clash = attribute.values.find(
    (v) => v.id !== valueId && v.value.toLowerCase() === nextValue.toLowerCase(),
  );

  if (clash) {
    throw new AppError(StatusCodes.CONFLICT, `"${nextValue}" already exists on this attribute.`, [
      { path: "value", message: "Values must be unique within an attribute." },
    ]);
  }

  const nextSlug = payload.slug ?? (payload.value ? toSlug(nextValue) : current.slug);
  const slugClash = attribute.values.find((v) => v.id !== valueId && v.slug === nextSlug);

  if (slugClash) {
    throw new AppError(StatusCodes.CONFLICT, `The slug "${nextSlug}" already exists on this attribute.`, [
      { path: "slug", message: "Value slugs must be unique within an attribute." },
    ]);
  }

  await prisma.attributeValue.update({
    where: { id: valueId },
    data: {
      value: nextValue,
      slug: nextSlug,
      colorCode: nextColor,
      mediaId: nextMedia,
      sortOrder: payload.sortOrder,
    },
  });

  return prisma.attributeValue.findUniqueOrThrow({
    where: { id: valueId },
    select: attributeValueSelect,
  });
};

const deleteValue = async (id: string, valueId: string) => {
  const value = await prisma.attributeValue.findFirst({
    where: { id: valueId, attributeId: id },
    select: { id: true, value: true },
  });

  if (!value) {
    throw new AppError(StatusCodes.NOT_FOUND, "Attribute value not found on this attribute.");
  }

  await prisma.attributeValue.delete({ where: { id: valueId } });

  return { id: value.id, value: value.value };
};

export const AttributeService = {
  createAttribute,
  getAttributes,
  getAttributeById,
  updateAttribute,
  deleteAttribute,
  addValues,
  updateValue,
  deleteValue,
};
