"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { use, useState } from "react";
import { PlyrPlayer } from "@/components/plyr-player";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";

export default function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [selectedClipIndex, setSelectedClipIndex] = useState(0);

  const trpc = useTRPC();
  const { data, isLoading, error } = useQuery(
    trpc.shares.getViaToken.queryOptions({
      token,
    }),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardHeader>
            <CardTitle>Invalid or Expired Link</CardTitle>
            <CardDescription>
              This share link is not valid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { event } = data;
  const clips = event.clips.filter((c) => c.status === "ready");
  const selectedClip = clips[selectedClipIndex];

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">{event.title}</h1>
        <p className="text-muted-foreground">
          {format(new Date(event.date), "PPP")} •{" "}
          <span className="capitalize">{event.type}</span>
        </p>
      </div>

      {clips.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            {selectedClip && (
              <Card>
                <CardContent className="p-0">
                  {selectedClip.hlsPrefix && (
                    <PlyrPlayer
                      src={`${process.env.NEXT_PUBLIC_ASSETS_BASE}${selectedClip.hlsPrefix}master.m3u8`}
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Clips</CardTitle>
                <CardDescription>{clips.length} clips</CardDescription>
              </CardHeader>
              <CardContent>
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
                            {clip.durationS && (
                              <p className="text-xs text-muted-foreground">
                                {Math.floor(clip.durationS / 60)}:
                                {String(
                                  Math.floor(clip.durationS % 60),
                                ).padStart(2, "0")}
                              </p>
                            )}
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
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No clips available for this event yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
