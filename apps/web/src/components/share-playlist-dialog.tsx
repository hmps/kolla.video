"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, Copy, Link2, Plus, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useTRPC } from "@/trpc/client";

interface SharePlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: number;
  playlistId: number;
}

export function SharePlaylistDialog({
  open,
  onOpenChange,
  teamId,
  playlistId,
}: SharePlaylistDialogProps) {
  const [expirationDays, setExpirationDays] = useState<"1" | "7" | "30" | "never">("7");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const { data: shareLinks, refetch: refetchLinks } = useQuery(
    trpc.playlists.listShareLinks.queryOptions({
      teamId,
      playlistId,
    }),
  );

  const createLink = useMutation(
    trpc.playlists.createShareLink.mutationOptions({
      onSuccess: () => {
        refetchLinks();
        queryClient.invalidateQueries({ queryKey: ["playlists"] });
      },
    }),
  );

  const revokeLink = useMutation(
    trpc.playlists.revokeShareLink.mutationOptions({
      onSuccess: () => {
        refetchLinks();
        queryClient.invalidateQueries({ queryKey: ["playlists"] });
      },
    }),
  );

  const handleCreateLink = () => {
    const expiresAt =
      expirationDays === "never"
        ? undefined
        : new Date(Date.now() + Number.parseInt(expirationDays) * 24 * 60 * 60 * 1000);

    createLink.mutate({
      teamId,
      playlistId,
      expiresAt,
    });
  };

  const handleCopyLink = async (token: string, linkId: number) => {
    const url = `${window.location.origin}/share/playlist/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(linkId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevokeLink = (linkId: number) => {
    revokeLink.mutate({
      teamId,
      shareLinkId: linkId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Share Playlist
          </DialogTitle>
          <DialogDescription>
            Create shareable links for this playlist.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Create new link section */}
          <div className="space-y-3">
            <Label>Create new link</Label>
            <div className="flex gap-2">
              <Select
                value={expirationDays}
                onValueChange={(value) =>
                  setExpirationDays(value as "1" | "7" | "30" | "never")
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Expiration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Expires in 1 day</SelectItem>
                  <SelectItem value="7">Expires in 7 days</SelectItem>
                  <SelectItem value="30">Expires in 30 days</SelectItem>
                  <SelectItem value="never">Never expires</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleCreateLink} disabled={createLink.isPending}>
                {createLink.isPending ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create
              </Button>
            </div>
          </div>

          {/* Existing links */}
          {shareLinks && shareLinks.length > 0 && (
            <div className="space-y-3">
              <Label>Active links</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {shareLinks.map((link) => {
                  const isExpired = !!(link.expiresAt && new Date(link.expiresAt) < new Date());
                  return (
                    <div
                      key={link.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isExpired ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono truncate">
                          ...{link.token.slice(-8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {link.expiresAt
                            ? isExpired
                              ? "Expired"
                              : `Expires ${format(new Date(link.expiresAt), "MMM d, yyyy")}`
                            : "Never expires"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopyLink(link.token, link.id)}
                          disabled={isExpired}
                        >
                          {copiedId === link.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRevokeLink(link.id)}
                          disabled={revokeLink.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {shareLinks && shareLinks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No share links yet. Create one above.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
