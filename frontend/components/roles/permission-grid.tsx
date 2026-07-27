"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PermissionGroup } from "@/hooks/use-permissions";
import { STANDARD_ACTIONS } from "@/lib/permissions";

type CheckedState = boolean | "indeterminate";

const stateFor = (total: number, selected: number): CheckedState => {
  if (total === 0 || selected === 0) return false;
  return selected === total ? true : "indeterminate";
};

export const PermissionGrid = ({
  groups,
  selectedIds,
  onChange,
  disabled = false,
}: {
  groups: PermissionGroup[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) => {
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  /** Standard actions keep their documented order; custom ones follow, sorted. */
  const columns = useMemo(() => {
    const present = new Set(groups.flatMap((g) => g.permissions.map((p) => p.action)));
    const standard = STANDARD_ACTIONS.filter((action) => present.has(action));
    const custom = [...present].filter((action) => !STANDARD_ACTIONS.includes(action as never)).sort();
    return [...standard, ...custom];
  }, [groups]);

  const allIds = useMemo(
    () => groups.flatMap((group) => group.permissions.map((permission) => permission.id)),
    [groups],
  );

  const setMany = (ids: string[], checked: boolean) => {
    const next = new Set(selected);
    for (const id of ids) {
      if (checked) next.add(id);
      else next.delete(id);
    }
    onChange([...next]);
  };

  const idsForColumn = (action: string) =>
    groups.flatMap((group) =>
      group.permissions.filter((p) => p.action === action).map((p) => p.id),
    );

  const selectedCount = allIds.filter((id) => selected.has(id)).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{selectedCount}</span> of {allIds.length}{" "}
          permissions selected
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || selectedCount === allIds.length}
            onClick={() => onChange(allIds)}
          >
            Select all
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || selectedCount === 0}
            onClick={() => onChange([])}
          >
            Clear all
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-44 align-bottom">
                <label className="flex h-10 cursor-pointer items-end gap-2">
                  <Checkbox
                    checked={stateFor(allIds.length, selectedCount)}
                    disabled={disabled}
                    onCheckedChange={(checked) => setMany(allIds, checked === true)}
                    aria-label="Select every permission"
                    className="mb-0.5"
                  />
                  <span>Module</span>
                </label>
              </TableHead>

              {columns.map((action) => {
                const columnIds = idsForColumn(action);
                const columnSelected = columnIds.filter((id) => selected.has(id)).length;

                return (
                  <TableHead key={action} className="align-bottom">
                    {/* Fixed height so every column's box sits on the same line,
                        whatever the label length. */}
                    <label className="flex h-10 cursor-pointer flex-col items-center justify-end gap-1.5">
                      <Checkbox
                        checked={stateFor(columnIds.length, columnSelected)}
                        disabled={disabled}
                        onCheckedChange={(checked) => setMany(columnIds, checked === true)}
                        aria-label={`Select ${action} for every module`}
                      />
                      <span className="text-xs font-normal capitalize leading-none">{action}</span>
                    </label>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {groups.map((group) => {
              const rowIds = group.permissions.map((permission) => permission.id);
              const rowSelected = rowIds.filter((id) => selected.has(id)).length;
              const byAction = new Map(group.permissions.map((p) => [p.action, p]));

              return (
                <TableRow key={group.id}>
                  <TableCell>
                    <label className="flex cursor-pointer items-center gap-2">
                      <Checkbox
                        checked={stateFor(rowIds.length, rowSelected)}
                        disabled={disabled}
                        onCheckedChange={(checked) => setMany(rowIds, checked === true)}
                        aria-label={`Select every permission in ${group.name}`}
                      />
                      <span className="font-medium">{group.name}</span>
                    </label>
                  </TableCell>

                  {columns.map((action) => {
                    const permission = byAction.get(action);

                    return (
                      <TableCell key={action}>
                        <div className="flex justify-center">
                          {permission ? (
                            <Checkbox
                              checked={selected.has(permission.id)}
                              disabled={disabled}
                              onCheckedChange={(checked) =>
                                setMany([permission.id], checked === true)
                              }
                              aria-label={permission.name}
                            />
                          ) : (
                            <span
                              className="text-muted-foreground/30"
                              title={`This module has no "${action}" action`}
                            >
                              —
                            </span>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
