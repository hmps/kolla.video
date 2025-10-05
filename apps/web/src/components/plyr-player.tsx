"use client";

import Hls from "hls.js";
import Plyr from "plyr";
import { useEffect, useRef } from "react";

interface PlyrPlayerProps {
  src: string;
  poster?: string;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
}

export function PlyrPlayer({
  src,
  poster,
  onTimeUpdate,
  onEnded,
}: PlyrPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let hls: Hls | null = null;

    if (Hls.isSupported() && src.endsWith(".m3u8")) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(el);
      hlsRef.current = hls;
    } else {
      el.src = src;
    }

    const player = new Plyr(el, {
      controls: [
        "play",
        "progress",
        "current-time",
        "mute",
        "volume",
        "settings",
        "fullscreen",
      ],
      settings: ["quality", "speed"],
    });

    playerRef.current = player;

    if (onTimeUpdate) {
      player.on("timeupdate", () => {
        onTimeUpdate(player.currentTime);
      });
    }

    if (onEnded) {
      player.on("ended", onEnded);
    }

    return () => {
      player.destroy();
      hls?.destroy();
    };
  }, [src, onTimeUpdate, onEnded]);

  return (
    <video ref={videoRef} playsInline poster={poster}>
      <track kind="captions" />
    </video>
  );
}
