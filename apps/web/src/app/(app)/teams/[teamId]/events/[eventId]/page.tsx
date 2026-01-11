"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Keyboard,
  Link2,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  RotateCw,
  Scissors,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddToPlaylistDialog } from "@/components/add-to-playlist-dialog";
import {
  CommentSection,
  type CommentSectionRef,
} from "@/components/comment-section";
import { EditEventDialog } from "@/components/edit-event-dialog";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { SegmentCreator } from "@/components/segment-creator";
import type { MediaItem } from "./columns";
import {
  PendingClipsTable,
  type PendingClip,
} from "./pending-clips-table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  // Selection state - tracks both type and id
  const [selectedItem, setSelectedItem] = useState<{
    type: "clip" | "segment";
    id: number;
  } | null>(null);
  // Preview state for pending clips (shown in player but not in main list)
  const [previewPendingClip, setPreviewPendingClip] = useState<PendingClip | null>(null);
  const [itemsToDelete, setItemsToDelete] = useState<
    Array<{ type: "clip" | "segment"; id: number }>
  >([]);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isEditEventDialogOpen, setIsEditEventDialogOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isUploadLinkDialogOpen, setIsUploadLinkDialogOpen] = useState(false);
  const [uploadLinkDuration, setUploadLinkDuration] = useState<"1" | "3" | "7" | "30">("1");
  const [copiedLinkId, setCopiedLinkId] = useState<number | null>(null);
  // Playlist state
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [itemsToAddToPlaylist, setItemsToAddToPlaylist] = useState<
    Array<{ type: "clip" | "segment"; id: number }>
  >([]);
  // Segment creation state
  const [currentTime, setCurrentTime] = useState(0);
  const [isCreatingSegment, setIsCreatingSegment] = useState(false);
  const [segmentMarkIn, setSegmentMarkIn] = useState<number | null>(null);
  const [segmentMarkOut, setSegmentMarkOut] = useState<number | null>(null);
  const mobilePlayerRef = useRef<VidstackPlayerRef>(null);
  const desktopPlayerRef = useRef<VidstackPlayerRef>(null);
  const commentSectionRef = useRef<CommentSectionRef>(null);

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
    data: mediaItems,
    refetch: refetchMedia,
    isLoading,
  } = useQuery(
    trpc.clips.mediaByEvent.queryOptions({
      teamId: teamIdNum,
      eventId: eventIdNum,
    }),
  );

  const { data: onboardingProgress } = useQuery(
    trpc.onboarding.getProgress.queryOptions(),
  );

  const { data: uploadLinks, refetch: refetchUploadLinks } = useQuery(
    trpc.uploadLinks.listByEvent.queryOptions({
      teamId: teamIdNum,
      eventId: eventIdNum,
    }),
  );

  const { data: pendingClips, refetch: refetchPendingClips } = useQuery(
    trpc.clips.pendingByEvent.queryOptions({
      teamId: teamIdNum,
      eventId: eventIdNum,
    }),
  );

  const markOnboardingComplete = useMutation(
    trpc.onboarding.markComplete.mutationOptions(),
  );

  // Load first item on mount with autoplay
  useEffect(() => {
    if (mediaItems && mediaItems.length > 0 && selectedItem === null) {
      setSelectedItem({ type: mediaItems[0].type, id: mediaItems[0].id });
      setShouldAutoplay(true);
    }
  }, [mediaItems, selectedItem]);

  // Show onboarding if not completed
  useEffect(() => {
    if (onboardingProgress && !onboardingProgress.event_player_page) {
      // Delay showing onboarding slightly to let the page load
      const timer = setTimeout(() => setIsOnboardingOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [onboardingProgress]);

  const handleOnboardingComplete = useCallback(() => {
    setIsOnboardingOpen(false);
    markOnboardingComplete.mutate({ key: "event_player_page" });
  }, [markOnboardingComplete]);

  const deleteClip = useMutation(
    trpc.clips.delete.mutationOptions({
      onSuccess: () => {
        setItemsToDelete([]);
        refetchMedia();
      },
    }),
  );

  const deleteSegment = useMutation(
    trpc.segments.delete.mutationOptions({
      onSuccess: () => {
        setItemsToDelete([]);
        refetchMedia();
      },
    }),
  );

  const setTags = useMutation(
    trpc.clips.setTags.mutationOptions({
      onSuccess: () => {
        refetchMedia();
      },
    }),
  );

  const deleteTag = useMutation(
    trpc.clips.deleteTag.mutationOptions({
      onSuccess: () => {
        refetchMedia();
      },
    }),
  );

  const updateName = useMutation(
    trpc.clips.updateName.mutationOptions({
      onSuccess: () => {
        refetchMedia();
      },
    }),
  );

  const updateMetadata = useMutation(
    trpc.clips.updateMetadata.mutationOptions({
      onSuccess: () => {
        refetchMedia();
      },
    }),
  );

  const createUploadLink = useMutation(
    trpc.uploadLinks.create.mutationOptions({
      onSuccess: () => {
        refetchUploadLinks();
      },
    }),
  );

  const revokeUploadLink = useMutation(
    trpc.uploadLinks.revoke.mutationOptions({
      onSuccess: () => {
        refetchUploadLinks();
      },
    }),
  );

  const approveClips = useMutation(
    trpc.clips.approve.mutationOptions({
      onSuccess: () => {
        refetchPendingClips();
        refetchMedia();
        // Clear preview if the previewed clip was approved
        setPreviewPendingClip(null);
      },
    }),
  );

  const rejectClip = useMutation(
    trpc.clips.reject.mutationOptions({
      onSuccess: () => {
        refetchPendingClips();
        // Clear preview if the previewed clip was rejected
        setPreviewPendingClip(null);
      },
    }),
  );

  const handleApproveClips = useCallback((clipIds: number[]) => {
    approveClips.mutate({
      teamId: teamIdNum,
      clipIds,
    });
  }, [approveClips, teamIdNum]);

  const handleRejectClip = useCallback((clipId: number) => {
    rejectClip.mutate({
      teamId: teamIdNum,
      clipId,
    });
  }, [rejectClip, teamIdNum]);

  const handlePendingClipClick = useCallback((clip: PendingClip) => {
    setPreviewPendingClip(clip);
    setSelectedItem(null); // Clear regular selection
    setShouldAutoplay(true);
  }, []);

  const handleCreateUploadLink = useCallback(() => {
    createUploadLink.mutate({
      teamId: teamIdNum,
      eventId: eventIdNum,
      durationDays: uploadLinkDuration,
    });
    setUploadLinkDuration("1");
  }, [createUploadLink, teamIdNum, eventIdNum, uploadLinkDuration]);

  const handleCopyUploadLink = useCallback((linkId: number, token: string) => {
    const url = `${window.location.origin}/upload/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkId(linkId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  }, []);

  const handleRevokeUploadLink = useCallback((linkId: number) => {
    revokeUploadLink.mutate({
      teamId: teamIdNum,
      uploadLinkId: linkId,
    });
  }, [revokeUploadLink, teamIdNum]);

  // Find the currently selected media item (or use preview pending clip)
  const selectedMedia = useMemo(() => {
    // If previewing a pending clip, create a display object for it
    if (previewPendingClip) {
      return {
        type: "clip" as const,
        id: previewPendingClip.id,
        index: previewPendingClip.index,
        name: previewPendingClip.name,
        status: previewPendingClip.status,
        storageKey: previewPendingClip.storageKey,
        hlsPrefix: previewPendingClip.hlsPrefix,
        durationS: null,
        width: null,
        height: null,
        tags: [] as Array<{ id: number; tag: string }>,
        comments: [] as Array<{ id: number }>,
      };
    }
    if (!selectedItem || !mediaItems) return null;
    return mediaItems.find(
      (item) => item.type === selectedItem.type && item.id === selectedItem.id,
    );
  }, [mediaItems, selectedItem, previewPendingClip]);

  // For backward compatibility - get as clip if it's a clip
  const selectedClip = useMemo(() => {
    if (selectedMedia?.type === "clip") return selectedMedia;
    return null;
  }, [selectedMedia]);

  const columns = useMemo(
    () => getColumns(team?.role === "coach"),
    [team?.role],
  );

  const handleDeleteSelected = useCallback(
    (selectedIds: number[]) => {
      if (selectedIds.length === 0 || !mediaItems) return;
      // Map IDs to items with their types
      const items = selectedIds
        .map((id) => {
          const item = mediaItems.find((m) => m.id === id);
          return item ? { type: item.type, id } : null;
        })
        .filter((x): x is { type: "clip" | "segment"; id: number } => x !== null);
      setItemsToDelete(items);
    },
    [mediaItems],
  );

  const handleAddToPlaylistSelected = useCallback(
    (selectedIds: number[]) => {
      if (selectedIds.length === 0 || !mediaItems) return;
      // Map IDs to items with their types
      const items = selectedIds
        .map((id) => {
          const item = mediaItems.find((m) => m.id === id);
          return item ? { type: item.type, id } : null;
        })
        .filter((x): x is { type: "clip" | "segment"; id: number } => x !== null);
      setItemsToAddToPlaylist(items);
      setIsAddToPlaylistOpen(true);
    },
    [mediaItems],
  );

  const confirmDelete = useCallback(() => {
    // Delete items based on their type
    itemsToDelete.forEach((item) => {
      if (item.type === "clip") {
        deleteClip.mutate({
          teamId: teamIdNum,
          clipId: item.id,
        });
      } else {
        deleteSegment.mutate({
          teamId: teamIdNum,
          segmentId: item.id,
        });
      }
    });
  }, [itemsToDelete, deleteClip, deleteSegment, teamIdNum]);

  const handleRowClick = useCallback((item: MediaItem) => {
    setSelectedItem({ type: item.type, id: item.id });
    setPreviewPendingClip(null); // Clear pending clip preview
    setShouldAutoplay(true);
    // Clear segment creation mode when selecting a different item
    setIsCreatingSegment(false);
    setSegmentMarkIn(null);
    setSegmentMarkOut(null);
  }, []);

  const handleAddTags = useCallback(() => {
    if (!selectedItem || !tagInput.trim()) {
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

    const mediaTags = (selectedMedia as { tags?: Array<{ tag: string }> })?.tags;
    const existingTagStrings = new Set(
      mediaTags?.map((t) => t.tag) ?? [],
    );

    // Filter out duplicates - only add tags that don't already exist
    const uniqueNewTags = newTags.filter((tag) => !existingTagStrings.has(tag));

    if (uniqueNewTags.length === 0) {
      setIsTagDialogOpen(false);
      setTagInput("");
      return;
    }

    const allTags = [
      ...(mediaTags?.map((t) => t.tag) ?? []),
      ...uniqueNewTags,
    ];

    // TODO: Add segment tag support when needed
    if (selectedItem.type === "clip") {
      setTags.mutate({
        teamId: teamIdNum,
        clipId: selectedItem.id,
        tags: allTags,
      });
    }

    setIsTagDialogOpen(false);
    setTagInput("");
  }, [selectedItem, selectedMedia, tagInput, teamIdNum, setTags]);

  const handleDeleteTag = useCallback(
    (tagId: number) => {
      if (!selectedItem || selectedItem.type !== "clip") return;

      deleteTag.mutate({
        teamId: teamIdNum,
        clipId: selectedItem.id,
        tagId,
      });
    },
    [selectedItem, teamIdNum, deleteTag],
  );

  const handleRename = useCallback(() => {
    if (!selectedItem || !nameInput.trim()) {
      setIsRenameDialogOpen(false);
      setNameInput("");
      return;
    }

    // TODO: Add segment rename support when needed
    if (selectedItem.type === "clip") {
      updateName.mutate({
        teamId: teamIdNum,
        clipId: selectedItem.id,
        name: nameInput.trim(),
      });
    }

    setIsRenameDialogOpen(false);
    setNameInput("");
  }, [selectedItem, nameInput, teamIdNum, updateName]);

  const goToPreviousItem = useCallback(() => {
    if (!mediaItems || mediaItems.length === 0 || !selectedItem) return;
    const currentIndex = mediaItems.findIndex(
      (item) => item.type === selectedItem.type && item.id === selectedItem.id,
    );
    if (currentIndex > 0) {
      const prevItem = mediaItems[currentIndex - 1];
      setSelectedItem({ type: prevItem.type, id: prevItem.id });
      setShouldAutoplay(true);
    }
  }, [mediaItems, selectedItem]);

  const goToNextItem = useCallback(() => {
    if (!mediaItems || mediaItems.length === 0 || !selectedItem) return;
    const currentIndex = mediaItems.findIndex(
      (item) => item.type === selectedItem.type && item.id === selectedItem.id,
    );
    if (currentIndex < mediaItems.length - 1) {
      const nextItem = mediaItems[currentIndex + 1];
      setSelectedItem({ type: nextItem.type, id: nextItem.id });
      setShouldAutoplay(true);
    }
  }, [mediaItems, selectedItem]);

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

  const handleLoadedMetadata = useCallback(
    (metadata: {
      duration: number | null;
      width: number | null;
      height: number | null;
    }) => {
      // Only save metadata if it's a clip (not segment), is missing metadata, and user is a coach
      if (!selectedItem || selectedItem.type !== "clip" || team?.role !== "coach")
        return;
      if (!selectedClip) return;

      // Check if any metadata is missing
      const needsUpdate = !!(
        (selectedClip.width === null && metadata.width) ||
        (selectedClip.durationS === null && metadata.duration) ||
        (selectedClip.height === null && metadata.height)
      );

      if (needsUpdate) {
        updateMetadata.mutate({
          teamId: teamIdNum,
          clipId: selectedItem.id,
          ...(metadata.duration ? { durationS: metadata.duration } : {}),
          ...(metadata.width ? { width: metadata.width } : {}),
          ...(metadata.height ? { height: metadata.height } : {}),
        });
      }
    },
    [selectedItem, selectedClip, team?.role, teamIdNum, updateMetadata],
  );

  // Handle time update for segment creation
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
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

      // Ignore if any modifier keys are held
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
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
        if (selectedItem) {
          setIsTagDialogOpen(true);
        }
        return;
      }

      // Open rename dialog: r
      if (e.key === "r") {
        e.preventDefault();
        if (selectedItem) {
          setNameInput(selectedMedia?.name ?? "");
          setIsRenameDialogOpen(true);
        }
        return;
      }

      // Focus comment input: c
      if (e.key === "c") {
        e.preventDefault();
        commentSectionRef.current?.focusInput();
        return;
      }

      // Toggle comments (focus mode): f
      if (e.key === "f") {
        e.preventDefault();
        commentSectionRef.current?.toggle();
        return;
      }

      // Segment creation shortcuts (only for clips)
      if (e.key === "i" && selectedMedia?.type === "clip" && isCreatingSegment) {
        e.preventDefault();
        setSegmentMarkIn(currentTime);
        // Clear mark out if it's before mark in
        if (segmentMarkOut !== null && currentTime >= segmentMarkOut) {
          setSegmentMarkOut(null);
        }
        return;
      }

      if (e.key === "o" && selectedMedia?.type === "clip" && isCreatingSegment) {
        e.preventDefault();
        if (segmentMarkIn !== null && currentTime > segmentMarkIn) {
          setSegmentMarkOut(currentTime);
        }
        return;
      }

      if (!mediaItems || mediaItems.length === 0) return;

      const currentIndex = selectedItem
        ? mediaItems.findIndex(
            (item) =>
              item.type === selectedItem.type && item.id === selectedItem.id,
          )
        : -1;

      // Item navigation: j/k or ArrowDown/ArrowUp
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        if (currentIndex === -1) {
          setSelectedItem({
            type: mediaItems[0].type,
            id: mediaItems[0].id,
          });
        } else if (currentIndex < mediaItems.length - 1) {
          const nextItem = mediaItems[currentIndex + 1];
          setSelectedItem({ type: nextItem.type, id: nextItem.id });
        }
        setShouldAutoplay(true);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        if (currentIndex === -1) {
          const lastItem = mediaItems[mediaItems.length - 1];
          setSelectedItem({ type: lastItem.type, id: lastItem.id });
        } else if (currentIndex > 0) {
          const prevItem = mediaItems[currentIndex - 1];
          setSelectedItem({ type: prevItem.type, id: prevItem.id });
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
  }, [
    mediaItems,
    selectedItem,
    selectedMedia,
    seekBackward,
    seekForward,
    togglePlayPause,
    isCreatingSegment,
    currentTime,
    segmentMarkIn,
    segmentMarkOut,
  ]);

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
          {team?.role === "coach" && event && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link
                    href={`/teams/${teamId}/events/${eventId}/upload`}
                    className="flex items-center"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Clips
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setIsUploadLinkDialogOpen(true)}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Upload Links
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setIsEditEventDialogOpen(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Event
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Video Player Section - Full width on mobile, fixed at top */}
      {!isLoading && (
        <div className="sticky top-0 z-10 bg-background md:hidden">
          <Card className="rounded-none border-x-0">
            <CardContent className="p-0">
              {typeof "window" !== "undefined" && selectedMedia ? (
                (() => {
                  // Determine video source and status based on item type
                  const isSegment = selectedMedia.type === "segment";
                  const mediaWithRelations = selectedMedia as {
                    clip?: { status?: string; hlsPrefix?: string | null; storageKey?: string };
                    tags?: Array<{ tag: string }>;
                    startS?: number;
                    endS?: number;
                    status?: string;
                    hlsPrefix?: string | null;
                    storageKey?: string;
                  };
                  const sourceClip = isSegment ? mediaWithRelations.clip : mediaWithRelations;
                  const status = sourceClip?.status;
                  const hlsPrefix = sourceClip?.hlsPrefix;
                  const storageKey = sourceClip?.storageKey;
                  const displayName =
                    selectedMedia.name ??
                    (isSegment
                      ? `Segment #${selectedMedia.index}`
                      : `Clip #${selectedMedia.index}`);

                  if (status === "ready" && hlsPrefix) {
                    return (
                      <VidstackPlayer
                        ref={mobilePlayerRef}
                        key={`${selectedMedia.type}-${selectedMedia.id}`}
                        src={`${env.NEXT_PUBLIC_ASSETS_BASE}/${hlsPrefix}master.m3u8`}
                        autoplay={shouldAutoplay}
                        muted={true}
                        loop={true}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onNextClip={goToNextItem}
                        onPreviousClip={goToPreviousItem}
                        title={displayName}
                        tags={mediaWithRelations.tags?.map((t) => t.tag) ?? []}
                        segmentStart={isSegment ? mediaWithRelations.startS : undefined}
                        segmentEnd={isSegment ? mediaWithRelations.endS : undefined}
                      />
                    );
                  }
                  if (storageKey) {
                    return (
                      <VidstackPlayer
                        ref={mobilePlayerRef}
                        key={`${selectedMedia.type}-${selectedMedia.id}`}
                        src={`${env.NEXT_PUBLIC_ASSETS_BASE}/${storageKey}`}
                        autoplay={shouldAutoplay}
                        muted={true}
                        loop={true}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onNextClip={goToNextItem}
                        onPreviousClip={goToPreviousItem}
                        title={displayName}
                        tags={mediaWithRelations.tags?.map((t) => t.tag) ?? []}
                        segmentStart={isSegment ? mediaWithRelations.startS : undefined}
                        segmentEnd={isSegment ? mediaWithRelations.endS : undefined}
                      />
                    );
                  }
                  return (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <p className="text-muted-foreground">
                        {status === "processing"
                          ? "Processing..."
                          : status === "failed"
                            ? "Processing failed"
                            : "Waiting for upload"}
                      </p>
                    </div>
                  );
                })()
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
              onClick={goToPreviousItem}
              disabled={
                !mediaItems ||
                mediaItems.length === 0 ||
                !selectedItem ||
                mediaItems.findIndex(
                  (item) =>
                    item.type === selectedItem.type && item.id === selectedItem.id,
                ) === 0
              }
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={seekBackward}
              disabled={!selectedMedia}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayPause}
              disabled={!selectedMedia}
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
              disabled={!selectedMedia}
            >
              <RotateCw className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextItem}
              disabled={
                !mediaItems ||
                mediaItems.length === 0 ||
                !selectedItem ||
                mediaItems.findIndex(
                  (item) =>
                    item.type === selectedItem.type && item.id === selectedItem.id,
                ) ===
                  mediaItems.length - 1
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
                    {typeof "window" !== "undefined" && selectedMedia ? (
                      (() => {
                        // Determine video source and status based on item type
                        const isSegment = selectedMedia.type === "segment";
                        const mediaWithRelations = selectedMedia as {
                          clip?: { status?: string; hlsPrefix?: string | null; storageKey?: string };
                          tags?: Array<{ tag: string }>;
                          startS?: number;
                          endS?: number;
                          status?: string;
                          hlsPrefix?: string | null;
                          storageKey?: string;
                        };
                        const sourceClip = isSegment ? mediaWithRelations.clip : mediaWithRelations;
                        const status = sourceClip?.status;
                        const hlsPrefix = sourceClip?.hlsPrefix;
                        const storageKey = sourceClip?.storageKey;
                        const displayName =
                          selectedMedia.name ??
                          (isSegment
                            ? `Segment #${selectedMedia.index}`
                            : `Clip #${selectedMedia.index}`);

                        if (status === "ready" && hlsPrefix) {
                          return (
                            <VidstackPlayer
                              ref={desktopPlayerRef}
                              key={`${selectedMedia.type}-${selectedMedia.id}`}
                              src={`${env.NEXT_PUBLIC_ASSETS_BASE}/${hlsPrefix}master.m3u8`}
                              autoplay={shouldAutoplay}
                              muted={true}
                              loop={true}
                              onPlay={handlePlay}
                              onPause={handlePause}
                              onTimeUpdate={handleTimeUpdate}
                              onLoadedMetadata={handleLoadedMetadata}
                              onNextClip={goToNextItem}
                              onPreviousClip={goToPreviousItem}
                              title={displayName}
                              tags={mediaWithRelations.tags?.map((t) => t.tag) ?? []}
                              segmentStart={isSegment ? mediaWithRelations.startS : undefined}
                              segmentEnd={isSegment ? mediaWithRelations.endS : undefined}
                            />
                          );
                        }
                        if (storageKey) {
                          return (
                            <VidstackPlayer
                              ref={desktopPlayerRef}
                              key={`${selectedMedia.type}-${selectedMedia.id}`}
                              src={`${env.NEXT_PUBLIC_ASSETS_BASE}/${storageKey}`}
                              autoplay={shouldAutoplay}
                              muted={true}
                              loop={true}
                              onPlay={handlePlay}
                              onPause={handlePause}
                              onTimeUpdate={handleTimeUpdate}
                              onLoadedMetadata={handleLoadedMetadata}
                              onNextClip={goToNextItem}
                              onPreviousClip={goToPreviousItem}
                              title={displayName}
                              tags={mediaWithRelations.tags?.map((t) => t.tag) ?? []}
                              segmentStart={isSegment ? mediaWithRelations.startS : undefined}
                              segmentEnd={isSegment ? mediaWithRelations.endS : undefined}
                            />
                          );
                        }
                        return (
                          <div className="aspect-video bg-muted flex items-center justify-center">
                            <p className="text-muted-foreground">
                              {status === "processing"
                                ? "Processing..."
                                : status === "failed"
                                  ? "Processing failed"
                                  : "Waiting for upload"}
                            </p>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <p className="text-muted-foreground">
                          Select a clip to play
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Segment Creator - only show for clips, when coach */}
                {team?.role === "coach" && selectedMedia?.type === "clip" && (
                  <div className="mt-4">
                    {isCreatingSegment ? (
                      <SegmentCreator
                        clipId={selectedMedia.id}
                        clipDuration={selectedMedia.durationS}
                        teamId={teamIdNum}
                        eventId={eventIdNum}
                        currentTime={currentTime}
                        onSegmentCreated={() => {
                          setIsCreatingSegment(false);
                          setSegmentMarkIn(null);
                          setSegmentMarkOut(null);
                          refetchMedia();
                        }}
                        onCancel={() => {
                          setIsCreatingSegment(false);
                          setSegmentMarkIn(null);
                          setSegmentMarkOut(null);
                        }}
                      />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCreatingSegment(true)}
                      >
                        <Scissors className="h-4 w-4 mr-2" />
                        Create Segment
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <CommentSection
                ref={commentSectionRef}
                teamId={teamIdNum}
                clipId={selectedItem?.type === "clip" ? selectedItem.id : undefined}
                segmentId={selectedItem?.type === "segment" ? selectedItem.id : undefined}
                itemType={selectedItem?.type}
                isCoach={team?.role === "coach"}
              />
            </div>

            {/* Mobile Comments Section */}
            <div className="md:hidden">
              <CommentSection
                teamId={teamIdNum}
                clipId={selectedItem?.type === "clip" ? selectedItem.id : undefined}
                segmentId={selectedItem?.type === "segment" ? selectedItem.id : undefined}
                itemType={selectedItem?.type}
                isCoach={team?.role === "coach"}
              />
            </div>

            {/* Pending Clips Queue (coaches only) */}
            {team?.role === "coach" && pendingClips && pendingClips.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-amber-500" />
                    <h3 className="font-semibold">
                      Clips Pending Approval
                    </h3>
                  </div>
                  <PendingClipsTable
                    data={pendingClips}
                    onApprove={handleApproveClips}
                    onReject={handleRejectClip}
                    onRowClick={handlePendingClipClick}
                    selectedId={previewPendingClip?.id}
                    isApproving={approveClips.isPending}
                    isRejecting={rejectClip.isPending}
                  />
                </CardContent>
              </Card>
            )}

            {/* Data Table Section */}
            <DataTable
              columns={columns}
              data={mediaItems ?? []}
              onDeleteSelected={handleDeleteSelected}
              onAddToPlaylist={
                team?.role === "coach" ? handleAddToPlaylistSelected : undefined
              }
              onRowClick={handleRowClick}
              selectedId={selectedItem?.id}
            />
          </>
        )}
      </div>

      <AlertDialog
        open={itemsToDelete.length > 0}
        onOpenChange={(open: boolean) => !open && setItemsToDelete([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {itemsToDelete.length > 1 ? "Items" : "Item"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {itemsToDelete.length} item
              {itemsToDelete.length > 1 ? "s" : ""}? This action cannot be
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
                  <span className="text-muted-foreground">Rename clip</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">r</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Add tag</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">t</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Add comment</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">c</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Toggle comments</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">f</kbd>
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
              Add tags to {selectedMedia?.name ?? (selectedMedia?.type === "segment" ? `Segment #${selectedMedia?.index}` : `Clip #${selectedMedia?.index}`)}
              . Separate multiple tags with commas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const tags = (selectedMedia as { tags?: Array<{ id: number; tag: string }> })?.tags;
              return tags && tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Current tags:</p>
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        {tag.tag}
                        {team?.role === "coach" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTag(tag.id)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })()}
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

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {selectedMedia?.type === "segment" ? "Segment" : "Clip"}</DialogTitle>
            <DialogDescription>
              Set a name for{" "}
              {selectedMedia?.name ?? (selectedMedia?.type === "segment" ? `Segment #${selectedMedia?.index}` : `Clip #${selectedMedia?.index}`)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRename();
                } else if (e.key === "Escape") {
                  setIsRenameDialogOpen(false);
                  setNameInput("");
                }
              }}
              placeholder="Enter clip name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRenameDialogOpen(false);
                setNameInput("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {event && (
        <EditEventDialog
          event={event}
          teamId={teamIdNum}
          open={isEditEventDialogOpen}
          onOpenChange={setIsEditEventDialogOpen}
          hideTrigger={true}
        />
      )}

      <OnboardingDialog
        open={isOnboardingOpen}
        onComplete={handleOnboardingComplete}
      />

      <Dialog open={isUploadLinkDialogOpen} onOpenChange={setIsUploadLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Links</DialogTitle>
            <DialogDescription>
              Create shareable links for others to upload video clips to this event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Create new link section */}
            <div className="space-y-3">
              <Label>Create New Link</Label>
              <div className="flex gap-2">
                <Select
                  value={uploadLinkDuration}
                  onValueChange={(value: "1" | "3" | "7" | "30") => setUploadLinkDuration(value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleCreateUploadLink}
                  disabled={createUploadLink.isPending}
                >
                  {createUploadLink.isPending ? "Creating..." : "Create Link"}
                </Button>
              </div>
            </div>

            {/* Existing links section */}
            {uploadLinks && uploadLinks.length > 0 && (
              <div className="space-y-3">
                <Label>Active Links</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {uploadLinks.map((link) => {
                    const isExpired = new Date(link.expiresAt) < new Date();
                    return (
                      <div
                        key={link.id}
                        className={`flex items-center justify-between p-3 border rounded-lg ${
                          isExpired ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono truncate">
                            ...{link.token.slice(-8)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isExpired ? (
                              "Expired"
                            ) : (
                              <>Expires {format(new Date(link.expiresAt), "PPp")}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {!isExpired && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyUploadLink(link.id, link.token)}
                            >
                              {copiedLinkId === link.id ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRevokeUploadLink(link.id)}
                            disabled={revokeUploadLink.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {uploadLinks && uploadLinks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upload links yet. Create one above.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadLinkDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddToPlaylistDialog
        open={isAddToPlaylistOpen}
        onOpenChange={setIsAddToPlaylistOpen}
        teamId={teamIdNum}
        items={itemsToAddToPlaylist}
        onSuccess={() => setItemsToAddToPlaylist([])}
      />
    </>
  );
}
