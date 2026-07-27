import { StatusCodes } from "http-status-codes";

import { prisma } from "../../config/prisma";
import { AppError } from "../../error/AppError";
import { buildListQuery, buildMeta } from "../../utils/buildListQuery";
import { generateUniqueSlug } from "../../utils/slug";
import { brandSearchableFields, brandSelect, brandSortableFields } from "./brand.constant";
import type {
  IBrandListQuery,
  ICreateBrandPayload,
  IUpdateBrandPayload,
} from "./brand.interface";

const assertNameAvailable = async (name: string, excludeId?: string): Promise<void> => {
  const existing = await prisma.brand.findUnique({ where: { name }, select: { id: true } });
  if (!existing || existing.id === excludeId) return;

  throw new AppError(StatusCodes.CONFLICT, `A brand named "${name}" already exists.`, [
    { path: "name", message: "This brand name is already taken." },
  ]);
};

const assertSlugAvailable = async (slug: string, excludeId?: string): Promise<void> => {
  const existing = await prisma.brand.findUnique({ where: { slug }, select: { id: true } });
  if (!existing || existing.id === excludeId) return;

  throw new AppError(StatusCodes.CONFLICT, `A brand with the slug "${slug}" already exists.`, [
    { path: "slug", message: "This slug is already taken." },
  ]);
};

const assertLogoExists = async (logoId: string): Promise<void> => {
  const logo = await prisma.media.findUnique({ where: { id: logoId }, select: { id: true } });
  if (logo) return;

  throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "The selected logo does not exist.", [
    { path: "logoId", message: "No media with this id." },
  ]);
};

const createBrand = async (payload: ICreateBrandPayload) => {
  await assertNameAvailable(payload.name);

  const slug = payload.slug
    ? payload.slug
    : await generateUniqueSlug(payload.name, async (candidate) =>
        Boolean(await prisma.brand.findUnique({ where: { slug: candidate }, select: { id: true } })),
      );

  await assertSlugAvailable(slug);

  if (payload.logoId) await assertLogoExists(payload.logoId);

  return prisma.brand.create({
    data: {
      name: payload.name,
      slug,
      description: payload.description,
      logoId: payload.logoId ?? null,
      status: payload.status ?? "ACTIVE",
    },
    select: brandSelect,
  });
};

const getBrands = async (query: IBrandListQuery) => {
  const { where, orderBy, skip, take, page, limit } = buildListQuery(query, {
    searchableFields: brandSearchableFields,
    sortableFields: brandSortableFields,
    filters: { status: { type: "enum", values: ["ACTIVE", "INACTIVE"] } },
    defaultSort: { name: "asc" },
  });

  const [data, total] = await prisma.$transaction([
    prisma.brand.findMany({ where, orderBy, skip, take, select: brandSelect }),
    prisma.brand.count({ where }),
  ]);

  return { data, meta: buildMeta(total, page, limit) };
};

const getBrandById = async (id: string) => {
  const brand = await prisma.brand.findUnique({ where: { id }, select: brandSelect });

  if (!brand) {
    throw new AppError(StatusCodes.NOT_FOUND, "Brand not found.");
  }

  return brand;
};

const updateBrand = async (id: string, payload: IUpdateBrandPayload) => {
  const brand = await prisma.brand.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  });

  if (!brand) {
    throw new AppError(StatusCodes.NOT_FOUND, "Brand not found.");
  }

  if (payload.name && payload.name !== brand.name) {
    await assertNameAvailable(payload.name, id);
  }

  if (payload.slug && payload.slug !== brand.slug) {
    await assertSlugAvailable(payload.slug, id);
  }

  if (payload.logoId) await assertLogoExists(payload.logoId);

  return prisma.brand.update({
    where: { id },
    data: {
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      logoId: payload.logoId,
      status: payload.status,
    },
    select: brandSelect,
  });
};

const deleteBrand = async (id: string) => {
  const brand = await prisma.brand.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { products: true } } },
  });

  if (!brand) {
    throw new AppError(StatusCodes.NOT_FOUND, "Brand not found.");
  }

  if (brand._count.products > 0) {
    throw new AppError(
      StatusCodes.CONFLICT,
      `"${brand.name}" cannot be deleted while ${brand._count.products} product(s) reference it. Reassign or delete them first.`,
      [{ path: "id", message: `${brand._count.products} product(s) reference this brand.` }],
    );
  }

  await prisma.brand.delete({ where: { id } });

  return { id: brand.id, name: brand.name };
};

export const BrandService = {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
};
