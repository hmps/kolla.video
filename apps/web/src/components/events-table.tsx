"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { EditEventDialog } from "@/components/edit-event-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EventsTableProps {
  events:
    | {
        id: number;
        title: string;
        date: Date | string;
        type: "game" | "practice";
        venue: string | null;
        notes: string | null;
        teamId: number;
      }[]
    | undefined;
  isLoading: boolean;
  showEditButton?: boolean;
  teamId?: number;
}

export function EventsTable({
  events,
  isLoading,
  showEditButton = false,
  teamId,
}: EventsTableProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Notes</TableHead>
              {showEditButton && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading state
              <TableRow key={`skeleton-${i}`}>
                <TableCell>
                  <Skeleton className="h-5 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-40" />
                </TableCell>
                {showEditButton && (
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Venue</TableHead>
            <TableHead>Notes</TableHead>
            {showEditButton && <TableHead className="w-[50px]"></TableHead>}
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
              <TableCell className="font-medium">{event.title}</TableCell>
              <TableCell>{format(new Date(event.date), "PPP")}</TableCell>
              <TableCell className="capitalize">{event.type}</TableCell>
              <TableCell className="text-muted-foreground">
                {event.venue || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {event.notes || "-"}
              </TableCell>
              {showEditButton && teamId && (
                <TableCell>
                  <EditEventDialog event={event} teamId={teamId} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
