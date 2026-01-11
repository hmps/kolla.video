"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Pencil,
  Share,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CommentSection,
  type CommentSectionRef,
} from "@/components/comment-section";
import { SharePlaylistDialog } from "@/components/share-playlist-dialog";
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
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  VidstackPlayer,
  type VidstackPlayerRef,
} from "@/components/vidstack-player";
import env from "@/env/client";
import { useTRPC } from "@/trpc/client";

interface PlaylistItem {
  id: number;
  position: number;
  clipId: number | null;
  segmentId: number | null;
  clip: {
    id: number;
    name: string | null;
    storageKey: string;
    hlsPrefix: string | null;
    durationS: number | null;
    status: string;
    event: { id: number; title: string } | null;
    tags: Array<{ id: number; tag: string }>;
    comments: Array<{ id: number }>;
  } | null;
  segment: {
    id: number;
    name: string | null;
    startS: number;
    endS: number;
    clip: {
      id: number;
      storageKey: string;
      hlsPrefix: string | null;
      status: string;
    } | null;
    event: { id: number; title: string } | null;
    tags: Array<{ id: number; tag: string }>;
    comments: Array<{ id: number }>;
  } | null;
}

function getItemType(item: PlaylistItem): "clip" | "segment" {
  return item.segmentId ? "segment" : "clip";
}

function getItemName(item: PlaylistItem): string {
  if (item.segment) {
    return item.segment.name || `Segment ${item.position + 1}`;
  }
  if (item.clip) {
    return item.clip.name || `Clip ${item.position + 1}`;
  }
  return `Item ${item.position + 1}`;
}

function getItemDuration(item: PlaylistItem): number | null {
  if (item.segment) {
    return item.segment.endS - item.segment.startS;
  }
  return item.clip?.durationS ?? null;
}

function getItemEventName(item: PlaylistItem): string {
  return item.segment?.event?.title || item.clip?.event?.title || "Unknown Event";
}

function getItemSource(
  item: PlaylistItem,
  assetsBase: string,
): { src: string; segmentStart?: number; segmentEnd?: number } | null {
  if (item.segment && item.segment.clip) {
    const clip = item.segment.clip;
    if (clip.hlsPrefix && clip.status === "ready") {
      return {
        src: `${assetsBase}/${clip.hlsPrefix}/master.m3u8`,
        segmentStart: item.segment.startS,
        segmentEnd: item.segment.endS,
      };
    }
    if (clip.storageKey) {
      return {
        src: `${assetsBase}/${clip.storageKey}`,
        segmentStart: item.segment.startS,
        segmentEnd: item.segment.endS,
      };
    }
  }
  if (item.clip) {
    if (item.clip.hlsPrefix && item.clip.status === "ready") {
      return { src: `${assetsBase}/${item.clip.hlsPrefix}/master.m3u8` };
    }
    if (item.clip.storageKey) {
      return { src: `${assetsBase}/${item.clip.storageKey}` };
    }
  }
  return null;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ teamId: string; playlistId: string }>;
}) {
  const { teamId, playlistId } = use(params);
  const teamIdNum = Number.parseInt(teamId, 10);
  const playlistIdNum = Number.parseInt(playlistId, 10);

  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [itemToRemove, setItemToRemove] = useState<PlaylistItem | null>(null);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const mobilePlayerRef = useRef<VidstackPlayerRef>(null);
  const desktopPlayerRef = useRef<VidstackPlayerRef>(null);
  const commentSectionRef = useRef<CommentSectionRef>(null);

  const trpc = useTRPC();

  const { data: team } = useQuery(
    trpc.teams.get.queryOptions({ teamId: teamIdNum }),
  );

  const {
    data: playlist,
    isLoading,
    refetch: refetchPlaylist,
  } = useQuery(
    trpc.playlists.get.queryOptions({
      teamId: teamIdNum,
      playlistId: playlistIdNum,
    }),
  );

  const updatePlaylist = useMutation(
    trpc.playlists.update.mutationOptions({
      onSuccess: () => {
        refetchPlaylist();
        setIsEditDialogOpen(false);
      },
    }),
  );

  const removeItem = useMutation(
    trpc.playlists.removeItem.mutationOptions({
      onSuccess: () => {
        refetchPlaylist();
        setItemToRemove(null);
      },
    }),
  );

  const items = (playlist as { items?: PlaylistItem[] } | undefined)?.items ?? [];
  const selectedItem = selectedItemIndex !== null ? items[selectedItemIndex] : null;

  // Load first item on mount
  useEffect(() => {
    if (items.length > 0 && selectedItemIndex === null) {
      setSelectedItemIndex(0);
      setShouldAutoplay(true);
    }
  }, [items, selectedItemIndex]);

  // Open edit dialog with current values
  const openEditDialog = useCallback(() => {
    if (playlist) {
      setEditName(playlist.name);
      setEditDescription(playlist.description || "");
      setIsEditDialogOpen(true);
    }
  }, [playlist]);

  const handleSaveEdit = useCallback(() => {
    updatePlaylist.mutate({
      teamId: teamIdNum,
      playlistId: playlistIdNum,
      name: editName,
      description: editDescription || null,
    });
  }, [updatePlaylist, teamIdNum, playlistIdNum, editName, editDescription]);

  const handlePreviousItem = useCallback(() => {
    if (selectedItemIndex !== null && selectedItemIndex > 0) {
      setSelectedItemIndex(selectedItemIndex - 1);
      setShouldAutoplay(true);
    }
  }, [selectedItemIndex]);

  const handleNextItem = useCallback(() => {
    if (selectedItemIndex !== null && selectedItemIndex < items.length - 1) {
      setSelectedItemIndex(selectedItemIndex + 1);
      setShouldAutoplay(true);
    }
  }, [selectedItemIndex, items.length]);

  // Get video source for selected item
  const videoSource = useMemo(() => {
    if (!selectedItem) return null;
    return getItemSource(selectedItem, env.NEXT_PUBLIC_ASSETS_BASE);
  }, [selectedItem]);

  const isCoach = team?.role === "coach";

  if (isLoading) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Skeleton className="h-5 w-48" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  if (!playlist) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span>Playlist not found</span>
          </div>
        </header>
      </>
    );
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex flex-1 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/playlists">Playlists</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{playlist.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-2 px-4">
          {isCoach && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsShareDialogOpen(true)}>
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={openEditDialog}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Playlist
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 lg:flex-row">
        {/* Main content */}
        <div className="flex-1 space-y-4">
          {/* Video Player - Mobile */}
          <div className="lg:hidden">
            {videoSource ? (
              <VidstackPlayer
                ref={mobilePlayerRef}
                src={videoSource.src}
                segmentStart={videoSource.segmentStart}
                segmentEnd={videoSource.segmentEnd}
                autoplay={shouldAutoplay}
                onEnded={handleNextItem}
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-48">
                  <p className="text-muted-foreground">
                    {items.length === 0
                      ? "No items in this playlist"
                      : "Select an item to play"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Playback controls */}
          {selectedItem && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousItem}
                disabled={selectedItemIndex === 0}
              >
                <ChevronUp className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextItem}
                disabled={selectedItemIndex === items.length - 1}
              >
                Next
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Playlist items table */}
          <div className="rounded-md border max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="w-[80px]">Duration</TableHead>
                  <TableHead className="w-[100px]">Tags</TableHead>
                  {isCoach && <TableHead className="w-[50px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isCoach ? 6 : 5} className="h-24 text-center">
                      No items in this playlist. Add clips from your events.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow
                      key={item.id}
                      className={`cursor-pointer ${
                        selectedItemIndex === index ? "bg-accent" : ""
                      }`}
                      onClick={() => {
                        setSelectedItemIndex(index);
                        setShouldAutoplay(true);
                      }}
                    >
                      <TableCell className="font-mono text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getItemName(item)}</span>
                          <Badge variant="outline" className="text-xs">
                            {getItemType(item)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getItemEventName(item)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatDuration(getItemDuration(item))}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(item.clip?.tags || item.segment?.tags || [])
                            .slice(0, 2)
                            .map((tag) => (
                              <Badge key={tag.id} variant="secondary" className="text-xs">
                                {tag.tag}
                              </Badge>
                            ))}
                          {(item.clip?.tags?.length || item.segment?.tags?.length || 0) > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(item.clip?.tags?.length || item.segment?.tags?.length || 0) - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {isCoach && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToRemove(item);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Desktop sidebar with video and comments */}
        <div className="hidden lg:flex lg:w-[500px] lg:flex-col lg:gap-4">
          {/* Video Player - Desktop */}
          {videoSource ? (
            <VidstackPlayer
              ref={desktopPlayerRef}
              src={videoSource.src}
              segmentStart={videoSource.segmentStart}
              segmentEnd={videoSource.segmentEnd}
              autoplay={shouldAutoplay}
              onEnded={handleNextItem}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-48">
                <p className="text-muted-foreground">
                  {items.length === 0
                    ? "No items in this playlist"
                    : "Select an item to play"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Comments Section */}
          {selectedItem && (
            <CommentSection
              ref={commentSectionRef}
              teamId={teamIdNum}
              clipId={selectedItem.clipId ?? undefined}
              segmentId={selectedItem.segmentId ?? undefined}
              isCoach={isCoach ?? false}
            />
          )}
        </div>
      </div>

      {/* Edit Playlist Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription>
              Update your playlist name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || updatePlaylist.isPending}
            >
              {updatePlaylist.isPending && <Spinner className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Item Confirmation */}
      <AlertDialog
        open={!!itemToRemove}
        onOpenChange={(open) => !open && setItemToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Playlist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{itemToRemove && getItemName(itemToRemove)}" from this playlist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToRemove) {
                  removeItem.mutate({
                    teamId: teamIdNum,
                    playlistId: playlistIdNum,
                    itemId: itemToRemove.id,
                  });
                }
              }}
            >
              {removeItem.isPending && <Spinner className="mr-2 h-4 w-4" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <SharePlaylistDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        teamId={teamIdNum}
        playlistId={playlistIdNum}
      />
    </>
  );
}
