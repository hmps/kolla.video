"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Film, Scissors } from "lucide-react";
import { use, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VidstackPlayer } from "@/components/vidstack-player";
import env from "@/env/client";
import { useTRPC } from "@/trpc/client";

// Type for unified media item
type ShareMediaItem =
  | {
      type: "clip";
      id: number;
      index: number;
      name: string | null;
      status: string;
      durationS: number | null;
      hlsPrefix: string | null;
      storageKey: string;
      tags: Array<{ id: number; tag: string }>;
    }
  | {
      type: "segment";
      id: number;
      index: number;
      name: string | null;
      startS: number;
      endS: number;
      clip: {
        id: number;
        status: string;
        hlsPrefix: string | null;
        storageKey: string;
      };
      tags: Array<{ id: number; tag: string }>;
    };

export default function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const trpc = useTRPC();
  const { data, isLoading, error } = useQuery(
    trpc.shares.getViaToken.queryOptions({
      token,
    }),
  );

  // Create unified media list
  const mediaItems = useMemo(() => {
    if (!data) return [];

    const clips: ShareMediaItem[] = data.event.clips
      .filter((c) => c.status === "ready")
      .map((c) => ({
        type: "clip" as const,
        id: c.id,
        index: c.index,
        name: c.name,
        status: c.status,
        durationS: c.durationS,
        hlsPrefix: c.hlsPrefix,
        storageKey: c.storageKey,
        tags: c.tags,
      }));

    const segments: ShareMediaItem[] = (data.event.segments ?? [])
      .filter((s) => s.clip.status === "ready")
      .map((s) => ({
        type: "segment" as const,
        id: s.id,
        index: s.index,
        name: s.name,
        startS: s.startS,
        endS: s.endS,
        clip: {
          id: s.clip.id,
          status: s.clip.status,
          hlsPrefix: s.clip.hlsPrefix,
          storageKey: s.clip.storageKey,
        },
        tags: s.tags,
      }));

    return [...clips, ...segments].sort((a, b) => a.index - b.index);
  }, [data]);

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
  const selectedItem = mediaItems[selectedIndex];

  // Helper to get video source for an item
  const getVideoSource = (item: ShareMediaItem) => {
    if (item.type === "segment") {
      return item.clip.hlsPrefix
        ? `${env.NEXT_PUBLIC_ASSETS_BASE}/${item.clip.hlsPrefix}master.m3u8`
        : `${env.NEXT_PUBLIC_ASSETS_BASE}/${item.clip.storageKey}`;
    }
    return item.hlsPrefix
      ? `${env.NEXT_PUBLIC_ASSETS_BASE}/${item.hlsPrefix}master.m3u8`
      : `${env.NEXT_PUBLIC_ASSETS_BASE}/${item.storageKey}`;
  };

  // Helper to get duration display
  const getDurationDisplay = (item: ShareMediaItem) => {
    const duration =
      item.type === "segment" ? item.endS - item.startS : item.durationS;
    if (!duration) return null;
    const mins = Math.floor(duration / 60);
    const secs = Math.floor(duration % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">{event.title}</h1>
        <p className="text-muted-foreground">
          {format(new Date(event.date), "PPP")} •{" "}
          <span className="capitalize">{event.type}</span>
        </p>
      </div>

      {mediaItems.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            {selectedItem && (
              <Card>
                <CardContent className="p-0">
                  <VidstackPlayer
                    key={`${selectedItem.type}-${selectedItem.id}`}
                    src={getVideoSource(selectedItem)}
                    segmentStart={
                      selectedItem.type === "segment"
                        ? selectedItem.startS
                        : undefined
                    }
                    segmentEnd={
                      selectedItem.type === "segment"
                        ? selectedItem.endS
                        : undefined
                    }
                    loop={true}
                    muted={true}
                    autoplay={true}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Media</CardTitle>
                <CardDescription>{mediaItems.length} items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mediaItems.map((item, index) => (
                    <Card
                      key={`${item.type}-${item.id}`}
                      className={`cursor-pointer transition-colors ${
                        index === selectedIndex
                          ? "bg-accent"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => setSelectedIndex(index)}
                    >
                      <CardHeader className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            {item.type === "segment" ? (
                              <Scissors className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Film className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="text-sm">
                              <p className="font-medium">
                                {item.name ??
                                  (item.type === "segment"
                                    ? `Segment #${item.index}`
                                    : `Clip #${item.index}`)}
                              </p>
                              {getDurationDisplay(item) && (
                                <p className="text-xs text-muted-foreground">
                                  {getDurationDisplay(item)}
                                </p>
                              )}
                            </div>
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-end max-w-[120px]">
                              {item.tags.slice(0, 2).map((t) => (
                                <Badge
                                  key={t.id}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {t.tag}
                                </Badge>
                              ))}
                              {item.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{item.tags.length - 2}
                                </Badge>
                              )}
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
