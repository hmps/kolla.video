"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, X } from "lucide-react";
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
        onClick={(e) => e.stopPropagation()}
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
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className="font-medium cursor-text hover:bg-accent/50 rounded px-2 -mx-2 py-1 text-left inline-block"
    >
      {displayName}
    </button>
  );
}

function EditableTagsCell({ clip }: { clip: Clip }) {
  const params = useParams<{ teamId: string; eventId: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [optimisticTags, setOptimisticTags] = useState<
    Array<{ id: number; tag: string }> | null
  >(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const currentTags = optimisticTags ?? clip.tags ?? [];

  const setTags = useMutation(
    trpc.clips.setTags.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.clips.byEvent.queryFilter({
            teamId: Number(params.teamId),
            eventId: Number(params.eventId),
          }),
        );
        setOptimisticTags(null);
      },
      onError: () => {
        setOptimisticTags(null);
      },
    }),
  );

  const addTags = (input: string) => {
    const newTagStrings = input
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (newTagStrings.length === 0) return;

    const existingTagStrings = currentTags.map((t) => t.tag);
    const allTagStrings = [...existingTagStrings, ...newTagStrings];

    // Create optimistic tags with negative IDs
    const optimisticNewTags = allTagStrings.map((tag, index) => ({
      id: -(index + 1),
      tag,
    }));

    setOptimisticTags(optimisticNewTags);
    setInputValue("");

    setTags.mutate({
      teamId: Number(params.teamId),
      clipId: clip.id,
      tags: allTagStrings,
    });
  };

  const removeTag = (tagToRemove: { id: number; tag: string }) => {
    const newTags = currentTags.filter((t) => t.tag !== tagToRemove.tag);
    setOptimisticTags(newTags);

    setTags.mutate({
      teamId: Number(params.teamId),
      clipId: clip.id,
      tags: newTags.map((t) => t.tag),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        addTags(inputValue);
      }
    } else if (e.key === "Backspace" && inputValue === "" && currentTags.length > 0) {
      e.preventDefault();
      const lastTag = currentTags[currentTags.length - 1];
      removeTag(lastTag);
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setInputValue("");
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {currentTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className="h-6 text-xs pl-2 pr-1 gap-1"
          >
            {tag.tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:bg-accent rounded-sm p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim()) {
              addTags(inputValue);
            }
            setIsEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          placeholder="Add tag..."
          className="h-6 text-xs w-auto min-w-24"
          style={{ width: `${Math.max(inputValue.length || 8, 8)}ch` }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className="flex gap-1 hover:bg-accent/50 rounded px-2 -mx-2 py-1"
    >
      {currentTags.map((tag) => (
        <Badge key={tag.id} variant="outline" className="h-6 text-xs">
          {tag.tag}
        </Badge>
      ))}
      <Badge
        variant="outline"
        className="h-6 text-xs px-1.5 text-muted-foreground"
      >
        <Plus className="h-3 w-3" />
      </Badge>
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
      const clip = row.original;
      return <EditableTagsCell clip={clip} />;
    },
  },
];
