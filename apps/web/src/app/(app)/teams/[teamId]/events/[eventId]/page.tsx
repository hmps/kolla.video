"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { CommentSection } from "@/components/comment-section";
import { PlyrPlayer } from "@/components/plyr-player";
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
import { columns } from "./columns";
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
          <Breadcrumb>
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
        <div className="ml-auto flex items-center gap-2 px-4">
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
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner className="size-8" />
          </div>
        ) : (
          <>
            {/* Video Player and Comments Row */}
            <div className="flex gap-6">
              {/* Large Player Section */}
              <Card className="flex-1">
                <CardContent className="p-0">
                  {typeof "window" !== "undefined" && selectedClip ? (
                    selectedClip.status === "ready" &&
                    selectedClip.hlsPrefix ? (
                      <PlyrPlayer
                        src={`${process.env.NEXT_PUBLIC_ASSETS_BASE}${selectedClip.hlsPrefix}master.m3u8`}
                        autoplay={autoplayKey > 0}
                      />
                    ) : selectedClip.storageKey ? (
                      <PlyrPlayer
                        src={`${process.env.NEXT_PUBLIC_ASSETS_BASE}${selectedClip.storageKey}`}
                        autoplay={autoplayKey > 0}
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

              {/* Comments Section */}
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
    </>
  );
}
