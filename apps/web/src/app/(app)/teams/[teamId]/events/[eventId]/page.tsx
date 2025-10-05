"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { PlyrPlayer } from "@/components/plyr-player";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ teamId: string; eventId: string }>;
}) {
  const { teamId, eventId } = use(params);
  const teamIdNum = Number.parseInt(teamId, 10);
  const eventIdNum = Number.parseInt(eventId, 10);

  const [selectedClipIndex, setSelectedClipIndex] = useState(0);
  const [commentBody, setCommentBody] = useState("");

  const trpc = useTRPC();
  const { data: team } = useQuery(
    trpc.teams.get.queryOptions({ teamId: teamIdNum }),
  );
  const { data: event } = useQuery(
    trpc.events.get.queryOptions({
      teamId: teamIdNum,
      eventId: eventIdNum,
    }),
  );
  const { data: clips } = useQuery(
    trpc.clips.byEvent.queryOptions({
      teamId: teamIdNum,
      eventId: eventIdNum,
    }),
  );
  const { data: comments, refetch: refetchComments } = useQuery(
    trpc.comments.byClip.queryOptions(
      {
        teamId: teamIdNum,
        clipId: clips?.[selectedClipIndex]?.id ?? 0,
      },
      {
        enabled: !!clips?.[selectedClipIndex]?.id,
      },
    ),
  );

  const addComment = useMutation(
    trpc.comments.add.mutationOptions({
      onSuccess: () => {
        setCommentBody("");
        refetchComments();
      },
    }),
  );

  const selectedClip = clips?.[selectedClipIndex];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "j":
          e.preventDefault();
          if (selectedClipIndex > 0) {
            setSelectedClipIndex((i) => i - 1);
          }
          break;
        case "k":
          e.preventDefault();
          if (clips && selectedClipIndex < clips.length - 1) {
            setSelectedClipIndex((i) => i + 1);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedClipIndex, clips]);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClip && commentBody.trim()) {
      addComment.mutate({
        teamId: teamIdNum,
        clipId: selectedClip.id,
        body: commentBody.trim(),
      });
    }
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
                <BreadcrumbLink href={`/teams/${teamId}/events`}>
                  Events
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{event?.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto flex items-center gap-2 px-4">
          {event && (
            <p className="text-sm text-muted-foreground mr-4">
              {format(new Date(event.date), "PPP")} •{" "}
              <span className="capitalize">{event.type}</span>
            </p>
          )}
          <Link href={`/teams/${teamId}/events/${eventId}/upload`}>
            <Button>Upload Clips</Button>
          </Link>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
          {selectedClip ? (
            <>
              <Card>
                <CardContent className="p-0">
                  {selectedClip.status === "ready" && selectedClip.hlsPrefix ? (
                    <PlyrPlayer
                      src={`${process.env.NEXT_PUBLIC_ASSETS_BASE}${selectedClip.hlsPrefix}master.m3u8`}
                    />
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <p className="text-muted-foreground">
                        {selectedClip.status === "processing"
                          ? "Processing..."
                          : selectedClip.status === "failed"
                            ? "Processing failed"
                            : "Waiting for upload"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Clip Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    <Badge
                      variant={
                        selectedClip.status === "ready"
                          ? "default"
                          : selectedClip.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {selectedClip.status}
                    </Badge>
                  </div>
                  {selectedClip.tags && selectedClip.tags.length > 0 && (
                    <div>
                      <span className="font-medium">Tags:</span>{" "}
                      {selectedClip.tags.map((t) => (
                        <Badge key={t.id} variant="outline" className="ml-1">
                          {t.tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {team?.role === "coach" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Comments</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={handleSubmitComment} className="space-y-2">
                      <Textarea
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        placeholder="Add a comment... (Press 'c' to focus)"
                        rows={3}
                      />
                      <Button
                        type="submit"
                        disabled={!commentBody.trim() || addComment.isPending}
                      >
                        Add Comment
                      </Button>
                    </form>

                    {comments && comments.length > 0 && (
                      <div className="space-y-3 mt-4">
                        {comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="border-l-2 pl-3 py-1"
                          >
                            <p className="text-sm font-medium">
                              {comment.author.email}
                            </p>
                            <p className="text-sm">{comment.body}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(comment.createdAt), "PPp")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  No clips yet. Upload some to get started.
                </p>
              </CardContent>
            </Card>
          )}
          </div>

          <div>
            <Card>
            <CardHeader>
              <CardTitle>Clips</CardTitle>
              <CardDescription>
                Use J/K to navigate • {clips?.length ?? 0} clips
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clips && clips.length > 0 ? (
                <div className="space-y-2">
                  {clips.map((clip, index) => (
                    <Card
                      key={clip.id}
                      className={`cursor-pointer transition-colors ${
                        index === selectedClipIndex
                          ? "bg-accent"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => setSelectedClipIndex(index)}
                    >
                      <CardHeader className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="text-sm">
                            <p className="font-medium">Clip #{index + 1}</p>
                            <p className="text-xs text-muted-foreground">
                              {clip.status}
                            </p>
                          </div>
                          {clip.tags && clip.tags.length > 0 && (
                            <div className="flex gap-1">
                              {clip.tags.map((t) => (
                                <Badge
                                  key={t.id}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {t.tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No clips yet</p>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </>
  );
}
