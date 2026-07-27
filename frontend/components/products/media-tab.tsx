"use client";

import { ArrowDown, ArrowUp, ImagePlus, Star, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { MediaPicker } from "@/components/shared/media-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { MediaAsset } from "@/hooks/use-media";
import {
  useAttachMedia,
  useDetachMedia,
  useReorderMedia,
  useUpdateAttachment,
  type MediaAttachment,
} from "@/hooks/use-products";
import { errorMessage } from "@/lib/form-errors";
import { cn } from "@/lib/utils";

export interface DraftAttachment {
  key: string;
  mediaId: string;
  fileName: string;
  previewUrl: string;
  isThumbnail: boolean;
  isGallery: boolean;
}

export const toDraftAttachment = (asset: MediaAsset, isThumbnail: boolean): DraftAttachment => ({
  key: crypto.randomUUID(),
  mediaId: asset.id,
  fileName: asset.fileName,
  previewUrl: asset.thumbnailUrl ?? asset.url,
  isThumbnail,
  isGallery: true,
});

const Row = ({
  previewUrl,
  fileName,
  isThumbnail,
  isGallery,
  disabled,
  canMoveUp,
  canMoveDown,
  onSetThumbnail,
  onToggleGallery,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  previewUrl: string;
  fileName: string;
  isThumbnail: boolean;
  isGallery: boolean;
  disabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSetThumbnail: () => void;
  onToggleGallery: (next: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) => (
  <li
    className={cn(
      "flex flex-wrap items-center gap-3 rounded-md border p-2",
      isThumbnail && "border-primary/60 bg-primary/5",
    )}
  >
    <div className="relative size-14 shrink-0 overflow-hidden rounded border bg-muted">
      <Image src={previewUrl} alt={fileName} fill sizes="56px" className="object-cover" />
    </div>

    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium">{fileName}</p>
      {isThumbnail ? (
        <Badge className="mt-0.5 text-[10px]">Thumbnail</Badge>
      ) : (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          disabled={disabled}
          onClick={onSetThumbnail}
        >
          <Star className="size-3" aria-hidden />
          Make thumbnail
        </Button>
      )}
    </div>

    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      Gallery
      <Switch
        checked={isGallery}
        onCheckedChange={onToggleGallery}
        disabled={disabled}
        aria-label="Show in gallery"
      />
    </label>

    <div className="flex gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || !canMoveUp}
        onClick={onMoveUp}
        aria-label="Move earlier"
      >
        <ArrowUp className="size-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || !canMoveDown}
        onClick={onMoveDown}
        aria-label="Move later"
      >
        <ArrowDown className="size-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={onRemove}
        aria-label={`Remove ${fileName}`}
      >
        <X className="size-4 text-destructive" aria-hidden />
      </Button>
    </div>
  </li>
);

const Empty = () => (
  <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
    No media attached yet.
  </p>
);

/** Before the product exists, attachments are held locally and sent with the create. */
const DraftMedia = ({
  drafts,
  onChange,
  disabled,
}: {
  drafts: DraftAttachment[];
  onChange: (next: DraftAttachment[]) => void;
  disabled: boolean;
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  const move = (index: number, offset: number) => {
    const next = [...drafts];
    const target = index + offset;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" disabled={disabled} onClick={() => setPickerOpen(true)}>
        <ImagePlus className="size-4" aria-hidden />
        Attach from library
      </Button>

      {drafts.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-2">
          {drafts.map((draft, index) => (
            <Row
              key={draft.key}
              previewUrl={draft.previewUrl}
              fileName={draft.fileName}
              isThumbnail={draft.isThumbnail}
              isGallery={draft.isGallery}
              disabled={disabled}
              canMoveUp={index > 0}
              canMoveDown={index < drafts.length - 1}
              onSetThumbnail={() =>
                onChange(drafts.map((item) => ({ ...item, isThumbnail: item.key === draft.key })))
              }
              onToggleGallery={(next) =>
                onChange(
                  drafts.map((item) =>
                    item.key === draft.key ? { ...item, isGallery: next } : item,
                  ),
                )
              }
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
              onRemove={() => {
                const remaining = drafts.filter((item) => item.key !== draft.key);
                // Never leave a product with attachments but no thumbnail.
                if (draft.isThumbnail && remaining.length > 0) remaining[0].isThumbnail = true;
                onChange(remaining);
              }}
            />
          ))}
        </ul>
      )}

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        multiple
        onConfirm={(assets) => {
          const additions = assets
            .filter((asset) => !drafts.some((draft) => draft.mediaId === asset.id))
            .map((asset, index) => toDraftAttachment(asset, drafts.length === 0 && index === 0));
          onChange([...drafts, ...additions]);
        }}
      />
    </div>
  );
};

/** Once the product exists, every action is its own request against the nested routes. */
const LiveMedia = ({
  productId,
  attachments,
  disabled,
}: {
  productId: string;
  attachments: MediaAttachment[];
  disabled: boolean;
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const attachMedia = useAttachMedia();
  const updateAttachment = useUpdateAttachment();
  const reorderMedia = useReorderMedia();
  const detachMedia = useDetachMedia();

  const productLevel = attachments
    .filter((attachment) => !attachment.variantId && !attachment.attributeValueId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const isPending =
    attachMedia.isPending ||
    updateAttachment.isPending ||
    reorderMedia.isPending ||
    detachMedia.isPending;

  const busy = disabled || isPending;

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const move = async (index: number, offset: number) => {
    const next = [...productLevel];
    const target = index + offset;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    await run(
      () =>
        reorderMedia.mutateAsync({
          id: productId,
          order: next.map((attachment, position) => ({
            attachmentId: attachment.id,
            sortOrder: position,
          })),
        }),
      "Gallery reordered.",
    );
  };

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" disabled={busy} onClick={() => setPickerOpen(true)}>
        <ImagePlus className="size-4" aria-hidden />
        Attach from library
      </Button>

      {productLevel.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-2">
          {productLevel.map((attachment, index) => (
            <Row
              key={attachment.id}
              previewUrl={attachment.media.thumbnailUrl ?? attachment.media.url}
              fileName={attachment.media.title ?? attachment.media.altText ?? "Image"}
              isThumbnail={attachment.isThumbnail}
              isGallery={attachment.isGallery}
              disabled={busy}
              canMoveUp={index > 0}
              canMoveDown={index < productLevel.length - 1}
              onSetThumbnail={() =>
                void run(
                  () =>
                    updateAttachment.mutateAsync({
                      id: productId,
                      attachmentId: attachment.id,
                      payload: { isThumbnail: true },
                    }),
                  "Thumbnail updated. The previous one was demoted.",
                )
              }
              onToggleGallery={(next) =>
                void run(
                  () =>
                    updateAttachment.mutateAsync({
                      id: productId,
                      attachmentId: attachment.id,
                      payload: { isGallery: next },
                    }),
                  next ? "Added to the gallery." : "Removed from the gallery.",
                )
              }
              onMoveUp={() => void move(index, -1)}
              onMoveDown={() => void move(index, 1)}
              onRemove={() =>
                void run(
                  () =>
                    detachMedia.mutateAsync({ id: productId, attachmentId: attachment.id }),
                  "Detached. The library asset was kept.",
                )
              }
            />
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Exactly one thumbnail per product — setting a new one demotes the previous. Detaching
        removes the link, never the library asset.
      </p>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        multiple
        onConfirm={(assets) => {
          const existing = new Set(productLevel.map((attachment) => attachment.mediaId));
          const additions = assets.filter((asset) => !existing.has(asset.id));
          if (additions.length === 0) return;

          void run(
            () =>
              attachMedia.mutateAsync({
                id: productId,
                attachments: additions.map((asset, index) => ({
                  mediaId: asset.id,
                  isThumbnail: productLevel.length === 0 && index === 0,
                  isGallery: true,
                  sortOrder: productLevel.length + index,
                })),
              }),
            `${additions.length} image(s) attached.`,
          );
        }}
      />
    </div>
  );
};

export const MediaTab = ({
  productId,
  attachments,
  drafts,
  onDraftsChange,
  disabled,
}: {
  productId?: string;
  attachments?: MediaAttachment[];
  drafts: DraftAttachment[];
  onDraftsChange: (next: DraftAttachment[]) => void;
  disabled: boolean;
}) =>
  productId ? (
    <LiveMedia productId={productId} attachments={attachments ?? []} disabled={disabled} />
  ) : (
    <DraftMedia drafts={drafts} onChange={onDraftsChange} disabled={disabled} />
  );
