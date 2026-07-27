"use client";

import { ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { BrandDialog } from "@/components/brands/brand-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataState } from "@/components/shared/data-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { PermissionGate } from "@/components/shared/permission-gate";
import { SearchInput } from "@/components/shared/search-input";
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
import { useBrands, useDeleteBrand, type Brand } from "@/hooks/use-brands";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { errorMessage } from "@/lib/form-errors";

const ALL = "all";

export default function BrandsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const query = useBrands({
    page,
    limit,
    searchTerm: debouncedSearch || undefined,
    status: status === ALL ? undefined : status,
  });

  const deleteBrand = useDeleteBrand();
  const brands = query.data?.data ?? [];

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);

    try {
      await deleteBrand.mutateAsync(deleting.id);
      toast.success(`"${deleting.name}" deleted.`);
      setDeleting(null);
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brands"
        description="The manufacturer or label a product belongs to."
        actions={
          <PermissionGate permission="brand:create">
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              New brand
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search brands…"
            />

            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={brands.length === 0}
            emptyTitle={
              debouncedSearch || status !== ALL
                ? "No brands match those filters"
                : "No brands yet"
            }
            emptyDescription={
              debouncedSearch || status !== ALL
                ? "Try a different term, or clear the filters."
                : "Create a brand to assign to products."
            }
            onRetry={() => void query.refetch()}
            loadingColumns={4}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Logo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {brands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell>
                        <div className="relative size-10 overflow-hidden rounded border bg-muted">
                          {brand.logo ? (
                            <Image
                              src={brand.logo.thumbnailUrl ?? brand.logo.url}
                              alt={brand.logo.altText ?? brand.name}
                              fill
                              sizes="40px"
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
                        <div className="font-medium">{brand.name}</div>
                        {brand.description ? (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {brand.description}
                          </p>
                        ) : null}
                      </TableCell>

                      <TableCell>
                        <code className="text-xs text-muted-foreground">{brand.slug}</code>
                      </TableCell>

                      <TableCell>
                        <Badge variant={brand.status === "ACTIVE" ? "default" : "secondary"}>
                          {brand.status === "ACTIVE" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <PermissionGate permission="brand:update">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditing(brand);
                                setDialogOpen(true);
                              }}
                              aria-label={`Edit ${brand.name}`}
                            >
                              <Pencil className="size-4" aria-hidden />
                            </Button>
                          </PermissionGate>

                          <PermissionGate permission="brand:delete">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleting(brand);
                              }}
                              aria-label={`Delete ${brand.name}`}
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
                  setPage(1);
                }}
              />
            ) : null}
          </DataState>
        </CardContent>
      </Card>

      <BrandDialog open={dialogOpen} onOpenChange={setDialogOpen} brand={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
        title={`Delete "${deleting?.name}"?`}
        description="If any product still references this brand, the server refuses the delete."
        confirmLabel="Delete brand"
        destructive
        isPending={deleteBrand.isPending}
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
