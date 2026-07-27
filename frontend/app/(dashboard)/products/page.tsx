"use client";

import { ImageOff, Pencil, Plus, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataState } from "@/components/shared/data-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { PermissionGate } from "@/components/shared/permission-gate";
import { SearchInput } from "@/components/shared/search-input";
import { SortableHeader } from "@/components/shared/sortable-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBrands } from "@/hooks/use-brands";
import { flattenTree, useCategoryTree } from "@/hooks/use-categories";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  priceLabel,
  STOCK_STATUS_LABELS,
  useDeleteProduct,
  useProducts,
  type ProductRow,
  type StockStatus,
} from "@/hooks/use-products";
import { errorMessage } from "@/lib/form-errors";

const ALL = "all";

const stockVariant = (status: StockStatus | null) => {
  if (status === "OUT_OF_STOCK") return "destructive" as const;
  if (status === "LOW_STOCK") return "secondary" as const;
  return "outline" as const;
};

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(ALL);
  const [brandId, setBrandId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [stockStatus, setStockStatus] = useState(ALL);
  const [kind, setKind] = useState(ALL);
  const [sort, setSort] = useState("-createdAt");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [deleting, setDeleting] = useState<ProductRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const categoryTree = useCategoryTree();
  const brandsQuery = useBrands({ limit: 100 });

  const query = useProducts({
    page,
    limit,
    sort: sort || undefined,
    searchTerm: debouncedSearch || undefined,
    categoryId: categoryId === ALL ? undefined : categoryId,
    brandId: brandId === ALL ? undefined : brandId,
    isActive: status === ALL ? undefined : status,
    stockStatus: stockStatus === ALL ? undefined : stockStatus,
    hasVariants: kind === ALL ? undefined : kind,
  });

  const deleteProduct = useDeleteProduct();

  const products = query.data?.data ?? [];
  const categories = flattenTree(categoryTree.data ?? []);
  const brands = brandsQuery.data?.data ?? [];

  const resetPage = () => setPage(1);

  const hasFilters =
    Boolean(debouncedSearch) ||
    categoryId !== ALL ||
    brandId !== ALL ||
    status !== ALL ||
    stockStatus !== ALL ||
    kind !== ALL;

  const clearFilters = () => {
    setSearch("");
    setCategoryId(ALL);
    setBrandId(ALL);
    setStatus(ALL);
    setStockStatus(ALL);
    setKind(ALL);
    resetPage();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);

    try {
      const result = await deleteProduct.mutateAsync(deleting.id);
      toast.success(
        `"${result.name}" deleted. ${result.deletedVariants} variant(s) removed; media assets kept.`,
      );
      setDeleting(null);
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Simple products carry their own price and stock; variable ones carry them on each variant."
        actions={
          <PermissionGate permission="product:create">
            <Button asChild>
              <Link href="/products/new">
                <Plus className="size-4" aria-hidden />
                New product
              </Link>
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                resetPage();
              }}
              placeholder="Search name or SKU…"
              className="sm:col-span-2 lg:col-span-3 xl:col-span-1"
            />

            <Select
              value={categoryId}
              onValueChange={(value) => {
                setCategoryId(value);
                resetPage();
              }}
            >
              <SelectTrigger aria-label="Filter by category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {`${"— ".repeat(category.depth)}${category.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={brandId}
              onValueChange={(value) => {
                setBrandId(value);
                resetPage();
              }}
            >
              <SelectTrigger aria-label="Filter by brand">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All brands</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                resetPage();
              }}
            >
              <SelectTrigger aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={stockStatus}
              onValueChange={(value) => {
                setStockStatus(value);
                resetPage();
              }}
            >
              <SelectTrigger aria-label="Filter by stock">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All stock</SelectItem>
                <SelectItem value="IN_STOCK">In stock</SelectItem>
                <SelectItem value="LOW_STOCK">Low stock</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Out of stock</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={kind}
              onValueChange={(value) => {
                setKind(value);
                resetPage();
              }}
            >
              <SelectTrigger aria-label="Filter by product kind">
                <SelectValue placeholder="Kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Simple and variable</SelectItem>
                <SelectItem value="false">Simple only</SelectItem>
                <SelectItem value="true">Variable only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasFilters ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {query.data?.meta.total ?? 0} match
                {(query.data?.meta.total ?? 0) === 1 ? "" : "es"}
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          ) : null}

          <DataState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={products.length === 0}
            emptyTitle={hasFilters ? "No products match those filters" : "No products yet"}
            emptyDescription={
              hasFilters
                ? "Try a different term, or clear the filters."
                : "Create a product to fill the catalog."
            }
            onRetry={() => void query.refetch()}
            loadingColumns={6}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Image</TableHead>
                    <SortableHeader field="name" label="Name" sort={sort} onSortChange={setSort} />
                    <TableHead>Brand</TableHead>
                    <TableHead>Categories</TableHead>
                    <SortableHeader
                      field="price"
                      label="Price"
                      sort={sort}
                      onSortChange={setSort}
                      className="text-right"
                    />
                    <SortableHeader
                      field="stock"
                      label="Stock"
                      sort={sort}
                      onSortChange={setSort}
                    />
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="relative size-11 overflow-hidden rounded border bg-muted">
                          {product.thumbnail ? (
                            <Image
                              src={product.thumbnail.thumbnailUrl ?? product.thumbnail.url}
                              alt={product.thumbnail.altText ?? product.name}
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              <ImageOff className="size-4 text-muted-foreground" aria-hidden />
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{product.name}</span>
                          {product.isFeatured ? (
                            <Star
                              className="size-3.5 fill-amber-400 text-amber-400"
                              aria-label="Featured"
                            />
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-muted-foreground">{product.sku}</code>
                          {product.hasVariants ? (
                            <Badge variant="outline" className="text-[10px]">
                              {product.variantCount} variant
                              {product.variantCount === 1 ? "" : "s"}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell className="text-sm">
                        {product.brand?.name ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {product.categories.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {product.categories.slice(0, 3).map((category) => (
                              <Badge key={category.id} variant="secondary" className="text-[10px]">
                                {category.name}
                              </Badge>
                            ))}
                            {product.categories.length > 3 ? (
                              <span className="text-xs text-muted-foreground">
                                +{product.categories.length - 3}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                        {priceLabel(product)}
                        {!product.hasVariants && product.salePrice !== null ? (
                          <div className="text-xs text-muted-foreground line-through">
                            {product.price?.toFixed(2)}
                          </div>
                        ) : null}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-sm tabular-nums">{product.stock ?? "—"}</span>
                          {product.stockStatus ? (
                            <Badge variant={stockVariant(product.stockStatus)} className="text-[10px]">
                              {STOCK_STATUS_LABELS[product.stockStatus]}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant={product.isActive ? "default" : "secondary"}>
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <PermissionGate permission="product:update">
                            <Button variant="ghost" size="icon" asChild>
                              <Link
                                href={`/products/${product.id}/edit`}
                                aria-label={`Edit ${product.name}`}
                              >
                                <Pencil className="size-4" aria-hidden />
                              </Link>
                            </Button>
                          </PermissionGate>

                          <PermissionGate permission="product:delete">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleting(product);
                              }}
                              aria-label={`Delete ${product.name}`}
                            >
                              <Trash2 className="size-4 text-destructive" aria-hidden />
                            </Button>
                          </PermissionGate>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {query.data ? (
              <Pagination
                meta={query.data.meta}
                onPageChange={setPage}
                onLimitChange={(next) => {
                  setLimit(next);
                  resetPage();
                }}
              />
            ) : null}
          </DataState>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
        title={`Delete "${deleting?.name}"?`}
        description={
          deleting?.hasVariants
            ? `Its ${deleting.variantCount} variant(s) and media attachments go with it. The media assets themselves are kept, because other products may use them.`
            : "Media attachments go with it, but the media assets themselves are kept."
        }
        confirmLabel="Delete product"
        destructive
        isPending={deleteProduct.isPending}
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
