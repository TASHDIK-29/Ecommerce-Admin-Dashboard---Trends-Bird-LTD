import crypto from "node:crypto";

import { StatusCodes } from "http-status-codes";

import { AppError } from "../../error/AppError";

export type StockStatusValue = "IN_STOCK" | "OUT_OF_STOCK" | "LOW_STOCK";

export const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  return Number(value);
};

export const combinationKeyFor = (attributeValueIds: string[]): string =>
  crypto.createHash("sha256").update([...attributeValueIds].sort().join("|")).digest("hex");

export const deriveStockStatus = (
  stock: number,
  lowStockThreshold?: number | null,
): StockStatusValue => {
  if (stock <= 0) return "OUT_OF_STOCK";
  if (lowStockThreshold !== null && lowStockThreshold !== undefined && stock <= lowStockThreshold) {
    return "LOW_STOCK";
  }
  return "IN_STOCK";
};

export const assertSalePriceBelowPrice = (
  price: number | null | undefined,
  salePrice: number | null | undefined,
  label: string,
): void => {
  if (price === null || price === undefined) return;
  if (salePrice === null || salePrice === undefined) return;

  if (salePrice > price) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      `${label}: the sale price cannot be higher than the price.`,
      [{ path: "salePrice", message: "Sale price must not exceed price." }],
    );
  }
};

export const priceRangeOf = (
  variants: { price: unknown; salePrice: unknown }[],
): { min: number; max: number } | null => {
  if (variants.length === 0) return null;

  const effective = variants.map((variant) => {
    const sale = toNumber(variant.salePrice);
    const price = toNumber(variant.price) ?? 0;
    return sale ?? price;
  });

  return { min: Math.min(...effective), max: Math.max(...effective) };
};
