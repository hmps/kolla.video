"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Keyboard,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommentSection } from "@/components/comment-section";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import {
  VidstackPlayer,
  type VidstackPlayerRef,
} from "@/components/vidstack-player";
import env from "@/env/client";
import { useTRPC } from "@/trpc/client";
import { getColumns } from "./columns";
import { DataTable } from "./data-table";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ teamId: string; eventId: string }>;
}) {
  const { teamId, eventId } = use(params);
  const teamIdNum = Number.parseInt(teamId, 10);
  const eventIdNum = Number.parseInt(eventId, 10);

  const [selectedClipId, setSelectedClipId] = useState<number | null>(null);
  const [clipsToDelete, setClipsToDelete] = useState<number[]>([]);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const mobilePlayerRef = useRef<VidstackPlayerRef>(null);
  const desktopPlayerRef = useRef<VidstackPlayerRef>(null);

  const trpc = useTRPC();
  const { data: team } = useQuery(
    trpc.teams.get.queryOptions({ teamId: teamIdNum }),
  );
  const { data: event } = useQuery(
    trpc.events.get.queryOptions({
      teamId: teamIdNum,
      eventId: eventIdNum,
    }),
  );
  const {
    data: clips,
    refetch: refetchClips,
    isLoading,
  } = useQuery(
    trpc.clips.byEvent.queryOptions({
      teamId: teamIdNum,
      eventId: eventIdNum,
    }),
  );

  // Load first clip on mount with autoplay
  useEffect(() => {
    if (clips && clips.length > 0 && selectedClipId === null) {
      setSelectedClipId(clips[0].id);
      setShouldAutoplay(true);
    }
  }, [clips, selectedClipId]);

  const deleteClips = useMutation(
    trpc.clips.delete.mutationOptions({
      onSuccess: () => {
        setClipsToDelete([]);
        refetchClips();
      },
    }),
  );

  const setTags = useMutation(
    trpc.clips.setTags.mutationOptions({
      onSuccess: () => {
        refetchClips();
      },
    }),
  );

  const selectedClip = useMemo(
    () => clips?.find((clip) => clip.id === selectedClipId),
    [clips, selectedClipId],
  );

  const columns = useMemo(
    () => getColumns(team?.role === "coach"),
    [team?.role],
  );

  const handleDeleteSelected = useCallback((selectedIds: number[]) => {
    if (selectedIds.length === 0) return;
    setClipsToDelete(selectedIds);
  }, []);

  const confirmDelete = useCallback(() => {
    // Delete clips one by one
    clipsToDelete.forEach((clipId) => {
      deleteClips.mutate({
        teamId: teamIdNum,
        clipId,
      });
    });
  }, [clipsToDelete, deleteClips, teamIdNum]);

  const handleRowClick = useCallback((clip: { id: number }) => {
    setSelectedClipId(clip.id);
    setShouldAutoplay(true);
  }, []);

  const handleAddTags = useCallback(() => {
    if (!selectedClipId || !tagInput.trim()) {
      setIsTagDialogOpen(false);
      setTagInput("");
      return;
    }

    const newTags = tagInput
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (newTags.length === 0) {
      setIsTagDialogOpen(false);
      setTagInput("");
      return;
    }

    const existingTags = selectedClip?.tags?.map((t) => t.tag) ?? [];
    const allTags = [...existingTags, ...newTags];

    setTags.mutate({
      teamId: teamIdNum,
      clipId: selectedClipId,
      tags: allTags,
    });

    setIsTagDialogOpen(false);
    setTagInput("");
  }, [selectedClipId, selectedClip, tagInput, teamIdNum, setTags]);

  const goToPreviousClip = useCallback(() => {
    if (!clips || clips.length === 0) return;
    const currentIndex = clips.findIndex((clip) => clip.id === selectedClipId);
    if (currentIndex > 0) {
      setSelectedClipId(clips[currentIndex - 1].id);
      setShouldAutoplay(true);
    }
  }, [clips, selectedClipId]);

  const goToNextClip = useCallback(() => {
    if (!clips || clips.length === 0) return;
    const currentIndex = clips.findIndex((clip) => clip.id === selectedClipId);
    if (currentIndex < clips.length - 1) {
      setSelectedClipId(clips[currentIndex + 1].id);
      setShouldAutoplay(true);
    }
  }, [clips, selectedClipId]);

  const seekBackward = useCallback(() => {
    if (mobilePlayerRef.current?.player) {
      mobilePlayerRef.current.player.currentTime = Math.max(
        0,
        mobilePlayerRef.current.player.currentTime - 1,
      );
    }
    if (desktopPlayerRef.current?.player) {
      desktopPlayerRef.current.player.currentTime = Math.max(
        0,
        desktopPlayerRef.current.player.currentTime - 1,
      );
    }
  }, []);

  const seekForward = useCallback(() => {
    if (mobilePlayerRef.current?.player) {
      mobilePlayerRef.current.player.currentTime = Math.min(
        mobilePlayerRef.current.player.duration,
        mobilePlayerRef.current.player.currentTime + 1,
      );
    }
    if (desktopPlayerRef.current?.player) {
      desktopPlayerRef.current.player.currentTime = Math.min(
        desktopPlayerRef.current.player.duration,
        desktopPlayerRef.current.player.currentTime + 1,
      );
    }
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (mobilePlayerRef.current?.player) {
      const player = mobilePlayerRef.current.player;
      if (player.paused) {
        player.play().catch((error) => {
          console.warn("Play failed:", error);
        });
      } else {
        player.pause();
      }
    }
    if (desktopPlayerRef.current?.player) {
      const player = desktopPlayerRef.current.player;
      if (player.paused) {
        player.play().catch((error) => {
          console.warn("Play failed:", error);
        });
      } else {
        player.pause();
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Open shortcuts dialog: ?
      if (e.key === "?") {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      // Open tag dialog: t
      if (e.key === "t") {
        e.preventDefault();
        if (selectedClipId) {
          setIsTagDialogOpen(true);
        }
        return;
      }

      if (!clips || clips.length === 0) return;

      const currentIndex = clips.findIndex(
        (clip) => clip.id === selectedClipId,
      );

      // Clip navigation: j/k or ArrowDown/ArrowUp
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        if (currentIndex === -1) {
          setSelectedClipId(clips[0].id);
        } else if (currentIndex < clips.length - 1) {
          setSelectedClipId(clips[currentIndex + 1].id);
        }
        setShouldAutoplay(true);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        if (currentIndex === -1) {
          setSelectedClipId(clips[clips.length - 1].id);
        } else if (currentIndex > 0) {
          setSelectedClipId(clips[currentIndex - 1].id);
        }
        setShouldAutoplay(true);
      }
      // Seek: h/l or ArrowLeft/ArrowRight
      else if (e.key === "h" || e.key === "ArrowLeft") {
        e.preventDefault();
        seekBackward();
      } else if (e.key === "l" || e.key === "ArrowRight") {
        e.preventDefault();
        seekForward();
      }
      // Play/pause: Space
      else if (e.key === " ") {
        e.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clips, selectedClipId, seekBackward, seekForward, togglePlayPause]);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          {/* Mobile: Show only event name */}
          <div className="md:hidden">
            <p className="font-medium">{event?.title || "Event"}</p>
          </div>
          {/* Desktop: Show full breadcrumb */}
          <Breadcrumb className="hidden md:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/teams">Teams</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/teams/${teamId}`}>{team?.name || "Team"}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{event?.title || "Event"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto items-center gap-2 px-4 hidden md:flex">
          {event && (
            <p className="text-sm text-muted-foreground mr-4">
              {format(new Date(event.date), "PPP")} •{" "}
              <span className="capitalize">{event.type}</span>
            </p>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsShortcutsOpen(true)}
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          {team?.role === "coach" && (
            <Link href={`/teams/${teamId}/events/${eventId}/upload`}>
              <Button>Upload Clips</Button>
            </Link>
          )}
        </div>
      </header>

      {/* Video Player Section - Full width on mobile, fixed at top */}
      {!isLoading && (
        <div className="sticky top-0 z-10 bg-background md:hidden">
          <Card className="rounded-none border-x-0">
            <CardContent className="p-0">
              {typeof "window" !== "undefined" && selectedClip ? (
                selectedClip.status === "ready" && selectedClip.hlsPrefix ? (
                  <VidstackPlayer
                    ref={mobilePlayerRef}
                    key={selectedClip.id}
                    src={`${env.NEXT_PUBLIC_ASSETS_BASE}/${selectedClip.hlsPrefix}master.m3u8`}
                    autoplay={shouldAutoplay}
                    muted={true}
                    loop={true}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onNextClip={goToNextClip}
                    onPreviousClip={goToPreviousClip}
                  />
                ) : selectedClip.storageKey ? (
                  <VidstackPlayer
                    ref={mobilePlayerRef}
                    key={selectedClip.id}
                    src={`${env.NEXT_PUBLIC_ASSETS_BASE}/${selectedClip.storageKey}`}
                    autoplay={shouldAutoplay}
                    muted={true}
                    loop={true}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onNextClip={goToNextClip}
                    onPreviousClip={goToPreviousClip}
                  />
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <p className="text-muted-foreground">
                      {selectedClip.status === "processing"
                        ? "Processing..."
                        : selectedClip.status === "failed"
                          ? "Processing failed"
                          : "Waiting for upload"}
                    </p>
                  </div>
                )
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <p className="text-muted-foreground">Select a clip to play</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile Controls */}
          <div className="flex items-center justify-center gap-4 py-4 bg-background">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousClip}
              disabled={
                !clips ||
                clips.length === 0 ||
                clips.findIndex((clip) => clip.id === selectedClipId) === 0
              }
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={seekBackward}
              disabled={!selectedClip}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayPause}
              disabled={!selectedClip}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={seekForward}
              disabled={!selectedClip}
            >
              <RotateCw className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextClip}
              disabled={
                !clips ||
                clips.length === 0 ||
                clips.findIndex((clip) => clip.id === selectedClipId) ===
                  clips.length - 1
              }
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner className="size-8" />
          </div>
        ) : (
          <>
            {/* Desktop Video Player and Comments Row */}
            <div className="hidden md:flex md:gap-6">
              {/* Large Player Section */}
              <div className="md:flex-1">
                <Card className="flex-1">
                  <CardContent className="p-0">
                    {typeof "window" !== "undefined" && selectedClip ? (
                      selectedClip.status === "ready" &&
                      selectedClip.hlsPrefix ? (
                        <VidstackPlayer
                          ref={desktopPlayerRef}
                          key={selectedClip.id}
                          src={`${env.NEXT_PUBLIC_ASSETS_BASE}/${selectedClip.hlsPrefix}master.m3u8`}
                          autoplay={shouldAutoplay}
                          muted={true}
                          loop={true}
                          onPlay={handlePlay}
                          onPause={handlePause}
                          onNextClip={goToNextClip}
                          onPreviousClip={goToPreviousClip}
                        />
                      ) : selectedClip.storageKey ? (
                        <VidstackPlayer
                          ref={desktopPlayerRef}
                          key={selectedClip.id}
                          src={`${env.NEXT_PUBLIC_ASSETS_BASE}/${selectedClip.storageKey}`}
                          autoplay={shouldAutoplay}
                          muted={true}
                          loop={true}
                          onPlay={handlePlay}
                          onPause={handlePause}
                          onNextClip={goToNextClip}
                          onPreviousClip={goToPreviousClip}
                        />
                      ) : (
                        <div className="aspect-video bg-muted flex items-center justify-center">
                          <p className="text-muted-foreground">
                            {selectedClip.status === "processing"
                              ? "Processing..."
                              : selectedClip.status === "failed"
                                ? "Processing failed"
                                : "Waiting for upload"}
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <p className="text-muted-foreground">
                          Select a clip to play
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Comments Section */}
              <CommentSection
                teamId={teamIdNum}
                clipId={selectedClipId}
                isCoach={team?.role === "coach"}
              />
            </div>

            {/* Mobile Comments Section */}
            <div className="md:hidden">
              <CommentSection
                teamId={teamIdNum}
                clipId={selectedClipId}
                isCoach={team?.role === "coach"}
              />
            </div>

            {/* Data Table Section */}
            <DataTable
              columns={columns}
              data={clips ?? []}
              onDeleteSelected={handleDeleteSelected}
              onRowClick={handleRowClick}
              selectedId={selectedClipId}
            />
          </>
        )}
      </div>

      <AlertDialog
        open={clipsToDelete.length > 0}
        onOpenChange={(open: boolean) => !open && setClipsToDelete([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Clip{clipsToDelete.length > 1 ? "s" : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {clipsToDelete.length} clip
              {clipsToDelete.length > 1 ? "s" : ""}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Use these keyboard shortcuts to navigate and control playback
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Navigation</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next clip</span>
                  <div className="flex gap-1 items-center">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">j</kbd>
                    <span className="text-muted-foreground">/</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">↓</kbd>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previous clip</span>
                  <div className="flex gap-1 items-center">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">k</kbd>
                    <span className="text-muted-foreground">/</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">↑</kbd>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Playback</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Play / Pause</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">
                    Space
                  </kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Seek backward (1s)
                  </span>
                  <div className="flex gap-1 items-center">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">h</kbd>
                    <span className="text-muted-foreground">/</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">←</kbd>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Seek forward (1s)
                  </span>
                  <div className="flex gap-1 items-center">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">l</kbd>
                    <span className="text-muted-foreground">/</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">→</kbd>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Actions</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Add tag</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">t</kbd>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Help</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Show shortcuts</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">?</kbd>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tags</DialogTitle>
            <DialogDescription>
              Add tags to {selectedClip?.name ?? `Clip #${selectedClip?.index}`}. Separate multiple tags with commas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedClip?.tags && selectedClip.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Current tags:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedClip.tags.map((tag) => (
                    <Badge key={tag.id} variant="outline">
                      {tag.tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTags();
                } else if (e.key === "Escape") {
                  setIsTagDialogOpen(false);
                  setTagInput("");
                }
              }}
              placeholder="Enter tags (comma-separated)"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTagDialogOpen(false);
                setTagInput("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddTags}>Add Tags</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
