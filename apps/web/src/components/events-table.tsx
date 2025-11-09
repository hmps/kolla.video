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
        clipCount?: number;
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
              <TableHead className="text-right">Clips</TableHead>
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
                <TableCell className="text-right">
                  <Skeleton className="h-5 w-8" />
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
    <>
      {/* Mobile view - card-based layout */}
      <div className="md:hidden space-y-3">
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            className="rounded-lg w-full text-left border p-4 cursor-pointer hover:bg-accent transition-colors"
            onClick={() =>
              router.push(`/teams/${event.teamId}/events/${event.id}`)
            }
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-medium">{event.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.date), "PPP")}
                </p>
              </div>
              <div className="text-sm font-medium ml-2">
                {event.clipCount ?? 0} clips
              </div>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="capitalize">{event.type}</span>
              {event.venue && <span>• {event.venue}</span>}
            </div>
            {showEditButton && teamId && (
              <div className="mt-3 pt-3 border-t">
                <EditEventDialog event={event} teamId={teamId} />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Desktop view - table layout */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Clips</TableHead>
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
                <TableCell className="text-right">
                  {event.clipCount ?? 0}
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
    </>
  );
}
