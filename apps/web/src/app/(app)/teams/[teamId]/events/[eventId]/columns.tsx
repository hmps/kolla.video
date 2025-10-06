"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";

export type Clip = {
  id: number;
  name?: string | null;
  status: string;
  tags?: Array<{ id: number; tag: string }>;
};

function EditableNameCell({ clip, index }: { clip: Clip; index: number }) {
  const params = useParams<{ teamId: string; eventId: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(clip.name ?? "");
  const [optimisticName, setOptimisticName] = useState<string | null>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Sync local state when clip.name changes (after successful update)
  useEffect(() => {
    if (!isEditing && !optimisticName) {
      setName(clip.name ?? "");
    }
  }, [clip.name, isEditing, optimisticName]);

  const updateName = useMutation(
    trpc.clips.updateName.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.clips.byEvent.queryFilter({
            teamId: Number(params.teamId),
            eventId: Number(params.eventId),
          }),
        );
        setOptimisticName(null);
      },
      onError: () => {
        setOptimisticName(null);
      },
    }),
  );

  const handleSubmit = () => {
    if (name.trim() && name !== clip.name) {
      setOptimisticName(name.trim());
      updateName.mutate({
        teamId: Number(params.teamId),
        clipId: clip.id,
        name: name.trim(),
      });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setName(clip.name ?? "");
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSubmit}
        autoFocus
        className="h-7 font-medium w-auto min-w-32"
        style={{ width: `${Math.max(name.length, 8)}ch` }}
      />
    );
  }

  const displayName = optimisticName ?? clip.name ?? `Clip #${index + 1}`;

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="font-medium cursor-text hover:bg-accent/50 rounded px-2 -mx-2 py-1 text-left inline-block"
    >
      {displayName}
    </button>
  );
}

export const columns: ColumnDef<Clip>[] = [
  {
    id: "select",
    size: 20,
    maxSize: 20,
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const clip = row.original;
      const index = row.index;
      return <EditableNameCell clip={clip} index={index} />;
    },
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = row.getValue("tags") as
        | Array<{ id: number; tag: string }>
        | undefined;
      if (!tags || tags.length === 0) {
        return <span className="text-muted-foreground text-sm">No tags</span>;
      }
      return (
        <div className="flex gap-1">
          {tags.map((t) => (
            <Badge key={t.id} variant="outline">
              {t.tag}
            </Badge>
          ))}
        </div>
      );
    },
  },
];
