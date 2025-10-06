"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
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

export default function EventsPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: events, isLoading } = useQuery(
    trpc.events.listAll.queryOptions(),
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
                <BreadcrumbPage>Events</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Venue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow
                      key={event.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/teams/${event.teamId}/events/${event.id}`)
                      }
                    >
                      <TableCell className="font-medium">
                        {format(new Date(event.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{event.title}</TableCell>
                      <TableCell className="capitalize">{event.type}</TableCell>
                      <TableCell>{event.team.name}</TableCell>
                      <TableCell>{event.venue || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No events yet.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
