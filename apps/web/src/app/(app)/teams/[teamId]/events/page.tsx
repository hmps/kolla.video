"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTRPC } from "@/trpc/client";

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
  const { data: events } = useQuery(
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
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
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

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>Games and practices</CardDescription>
        </CardHeader>
        <CardContent>
          {events && events.length > 0 ? (
            <div className="space-y-2">
              {events.map((event) => (
                <Card
                  key={event.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() =>
                    router.push(`/teams/${teamId}/events/${event.id}`)
                  }
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                        <CardDescription>
                          {format(new Date(event.date), "PPP")} •{" "}
                          <span className="capitalize">{event.type}</span>
                        </CardDescription>
                      </div>
                    </div>
                    {event.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {event.notes}
                      </p>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No events yet. Create one to get started.
            </p>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </>
  );
}
