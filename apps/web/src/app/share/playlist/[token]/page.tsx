"use client";

import { useQuery } from "@tanstack/react-query";
import { Film, ListVideo, Scissors } from "lucide-react";
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

interface PlaylistMediaItem {
  id: number;
  position: number;
  type: "clip" | "segment";
  name: string;
  eventName: string;
  durationS: number | null;
  videoSrc: string;
  segmentStart?: number;
  segmentEnd?: number;
  tags: Array<{ id: number; tag: string }>;
}

export default function SharedPlaylistPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const trpc = useTRPC();
  const { data, isLoading, error } = useQuery(
    trpc.playlists.getViaToken.queryOptions({ token }),
  );

  // Transform playlist items into a unified format
  const mediaItems = useMemo((): PlaylistMediaItem[] => {
    if (!data?.playlist?.items) return [];

    const items: PlaylistMediaItem[] = [];

    for (const item of data.playlist.items) {
      if (item.segment && item.segment.clip) {
        const clip = item.segment.clip;
        const isReady = clip.status === "ready";
        const src = isReady && clip.hlsPrefix
          ? `${env.NEXT_PUBLIC_ASSETS_BASE}/${clip.hlsPrefix}/master.m3u8`
          : `${env.NEXT_PUBLIC_ASSETS_BASE}/${clip.storageKey}`;

        items.push({
          id: item.id,
          position: item.position,
          type: "segment",
          name: item.segment.name || `Segment ${item.position + 1}`,
          eventName: item.segment.event?.title || "Unknown Event",
          durationS: item.segment.endS - item.segment.startS,
          videoSrc: src,
          segmentStart: item.segment.startS,
          segmentEnd: item.segment.endS,
          tags: item.segment.tags?.map((t: { id: number; tag: string }) => ({ id: t.id, tag: t.tag })) || [],
        });
      } else if (item.clip) {
        const isReady = item.clip.status === "ready";
        const src = isReady && item.clip.hlsPrefix
          ? `${env.NEXT_PUBLIC_ASSETS_BASE}/${item.clip.hlsPrefix}/master.m3u8`
          : `${env.NEXT_PUBLIC_ASSETS_BASE}/${item.clip.storageKey}`;

        items.push({
          id: item.id,
          position: item.position,
          type: "clip",
          name: item.clip.name || `Clip ${item.position + 1}`,
          eventName: item.clip.event?.title || "Unknown Event",
          durationS: item.clip.durationS,
          videoSrc: src,
          tags: item.clip.tags?.map((t: { id: number; tag: string }) => ({ id: t.id, tag: t.tag })) || [],
        });
      }
    }

    return items;
  }, [data]);

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !data?.playlist) {
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

  const { playlist } = data;
  const selectedItem = mediaItems[selectedIndex];

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ListVideo className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl md:text-3xl font-bold">{playlist.name}</h1>
        </div>
        {playlist.description && (
          <p className="text-muted-foreground">{playlist.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          {playlist.team?.name} • {mediaItems.length} items
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
                    src={selectedItem.videoSrc}
                    segmentStart={selectedItem.segmentStart}
                    segmentEnd={selectedItem.segmentEnd}
                    loop={true}
                    muted={true}
                    autoplay={true}
                  />
                </CardContent>
                <CardHeader className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedItem.name}</CardTitle>
                      <CardDescription>{selectedItem.eventName}</CardDescription>
                    </div>
                    {selectedItem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedItem.tags.map((tag) => (
                          <Badge key={tag.id} variant="secondary">
                            {tag.tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            )}
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Playlist</CardTitle>
                <CardDescription>{mediaItems.length} items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {mediaItems.map((item, index) => (
                    <Card
                      key={item.id}
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
                            <span className="text-xs font-mono text-muted-foreground w-4">
                              {index + 1}
                            </span>
                            {item.type === "segment" ? (
                              <Scissors className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Film className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="text-sm min-w-0">
                              <p className="font-medium truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {item.eventName}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-mono text-muted-foreground">
                              {formatDuration(item.durationS)}
                            </span>
                            {item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 justify-end max-w-[80px]">
                                {item.tags.slice(0, 1).map((t) => (
                                  <Badge
                                    key={t.id}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {t.tag}
                                  </Badge>
                                ))}
                                {item.tags.length > 1 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{item.tags.length - 1}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
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
              This playlist has no items yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
