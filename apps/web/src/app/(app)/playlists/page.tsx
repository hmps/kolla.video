"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ListPlus, MoreVertical, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
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
import { useTRPC } from "@/trpc/client";

export default function PlaylistsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [playlistToDelete, setPlaylistToDelete] = useState<{
    id: number;
    teamId: number;
    name: string;
  } | null>(null);

  const { data: playlists, isLoading } = useQuery(
    trpc.playlists.listAll.queryOptions(),
  );

  const createPlaylist = useMutation(
    trpc.playlists.create.mutationOptions({
      onSuccess: (newPlaylist) => {
        queryClient.invalidateQueries({ queryKey: ["playlists"] });
        setIsCreateDialogOpen(false);
        setNewPlaylistName("");
        setNewPlaylistDescription("");
        router.push(`/teams/${newPlaylist.teamId}/playlists/${newPlaylist.id}`);
      },
    }),
  );

  const deletePlaylist = useMutation(
    trpc.playlists.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["playlists"] });
        setPlaylistToDelete(null);
      },
    }),
  );

  // Get user's teams for creation
  const { data: teams } = useQuery(trpc.teams.list.queryOptions());
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const handleCreatePlaylist = () => {
    const teamId = selectedTeamId || teams?.[0]?.id;
    if (!teamId || !newPlaylistName.trim()) return;

    createPlaylist.mutate({
      teamId,
      name: newPlaylistName.trim(),
      description: newPlaylistDescription.trim() || undefined,
    });
  };

  const handleRowClick = (playlist: { id: number; teamId: number }) => {
    router.push(`/teams/${playlist.teamId}/playlists/${playlist.id}`);
  };

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
                <BreadcrumbPage>Playlists</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Your Playlists</h2>
            {teams && teams.some((t) => t.role === "coach") && (
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Playlist
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : !playlists || playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-md">
              <ListPlus className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No playlists yet. Create one to organize your clips.
              </p>
              {teams && teams.some((t) => t.role === "coach") && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Playlist
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile view */}
              <div className="md:hidden space-y-3">
                {playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleRowClick(playlist)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{playlist.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {playlist.team?.name}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlaylistToDelete({
                                id: playlist.id,
                                teamId: playlist.teamId,
                                name: playlist.name,
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{playlist.items?.length ?? 0} items</span>
                      <span>
                        {format(new Date(playlist.updatedAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop view */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playlists.map((playlist) => (
                      <TableRow
                        key={playlist.id}
                        className="cursor-pointer"
                        onClick={() => handleRowClick(playlist)}
                      >
                        <TableCell className="font-medium">
                          {playlist.name}
                        </TableCell>
                        <TableCell>{playlist.team?.name}</TableCell>
                        <TableCell>{playlist.items?.length ?? 0}</TableCell>
                        <TableCell>
                          {format(new Date(playlist.updatedAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPlaylistToDelete({
                                    id: playlist.id,
                                    teamId: playlist.teamId,
                                    name: playlist.name,
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Playlist Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Playlist</DialogTitle>
            <DialogDescription>
              Create a new playlist to organize your clips.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {teams && teams.filter((t) => t.role === "coach").length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <select
                  id="team"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={selectedTeamId || ""}
                  onChange={(e) =>
                    setSelectedTeamId(Number(e.target.value) || null)
                  }
                >
                  <option value="">Select a team</option>
                  {teams
                    .filter((t) => t.role === "coach")
                    .map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Description"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlaylist}
              disabled={
                !newPlaylistName.trim() ||
                createPlaylist.isPending ||
                (!selectedTeamId && (!teams || teams.length === 0))
              }
            >
              {createPlaylist.isPending && <Spinner className="mr-2 h-4 w-4" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!playlistToDelete}
        onOpenChange={(open) => !open && setPlaylistToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{playlistToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (playlistToDelete) {
                  deletePlaylist.mutate({
                    teamId: playlistToDelete.teamId,
                    playlistId: playlistToDelete.id,
                  });
                }
              }}
            >
              {deletePlaylist.isPending && <Spinner className="mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
