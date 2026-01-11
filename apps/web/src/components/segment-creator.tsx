"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Scissors, Square, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { formatDuration } from "@/types/media-item";

interface SegmentCreatorProps {
  clipId: number;
  clipDuration: number | null;
  teamId: number;
  eventId: number;
  currentTime: number;
  onSegmentCreated: () => void;
  onCancel: () => void;
}

export function SegmentCreator({
  clipId,
  clipDuration,
  teamId,
  eventId,
  currentTime,
  onSegmentCreated,
  onCancel,
}: SegmentCreatorProps) {
  const [markIn, setMarkIn] = useState<number | null>(null);
  const [markOut, setMarkOut] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createSegment = useMutation(
    trpc.segments.create.mutationOptions({
      onSuccess: () => {
        // Reset state
        setMarkIn(null);
        setMarkOut(null);
        setName("");
        setIsCreating(false);

        // Invalidate the media query to refresh the list
        queryClient.invalidateQueries({
          queryKey: [["clips", "mediaByEvent"], { input: { teamId, eventId } }],
        });

        onSegmentCreated();
      },
      onError: (error) => {
        console.error("Failed to create segment:", error);
        setIsCreating(false);
      },
    }),
  );

  // Mark In button - captures current time as start
  const handleMarkIn = () => {
    setMarkIn(currentTime);
    // Clear mark out if it's before or equal to mark in
    if (markOut !== null && currentTime >= markOut) {
      setMarkOut(null);
    }
  };

  // Mark Out button - captures current time as end
  const handleMarkOut = () => {
    if (markIn !== null && currentTime > markIn) {
      setMarkOut(currentTime);
    }
  };

  // Create segment
  const handleCreate = () => {
    if (markIn === null || markOut === null) return;

    setIsCreating(true);
    createSegment.mutate({
      teamId,
      eventId,
      clipId,
      name: name.trim() || undefined,
      startS: markIn,
      endS: markOut,
    });
  };

  // Clear marks
  const handleClear = () => {
    setMarkIn(null);
    setMarkOut(null);
    setName("");
  };

  const canMarkOut = markIn !== null && currentTime > markIn;
  const canCreate = markIn !== null && markOut !== null && !isCreating;
  const segmentDuration = markIn !== null && markOut !== null ? markOut - markIn : null;

  return (
    <div className="flex flex-col gap-3 p-3 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Create Segment</span>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={markIn !== null ? "default" : "outline"}
          size="sm"
          onClick={handleMarkIn}
          className="min-w-[100px]"
        >
          <Play className="h-4 w-4 mr-1" />
          In {markIn !== null && `(${formatDuration(markIn)})`}
        </Button>

        <Button
          variant={markOut !== null ? "default" : "outline"}
          size="sm"
          onClick={handleMarkOut}
          disabled={!canMarkOut}
          className="min-w-[100px]"
        >
          <Square className="h-4 w-4 mr-1" />
          Out {markOut !== null && `(${formatDuration(markOut)})`}
        </Button>

        {(markIn !== null || markOut !== null) && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {segmentDuration !== null && (
        <div className="text-sm text-muted-foreground">
          Duration: {formatDuration(segmentDuration)}
          {clipDuration !== null && (
            <span className="ml-2">
              (of {formatDuration(clipDuration)} total)
            </span>
          )}
        </div>
      )}

      {canCreate && (
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Segment name (optional)"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <Button size="sm" onClick={handleCreate} disabled={isCreating}>
            <Scissors className="h-4 w-4 mr-1" />
            {isCreating ? "Creating..." : "Create"}
          </Button>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Tip: Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">i</kbd> for In,{" "}
        <kbd className="px-1 py-0.5 bg-muted rounded text-xs">o</kbd> for Out
      </div>
    </div>
  );
}
