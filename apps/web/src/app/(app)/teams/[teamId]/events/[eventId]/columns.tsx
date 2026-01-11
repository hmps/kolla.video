"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Film, Plus, Scissors, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTRPC } from "@/trpc/client";
import {
  formatDuration,
  getMediaDuration,
  isSegment,
} from "@/types/media-item";

// MediaItem type for unified clip/segment handling
export type MediaItem = {
  type: "clip" | "segment";
  id: number;
  index: number;
  name?: string | null;
  // Clip-specific fields
  status?: string;
  durationS?: number | null;
  // Segment-specific fields
  startS?: number;
  endS?: number;
  clipId?: number;
  clip?: {
    id: number;
    status: string;
    durationS: number | null;
  };
  // Common fields
  tags?: Array<{ id: number; tag: string }>;
  comments?: Array<{ id: number }>;
};

function EditableNameCell({
  item,
  index,
  isCoach,
}: {
  item: MediaItem;
  index: number;
  isCoach: boolean;
}) {
  const params = useParams<{ teamId: string; eventId: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name ?? "");
  const [optimisticName, setOptimisticName] = useState<string | null>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const isSegmentItem = item.type === "segment";

  // Sync local state when item.name changes (after successful update)
  useEffect(() => {
    if (!isEditing && !optimisticName) {
      setName(item.name ?? "");
    }
  }, [item.name, isEditing, optimisticName]);

  const updateClipName = useMutation(
    trpc.clips.updateName.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.clips.mediaByEvent.queryFilter({
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

  const updateSegmentName = useMutation(
    trpc.segments.updateName.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.clips.mediaByEvent.queryFilter({
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
    if (name.trim() && name !== item.name) {
      setOptimisticName(name.trim());
      if (isSegmentItem) {
        updateSegmentName.mutate({
          teamId: Number(params.teamId),
          segmentId: item.id,
          name: name.trim(),
        });
      } else {
        updateClipName.mutate({
          teamId: Number(params.teamId),
          clipId: item.id,
          name: name.trim(),
        });
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setName(item.name ?? "");
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

  const defaultName = isSegmentItem
    ? `Segment #${index + 1}`
    : `Clip #${index + 1}`;
  const displayName = optimisticName ?? item.name ?? defaultName;

  if (!isCoach) {
    return (
      <span className="font-medium px-2 -mx-2 py-1 text-left inline-block">
        {displayName}
      </span>
    );
  }

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

function EditableTagsCell({
  item,
  isCoach,
}: {
  item: MediaItem;
  isCoach: boolean;
}) {
  const params = useParams<{ teamId: string; eventId: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [optimisticTags, setOptimisticTags] = useState<Array<{
    id: number;
    tag: string;
  }> | null>(null);
  const shouldPreventBlurRef = useRef(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const isSegmentItem = item.type === "segment";
  const currentTags = optimisticTags ?? item.tags ?? [];

  const setClipTags = useMutation(
    trpc.clips.setTags.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.clips.mediaByEvent.queryFilter({
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

  const setSegmentTags = useMutation(
    trpc.segments.setTags.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.clips.mediaByEvent.queryFilter({
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

    const existingTagStrings = new Set(currentTags.map((t) => t.tag));

    // Filter out duplicates - only add tags that don't already exist
    const uniqueNewTags = newTagStrings.filter(
      (tag) => !existingTagStrings.has(tag),
    );

    if (uniqueNewTags.length === 0) {
      setInputValue("");
      return;
    }

    const allTagStrings = [...currentTags.map((t) => t.tag), ...uniqueNewTags];

    // Create optimistic tags with negative IDs
    const optimisticNewTags = allTagStrings.map((tag, index) => ({
      id: -(index + 1),
      tag,
    }));

    setOptimisticTags(optimisticNewTags);
    setInputValue("");

    if (isSegmentItem) {
      setSegmentTags.mutate({
        teamId: Number(params.teamId),
        segmentId: item.id,
        tags: allTagStrings,
      });
    } else {
      setClipTags.mutate({
        teamId: Number(params.teamId),
        clipId: item.id,
        tags: allTagStrings,
      });
    }
  };

  const removeTag = (tagToRemove: { id: number; tag: string }) => {
    shouldPreventBlurRef.current = true;
    const newTags = currentTags.filter((t) => t.tag !== tagToRemove.tag);
    setOptimisticTags(newTags);

    if (isSegmentItem) {
      setSegmentTags.mutate({
        teamId: Number(params.teamId),
        segmentId: item.id,
        tags: newTags.map((t) => t.tag),
      });
    } else {
      setClipTags.mutate({
        teamId: Number(params.teamId),
        clipId: item.id,
        tags: newTags.map((t) => t.tag),
      });
    }

    // Reset the flag after a short delay
    setTimeout(() => {
      shouldPreventBlurRef.current = false;
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        addTags(inputValue);
      }
    } else if (
      e.key === "Backspace" &&
      inputValue === "" &&
      currentTags.length > 0
    ) {
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
      <div
        className="flex flex-wrap items-center gap-1"
        onClickCapture={(e) => e.stopPropagation()}
      >
        {currentTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className="h-6 text-xs pl-2 pr-1 gap-1"
          >
            {tag.tag}
            <button
              type="button"
              onMouseDown={(e) => {
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
            if (shouldPreventBlurRef.current) return;
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

  if (!isCoach) {
    return (
      <div className="flex gap-1 px-2 -mx-2 py-1">
        {currentTags.length > 0 ? (
          currentTags.map((tag) => (
            <Badge key={tag.id} variant="outline" className="h-6 text-xs">
              {tag.tag}
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
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

export const getColumns = (isCoach: boolean): ColumnDef<MediaItem>[] => [
  {
    id: "select",
    size: 25,
    maxSize: 25,
    minSize: 25,
    header: ({ table }) => (
      <div className="flex items-center justify-start">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-start">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "index",
    header: () => <div className="flex items-center justify-center">#</div>,
    size: 35,
    maxSize: 35,
    minSize: 35,
    cell: ({ row }) => {
      return (
        <div className="text-center text-muted-foreground">
          {row.original.index}
        </div>
      );
    },
  },
  {
    id: "type",
    header: "",
    size: 30,
    maxSize: 30,
    minSize: 30,
    cell: ({ row }) => {
      const item = row.original;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
                {item.type === "segment" ? (
                  <Scissors className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Film className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{item.type === "segment" ? "Segment" : "Clip"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "name",
    header: "Name",
    size: 300,
    cell: ({ row }) => {
      const item = row.original;
      const index = row.index;
      return <EditableNameCell item={item} index={index} isCoach={isCoach} />;
    },
  },
  {
    accessorKey: "duration_s",
    header: "Duration",
    size: 70,
    maxSize: 70,
    minSize: 70,
    cell: ({ row }) => {
      const item = row.original;
      // For segments, calculate duration from startS and endS
      const duration =
        item.type === "segment" && item.startS !== undefined && item.endS !== undefined
          ? item.endS - item.startS
          : item.durationS;

      return (
        <div className="text-center text-muted-foreground text-sm">
          {duration ? formatDuration(duration) : "—"}
        </div>
      );
    },
  },
  {
    accessorKey: "tags",
    header: "Tags",
    size: 400,
    cell: ({ row }) => {
      const item = row.original;
      return <EditableTagsCell item={item} isCoach={isCoach} />;
    },
  },
  {
    accessorKey: "comments",
    header: "Comments",
    size: 100,
    maxSize: 100,
    minSize: 100,
    cell: ({ row }) => {
      const commentCount = row.original.comments?.length ?? 0;
      return (
        <div className="text-muted-foreground text-sm">
          {commentCount > 0 ? commentCount : "—"}
        </div>
      );
    },
  },
];
