"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";

import { MediaPicker } from "@/components/shared/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AttributeType } from "@/hooks/use-attributes";
import { requiresColor, requiresMedia } from "@/hooks/use-attributes";
import type { MediaAsset } from "@/hooks/use-media";
import { useState } from "react";

export interface DraftValue {
  key: string;
  value: string;
  colorCode: string;
  media: MediaAsset | null;
  mediaId: string | null;
  mediaThumb: string | null;
}

export const emptyDraft = (): DraftValue => ({
  key: crypto.randomUUID(),
  value: "",
  colorCode: "#4F46E5",
  media: null,
  mediaId: null,
  mediaThumb: null,
});

/**
 * One value row. Which extra field appears is driven by the attribute type,
 * because the server requires a hex on colour swatches and a media reference on
 * image swatches, and rejects either on the other types.
 */
export const ValueRow = ({
  draft,
  type,
  onChange,
  onRemove,
  disabled = false,
  showLabels = false,
}: {
  draft: DraftValue;
  type: AttributeType;
  onChange: (next: DraftValue) => void;
  onRemove: () => void;
  disabled?: boolean;
  showLabels?: boolean;
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border p-2">
      <div className="min-w-40 flex-1 space-y-1">
        {showLabels ? <Label className="text-xs">Value</Label> : null}
        <Input
          value={draft.value}
          placeholder="Red"
          disabled={disabled}
          onChange={(event) => onChange({ ...draft, value: event.target.value })}
          aria-label="Value"
        />
      </div>

      {requiresColor(type) ? (
        <div className="space-y-1">
          {showLabels ? <Label className="text-xs">Colour</Label> : null}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={draft.colorCode}
              disabled={disabled}
              onChange={(event) => onChange({ ...draft, colorCode: event.target.value })}
              aria-label="Pick a colour"
              className="size-9 cursor-pointer rounded border bg-transparent p-0.5"
            />
            <Input
              value={draft.colorCode}
              disabled={disabled}
              onChange={(event) => onChange({ ...draft, colorCode: event.target.value })}
              className="w-28 font-mono text-xs uppercase"
              aria-label="Hex colour"
            />
          </div>
        </div>
      ) : null}

      {requiresMedia(type) ? (
        <div className="space-y-1">
          {showLabels ? <Label className="text-xs">Image</Label> : null}
          <div className="flex items-center gap-2">
            {draft.mediaThumb ? (
              <div className="relative size-9 overflow-hidden rounded border bg-muted">
                <Image src={draft.mediaThumb} alt={draft.value} fill sizes="36px" className="object-cover" />
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => setPickerOpen(true)}
            >
              {draft.mediaId ? "Replace" : "Choose image"}
            </Button>
          </div>

          <MediaPicker
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            onConfirm={(assets) => {
              const asset = assets[0];
              if (!asset) return;
              onChange({
                ...draft,
                media: asset,
                mediaId: asset.id,
                mediaThumb: asset.thumbnailUrl ?? asset.url,
              });
            }}
          />
        </div>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${draft.value || "value"}`}
      >
        <Trash2 className="size-4 text-destructive" aria-hidden />
      </Button>
    </div>
  );
};

/** Turns a row into the shape the API expects for the current type. */
export const draftToPayload = (draft: DraftValue, type: AttributeType) => ({
  value: draft.value.trim(),
  colorCode: requiresColor(type) ? draft.colorCode : undefined,
  mediaId: requiresMedia(type) ? draft.mediaId : undefined,
});
