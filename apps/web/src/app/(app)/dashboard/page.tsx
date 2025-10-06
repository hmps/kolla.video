"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTRPC } from "@/trpc/client";

export default function Page() {
  const trpc = useTRPC();
  const { data: teams, isLoading: teamsLoading } = useQuery(
    trpc.dashboard.myTeams.queryOptions(),
  );
  const { data: recentEvents, isLoading: eventsLoading } = useQuery(
    trpc.dashboard.recentEvents.queryOptions(),
  );

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
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid gap-4 md:grid-cols-2">
          {/* My Teams Widget */}
          <Card>
            <CardHeader>
              <CardTitle>My Teams</CardTitle>
              <CardDescription>Teams you&apos;re a member of</CardDescription>
            </CardHeader>
            <CardContent>
              {teamsLoading ? (
                <div className="text-muted-foreground text-sm">Loading...</div>
              ) : teams && teams.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell>
                          <Link
                            href={`/teams/${team.id}/events`}
                            className="hover:underline"
                          >
                            {team.name}
                          </Link>
                        </TableCell>
                        <TableCell className="capitalize">
                          {team.role}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground text-sm">
                  No teams yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Events Widget */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>
                Latest 5 events across all teams
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="text-muted-foreground text-sm">Loading...</div>
              ) : recentEvents && recentEvents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Clips</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Link
                            href={`/teams/${event.teamId}/events/${event.id}`}
                            className="hover:underline"
                          >
                            {event.title}
                          </Link>
                        </TableCell>
                        <TableCell>{event.teamName}</TableCell>
                        <TableCell className="text-right">
                          {event.clipCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground text-sm">
                  No events yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notifications Widget */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Recent activity and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-sm">
              No notifications yet. The notification system will be implemented
              in a future update.
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
