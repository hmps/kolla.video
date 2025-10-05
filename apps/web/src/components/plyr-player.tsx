"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";

interface PlyrPlayerProps {
  src: string;
  poster?: string;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
}

/**
 *
 * Plyr Player is an instance of https://github.com/sampotts/plyr
 */
export function PlyrPlayer({
  src,
  poster,
  onTimeUpdate,
  onEnded,
}: PlyrPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let hls: Hls | null = null;
    let cleanup: (() => void) | undefined;

    const initPlayer = async () => {
      if (src.endsWith(".m3u8") && Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(el);
        hlsRef.current = hls;
      } else if (el.canPlayType("video/mp4")) {
        el.src = src;
      } else {
        el.src = src;
      }

      const Plyr = (await import("plyr")).default;
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
        seekTime: 1,
        settings: ["quality", "speed"],
        keyboard: {
          global: true,
        },
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

      cleanup = () => {
        player.destroy();
        hls?.destroy();
      };
    };

    initPlayer();

    return () => {
      cleanup?.();
    };
  }, [src, onTimeUpdate, onEnded]);

  return (
    <video ref={videoRef} playsInline poster={poster}>
      <track kind="captions" />
    </video>
  );
}
