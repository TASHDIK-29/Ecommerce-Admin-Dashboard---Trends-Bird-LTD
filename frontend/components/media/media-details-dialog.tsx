"use client";

import { Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { PermissionGate } from "@/components/shared/permission-gate";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteMedia, useUpdateMedia, type MediaAsset } from "@/hooks/use-media";
import { ApiError } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";
import { formatBytes } from "@/lib/upload";

const DetailsForm = ({ asset, onClose }: { asset: MediaAsset; onClose: () => void }) => {
  const updateMedia = useUpdateMedia();
  const deleteMedia = useDeleteMedia();

  const [altText, setAltText] = useState(asset.altText ?? "");
  const [title, setTitle] = useState(asset.title ?? "");
  const [error, setError] = useState<string | null>(null);
  const [attachedCount, setAttachedCount] = useState<number | null>(null);

  const save = async () => {
    setError(null);
    try {
      await updateMedia.mutateAsync({
        id: asset.id,
        payload: { altText: altText || null, title: title || null },
      });
      toast.success("Details saved.");
      onClose();
    } catch (saveError) {
      setError(errorMessage(saveError));
    }
  };

  const remove = async (force: boolean) => {
    setError(null);
    try {
      const result = await deleteMedia.mutateAsync({ id: asset.id, force });
      toast.success(
        result.detached > 0
          ? `Deleted and detached from ${result.detached} record(s).`
          : "Asset deleted.",
      );
      onClose();
    } catch (deleteError) {
      // A 409 means it is still attached; the server offers ?force=true to
      // detach cleanly, so surface that as an explicit second step.
      if (deleteError instanceof ApiError && deleteError.isConflict) {
        const match = /attached to (\d+)/.exec(deleteError.message);
        setAttachedCount(match ? Number(match[1]) : 1);
      }
      setError(errorMessage(deleteError));
    }
  };

  const isPending = updateMedia.isPending || deleteMedia.isPending;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <div className="relative aspect-square overflow-hidden rounded-md border bg-muted">
          {asset.type === "IMAGE" ? (
            <Image
              src={asset.thumbnailUrl ?? asset.url}
              alt={asset.altText ?? asset.fileName}
              fill
              sizes="200px"
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
              Video
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="altText">Alt text</Label>
            <Input
              id="altText"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              placeholder="Describes the image for screen readers"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Shown in the library"
            />
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <dt>File</dt>
            <dd className="truncate text-foreground" title={asset.fileName}>
              {asset.fileName}
            </dd>
            <dt>Type</dt>
            <dd className="text-foreground">{asset.mimeType}</dd>
            <dt>Size</dt>
            <dd className="text-foreground">{formatBytes(asset.size)}</dd>
            {asset.width && asset.height ? (
              <>
                <dt>Dimensions</dt>
                <dd className="text-foreground">
                  {asset.width}×{asset.height}
                </dd>
              </>
            ) : null}
            {asset.uploadedBy ? (
              <>
                <dt>Uploaded by</dt>
                <dd className="truncate text-foreground">{asset.uploadedBy.name}</dd>
              </>
            ) : null}
          </dl>

          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs text-primary underline underline-offset-2"
          >
            Open original
          </a>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter className="sm:justify-between">
        <PermissionGate permission="media:delete">
          {attachedCount === null ? (
            <Button variant="outline" onClick={() => remove(false)} disabled={isPending}>
              <Trash2 className="size-4 text-destructive" aria-hidden />
              Delete
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => remove(true)} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Detach from {attachedCount} and delete
            </Button>
          )}
        </PermissionGate>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Close
          </Button>
          <PermissionGate permission="media:write">
            <Button onClick={save} disabled={isPending}>
              {updateMedia.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Save
            </Button>
          </PermissionGate>
        </div>
      </DialogFooter>
    </>
  );
};

export const MediaDetailsDialog = ({
  asset,
  onOpenChange,
}: {
  asset: MediaAsset | null;
  onOpenChange: (open: boolean) => void;
}) => (
  <Dialog open={Boolean(asset)} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Media details</DialogTitle>
        <DialogDescription>Edit the alt text and title, or delete the asset.</DialogDescription>
      </DialogHeader>

      {asset ? (
        <DetailsForm key={asset.id} asset={asset} onClose={() => onOpenChange(false)} />
      ) : null}
    </DialogContent>
  </Dialog>
);
