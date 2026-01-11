// Types for unified clip/segment handling

export type ClipItem = {
  type: "clip";
  id: number;
  teamId: number;
  eventId: number;
  index: number;
  name: string | null;
  storageKey: string;
  hlsPrefix: string | null;
  durationS: number | null;
  width: number | null;
  height: number | null;
  status: "uploaded" | "processing" | "ready" | "failed";
  failReason: string | null;
  createdAt: Date;
  uploader: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  tags: Array<{ id: number; tag: string }>;
  players: Array<{ player: { id: number; name: string; number: number | null } }>;
  comments: Array<{ id: number }>;
};

export type SegmentItem = {
  type: "segment";
  id: number;
  teamId: number;
  eventId: number;
  clipId: number;
  index: number;
  name: string | null;
  startS: number;
  endS: number;
  createdAt: Date;
  clip: {
    id: number;
    storageKey: string;
    hlsPrefix: string | null;
    status: "uploaded" | "processing" | "ready" | "failed";
    durationS: number | null;
    width: number | null;
    height: number | null;
  };
  creator: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  tags: Array<{ id: number; tag: string }>;
  players: Array<{ player: { id: number; name: string; number: number | null } }>;
  comments: Array<{ id: number }>;
};

export type MediaItem = ClipItem | SegmentItem;

// Type guard to check if an item is a segment
export function isSegment(item: MediaItem): item is SegmentItem {
  return item.type === "segment";
}

// Type guard to check if an item is a clip
export function isClip(item: MediaItem): item is ClipItem {
  return item.type === "clip";
}

// Get the duration of a media item (segment uses endS - startS)
export function getMediaDuration(item: MediaItem): number | null {
  if (isSegment(item)) {
    return item.endS - item.startS;
  }
  return item.durationS;
}

// Get the video source URL for a media item
export function getMediaSource(
  item: MediaItem,
  assetsBase: string,
): string | null {
  if (isSegment(item)) {
    const clip = item.clip;
    if (clip.status === "ready" && clip.hlsPrefix) {
      return `${assetsBase}/${clip.hlsPrefix}master.m3u8`;
    }
    return clip.storageKey ? `${assetsBase}/${clip.storageKey}` : null;
  }

  if (item.status === "ready" && item.hlsPrefix) {
    return `${assetsBase}/${item.hlsPrefix}master.m3u8`;
  }
  return item.storageKey ? `${assetsBase}/${item.storageKey}` : null;
}

// Get the status of a media item (segments inherit from parent clip)
export function getMediaStatus(
  item: MediaItem,
): "uploaded" | "processing" | "ready" | "failed" {
  if (isSegment(item)) {
    return item.clip.status;
  }
  return item.status;
}

// Get the display name for a media item
export function getMediaDisplayName(item: MediaItem): string {
  if (item.name) {
    return item.name;
  }
  return isSegment(item) ? `Segment #${item.index}` : `Clip #${item.index}`;
}

// Format duration in seconds to MM:SS or HH:MM:SS
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
