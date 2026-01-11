"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ListPlus, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

interface AddToPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: number;
  items: Array<{ type: "clip" | "segment"; id: number }>;
  onSuccess?: () => void;
}

export function AddToPlaylistDialog({
  open,
  onOpenChange,
  teamId,
  items,
  onSuccess,
}: AddToPlaylistDialogProps) {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(
    null,
  );
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const trpc = useTRPC();

  const { data: playlists, isLoading } = useQuery(
    trpc.playlists.listForAddDialog.queryOptions({ teamId }),
  );

  const createPlaylist = useMutation(
    trpc.playlists.create.mutationOptions({
      onSuccess: (newPlaylist) => {
        // After creating, add items to the new playlist
        addItems.mutate({
          teamId,
          playlistId: newPlaylist.id,
          items,
        });
      },
    }),
  );

  const addItems = useMutation(
    trpc.playlists.addItems.mutationOptions({
      onSuccess: () => {
        onSuccess?.();
        handleClose();
      },
    }),
  );

  const handleClose = () => {
    setSelectedPlaylistId(null);
    setIsCreatingNew(false);
    setNewPlaylistName("");
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (isCreatingNew && newPlaylistName.trim()) {
      createPlaylist.mutate({
        teamId,
        name: newPlaylistName.trim(),
      });
    } else if (selectedPlaylistId) {
      addItems.mutate({
        teamId,
        playlistId: selectedPlaylistId,
        items,
      });
    }
  };

  const isPending = createPlaylist.isPending || addItems.isPending;
  const canSubmit = isCreatingNew
    ? newPlaylistName.trim().length > 0
    : selectedPlaylistId !== null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="h-5 w-5" />
            Add to Playlist
          </DialogTitle>
          <DialogDescription>
            Add {items.length} {items.length === 1 ? "item" : "items"} to a
            playlist
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : (
            <>
              {/* Create new playlist option */}
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(true);
                  setSelectedPlaylistId(null);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                  isCreatingNew && "border-primary bg-accent",
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Create new playlist</p>
                </div>
                {isCreatingNew && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>

              {/* New playlist name input */}
              {isCreatingNew && (
                <Input
                  placeholder="Playlist name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  autoFocus
                  className="mt-2"
                />
              )}

              {/* Existing playlists */}
              {playlists && playlists.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Existing playlists
                  </p>
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      type="button"
                      onClick={() => {
                        setSelectedPlaylistId(playlist.id);
                        setIsCreatingNew(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                        selectedPlaylistId === playlist.id &&
                          "border-primary bg-accent",
                      )}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                        <ListPlus className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {playlist.name}
                        </p>
                      </div>
                      {selectedPlaylistId === playlist.id && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isPending}>
            {isPending && <Spinner className="mr-2 h-4 w-4" />}
            {isCreatingNew ? "Create & Add" : "Add to Playlist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
