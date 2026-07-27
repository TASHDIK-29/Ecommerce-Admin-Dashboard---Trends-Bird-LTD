"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { AttributeDialog } from "@/components/attributes/attribute-dialog";
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
import {
  ATTRIBUTE_TYPES,
  ATTRIBUTE_TYPE_LABELS,
  useAttributes,
  useDeleteAttribute,
  type Attribute,
} from "@/hooks/use-attributes";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { errorMessage } from "@/lib/form-errors";

const ALL = "all";

export default function AttributesPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState(ALL);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Attribute | null>(null);
  const [deleting, setDeleting] = useState<Attribute | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const query = useAttributes({
    page,
    limit,
    searchTerm: debouncedSearch || undefined,
    type: type === ALL ? undefined : type,
  });

  const deleteAttribute = useDeleteAttribute();
  const attributes = query.data?.data ?? [];

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);

    try {
      const result = await deleteAttribute.mutateAsync(deleting.id);
      toast.success(`"${result.name}" deleted with ${result.deletedValues} value(s).`);
      setDeleting(null);
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attributes"
        description="The dimensions a product varies along, and the values each can take."
        actions={
          <PermissionGate permission="attribute:create">
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              New attribute
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
              placeholder="Search attributes…"
            />

            <Select
              value={type}
              onValueChange={(value) => {
                setType(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                {ATTRIBUTE_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {ATTRIBUTE_TYPE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={attributes.length === 0}
            emptyTitle={
              debouncedSearch || type !== ALL
                ? "No attributes match those filters"
                : "No attributes yet"
            }
            emptyDescription={
              debouncedSearch || type !== ALL
                ? "Try a different term, or clear the filters."
                : "Create an attribute such as Colour or Size, then add its values."
            }
            onRetry={() => void query.refetch()}
            loadingColumns={4}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Values</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {attributes.map((attribute) => (
                    <TableRow key={attribute.id}>
                      <TableCell>
                        <div className="font-medium">{attribute.name}</div>
                        <code className="text-xs text-muted-foreground">{attribute.slug}</code>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary">
                          {ATTRIBUTE_TYPE_LABELS[attribute.type]}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {attribute.values.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No values</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {attribute.values.slice(0, 8).map((value) => (
                              <span
                                key={value.id}
                                className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs"
                              >
                                {value.colorCode ? (
                                  <span
                                    className="size-3 rounded-full border"
                                    style={{ backgroundColor: value.colorCode }}
                                    aria-hidden
                                  />
                                ) : null}
                                {value.media ? (
                                  <span className="relative size-4 overflow-hidden rounded-sm">
                                    <Image
                                      src={value.media.thumbnailUrl ?? value.media.url}
                                      alt=""
                                      fill
                                      sizes="16px"
                                      className="object-cover"
                                    />
                                  </span>
                                ) : null}
                                {value.value}
                              </span>
                            ))}
                            {attribute.values.length > 8 ? (
                              <span className="text-xs text-muted-foreground">
                                +{attribute.values.length - 8} more
                              </span>
                            ) : null}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <PermissionGate permission="attribute:update">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditing(attribute);
                                setDialogOpen(true);
                              }}
                              aria-label={`Edit ${attribute.name}`}
                            >
                              <Pencil className="size-4" aria-hidden />
                            </Button>
                          </PermissionGate>

                          <PermissionGate permission="attribute:delete">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleting(attribute);
                              }}
                              aria-label={`Delete ${attribute.name}`}
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

      <AttributeDialog open={dialogOpen} onOpenChange={setDialogOpen} attribute={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
        title={`Delete "${deleting?.name}"?`}
        description={`This deletes its ${deleting?.values.length ?? 0} value(s). If a product variant uses any of them, the server refuses rather than corrupting the variant.`}
        confirmLabel="Delete attribute"
        destructive
        isPending={deleteAttribute.isPending}
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
