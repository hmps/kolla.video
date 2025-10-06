"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommentSection } from "@/components/comment-section";
import { PlyrPlayer, type PlyrPlayerRef } from "@/components/plyr-player";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
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
  const [autoplayKey, setAutoplayKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mobilePlayerRef = useRef<PlyrPlayerRef>(null);
  const desktopPlayerRef = useRef<PlyrPlayerRef>(null);

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

  // Load first clip on mount
  useEffect(() => {
    if (clips && clips.length > 0 && selectedClipId === null) {
      setSelectedClipId(clips[0].id);
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

  const selectedClip = useMemo(
    () => clips?.find((clip) => clip.id === selectedClipId),
    [clips, selectedClipId],
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
    setAutoplayKey((prev) => prev + 1);
  }, []);

  const goToPreviousClip = useCallback(() => {
    if (!clips || clips.length === 0) return;
    const currentIndex = clips.findIndex((clip) => clip.id === selectedClipId);
    if (currentIndex > 0) {
      setSelectedClipId(clips[currentIndex - 1].id);
      setAutoplayKey((prev) => prev + 1);
    }
  }, [clips, selectedClipId]);

  const goToNextClip = useCallback(() => {
    if (!clips || clips.length === 0) return;
    const currentIndex = clips.findIndex((clip) => clip.id === selectedClipId);
    if (currentIndex < clips.length - 1) {
      setSelectedClipId(clips[currentIndex + 1].id);
      setAutoplayKey((prev) => prev + 1);
    }
  }, [clips, selectedClipId]);

  const seekBackward = useCallback(() => {
    const player =
      mobilePlayerRef.current?.player || desktopPlayerRef.current?.player;
    if (player) {
      const newTime = Math.max(0, player.currentTime - 1);
      player.currentTime = newTime;
    }
  }, []);

  const seekForward = useCallback(() => {
    const player =
      mobilePlayerRef.current?.player || desktopPlayerRef.current?.player;
    if (player) {
      const newTime = Math.min(
        player.duration || player.currentTime + 1,
        player.currentTime + 1,
      );
      player.currentTime = newTime;
    }
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    const player =
      mobilePlayerRef.current?.player || desktopPlayerRef.current?.player;
    if (player?.playing) {
      player.pause();
    } else if (player) {
      player.play();
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

      if (!clips || clips.length === 0) return;

      const currentIndex = clips.findIndex(
        (clip) => clip.id === selectedClipId,
      );

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        if (currentIndex === -1) {
          setSelectedClipId(clips[0].id);
        } else if (currentIndex < clips.length - 1) {
          setSelectedClipId(clips[currentIndex + 1].id);
        }
        setAutoplayKey((prev) => prev + 1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        if (currentIndex === -1) {
          setSelectedClipId(clips[clips.length - 1].id);
        } else if (currentIndex > 0) {
          setSelectedClipId(clips[currentIndex - 1].id);
        }
        setAutoplayKey((prev) => prev + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clips, selectedClipId]);

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
                  <Link href={`/teams/${teamId}/events`}>
                    {team?.name || "Team"}
                  </Link>
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
          <Link href={`/teams/${teamId}/events/${eventId}/upload`}>
            <Button>Upload Clips</Button>
          </Link>
        </div>
      </header>

      {/* Video Player Section - Full width on mobile, fixed at top */}
      {!isLoading && (
        <div className="sticky top-0 z-10 bg-background md:hidden">
          <Card className="rounded-none border-x-0">
            <CardContent className="p-0">
              {typeof "window" !== "undefined" && selectedClip ? (
                selectedClip.status === "ready" && selectedClip.hlsPrefix ? (
                  <PlyrPlayer
                    ref={mobilePlayerRef}
                    src={`${process.env.NEXT_PUBLIC_ASSETS_BASE}${selectedClip.hlsPrefix}master.m3u8`}
                    autoplay={autoplayKey > 0}
                    onPlay={handlePlay}
                    onPause={handlePause}
                  />
                ) : selectedClip.storageKey ? (
                  <PlyrPlayer
                    ref={mobilePlayerRef}
                    src={`${process.env.NEXT_PUBLIC_ASSETS_BASE}${selectedClip.storageKey}`}
                    autoplay={autoplayKey > 0}
                    onPlay={handlePlay}
                    onPause={handlePause}
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
                        <PlyrPlayer
                          ref={desktopPlayerRef}
                          src={`${process.env.NEXT_PUBLIC_ASSETS_BASE}${selectedClip.hlsPrefix}master.m3u8`}
                          autoplay={autoplayKey > 0}
                          onPlay={handlePlay}
                          onPause={handlePause}
                        />
                      ) : selectedClip.storageKey ? (
                        <PlyrPlayer
                          ref={desktopPlayerRef}
                          src={`${process.env.NEXT_PUBLIC_ASSETS_BASE}${selectedClip.storageKey}`}
                          autoplay={autoplayKey > 0}
                          onPlay={handlePlay}
                          onPause={handlePause}
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
              columns={getColumns(team?.role === "coach")}
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
    </>
  );
}
