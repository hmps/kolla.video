"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use, useState } from "react";
import { EventsTable } from "@/components/events-table";
import { NewEventDialog } from "@/components/new-event-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTRPC } from "@/trpc/client";

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const teamIdNum = Number.parseInt(teamId, 10);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedMembershipIds, setSelectedMembershipIds] = useState<number[]>(
    [],
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const trpc = useTRPC();
  const { data: team } = useQuery(
    trpc.teams.get.queryOptions({ teamId: teamIdNum }),
  );
  const { data: availableUsers, refetch: refetchAvailable } = useQuery(
    trpc.teams.availableUsers.queryOptions({ teamId: teamIdNum }),
  );
  const {
    data: members,
    refetch: refetchMembers,
    isLoading: membersLoading,
  } = useQuery(trpc.teams.members.queryOptions({ teamId: teamIdNum }));
  const { data: events, isLoading: eventsLoading } = useQuery(
    trpc.events.list.queryOptions({ teamId: teamIdNum }),
  );

  const addMembersMutation = useMutation(
    trpc.teams.addMembers.mutationOptions({
      onSuccess: () => {
        refetchAvailable();
        refetchMembers();
        setSelectedUserIds([]);
        setIsAddDialogOpen(false);
      },
    }),
  );

  const removeMembersMutation = useMutation(
    trpc.teams.removeMembers.mutationOptions({
      onSuccess: () => {
        refetchMembers();
        refetchAvailable();
        setSelectedMembershipIds([]);
      },
    }),
  );

  const handleAddMembers = () => {
    if (selectedUserIds.length > 0) {
      addMembersMutation.mutate({
        teamId: teamIdNum,
        userIds: selectedUserIds,
        role: "player",
      });
    }
  };

  const handleRemoveMembers = () => {
    if (selectedMembershipIds.length > 0) {
      removeMembersMutation.mutate({
        teamId: teamIdNum,
        membershipIds: selectedMembershipIds,
      });
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const toggleMembershipSelection = (membershipId: number) => {
    setSelectedMembershipIds((prev) =>
      prev.includes(membershipId)
        ? prev.filter((id) => id !== membershipId)
        : [...prev, membershipId],
    );
  };

  const isCoach = team?.role === "coach";

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
                <BreadcrumbPage>{team?.name || "Team"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto flex items-center gap-2 px-4">
          <Link href={`/teams/${teamId}/players`}>
            <Button variant="outline">Roster</Button>
          </Link>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Events Section */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Events</h2>
              <NewEventDialog teamId={teamIdNum} />
            </div>

            {!eventsLoading && (!events || events.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="mb-4 text-muted-foreground">
                  No events yet. Create one to get started.
                </p>
                <NewEventDialog teamId={teamIdNum} />
              </div>
            ) : (
              <EventsTable
                events={events}
                isLoading={eventsLoading}
                showEditButton={isCoach}
                teamId={teamIdNum}
              />
            )}
          </div>

          {/* Current Members Section - Only visible to coaches */}
          {isCoach && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Team Members</h2>
                <div className="flex gap-2">
                  {selectedMembershipIds.length > 0 && (
                    <Button
                      variant="destructive"
                      onClick={handleRemoveMembers}
                      disabled={removeMembersMutation.isPending}
                    >
                      Remove Selected ({selectedMembershipIds.length})
                    </Button>
                  )}
                  <Dialog
                    open={isAddDialogOpen}
                    onOpenChange={setIsAddDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>Add Members</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Add Members to Team</DialogTitle>
                        <DialogDescription>
                          Select users from the list below to add them to your
                          team.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="max-h-[400px] overflow-y-auto">
                        {availableUsers && availableUsers.length > 0 ? (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[50px]"></TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Email</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {availableUsers.map((user) => (
                                  <TableRow key={user.id}>
                                    <TableCell>
                                      <Checkbox
                                        checked={selectedUserIds.includes(
                                          user.id,
                                        )}
                                        onCheckedChange={() =>
                                          toggleUserSelection(user.id)
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      {`${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                                        user.email}
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <p className="py-8 text-center text-muted-foreground">
                            No available users to add
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsAddDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddMembers}
                          disabled={
                            selectedUserIds.length === 0 ||
                            addMembersMutation.isPending
                          }
                        >
                          Add Selected ({selectedUserIds.length})
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {membersLoading ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 3 }).map((_, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading state
                        <TableRow key={`skeleton-${i}`}>
                          <TableCell>
                            <Skeleton className="h-4 w-4" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-20" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : members && members.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedMembershipIds.includes(
                                member.id,
                              )}
                              onCheckedChange={() =>
                                toggleMembershipSelection(member.id)
                              }
                            />
                          </TableCell>
                          <TableCell>{member.name}</TableCell>
                          <TableCell className="capitalize">
                            {member.role}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  No members yet
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
