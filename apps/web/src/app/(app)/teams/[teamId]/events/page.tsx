"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTRPC } from "@/trpc/client";
import { EditEventDialog } from "@/components/edit-event-dialog";

export default function EventsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const router = useRouter();
  const teamIdNum = Number.parseInt(teamId, 10);

  const trpc = useTRPC();
  const { data: team } = useQuery(
    trpc.teams.get.queryOptions({ teamId: teamIdNum }),
  );
  const { data: events, isLoading } = useQuery(
    trpc.events.list.queryOptions({ teamId: teamIdNum }),
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
          <Link href={`/teams/${teamId}/events/new`}>
            <Button>New Event</Button>
          </Link>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner className="size-8" />
            </div>
          ) : events && events.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow
                      key={event.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/teams/${teamId}/events/${event.id}`)
                      }
                    >
                      <TableCell className="font-medium">
                        {event.title}
                      </TableCell>
                      <TableCell>
                        {format(new Date(event.date), "PPP")}
                      </TableCell>
                      <TableCell className="capitalize">{event.type}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {event.venue || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {event.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <EditEventDialog event={event} teamId={teamIdNum} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No events yet. Create one to get started.
              </p>
              <Link href={`/teams/${teamId}/events/new`}>
                <Button>Create Your First Event</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
