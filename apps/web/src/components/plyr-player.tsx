"use client";

import Hls from "hls.js";
import type Plyr from "plyr";
import { memo, useEffect, useRef, useState } from "react";

interface PlyrPlayerProps {
  src: string;
  poster?: string;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  autoplay?: boolean;
}

/**
 *
 * Plyr Player is an instance of https://github.com/sampotts/plyr
 */
export const PlyrPlayer = memo(function PlyrPlayer({
  src,
  poster,
  onTimeUpdate,
  onEnded,
  autoplay = false,
}: PlyrPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize player once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mounted = true;

    const initPlayer = async () => {
      // Create video element dynamically
      const el = document.createElement("video");
      el.playsInline = true;
      videoRef.current = el;

      // Add track element
      const track = document.createElement("track");
      track.kind = "captions";
      el.appendChild(track);

      container.appendChild(el);

      const Plyr = (await import("plyr")).default;
      if (!mounted) return;

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

      setInitialized(true);
    };

    initPlayer();

    return () => {
      mounted = false;
      const player = playerRef.current;
      const hls = hlsRef.current;

      if (player) {
        try {
          player.destroy();
        } catch {
          // Ignore errors during cleanup
        }
      }
      if (hls) {
        try {
          hls.destroy();
        } catch {
          // Ignore errors during cleanup
        }
      }
      // Clear the container
      if (container) {
        container.innerHTML = "";
      }
      playerRef.current = null;
      hlsRef.current = null;
      videoRef.current = null;
      setInitialized(false);
    };
  }, [onTimeUpdate, onEnded]);

  // Update source when src changes or player is initialized
  useEffect(() => {
    if (!initialized) return;

    const el = videoRef.current;
    const player = playerRef.current;
    if (!el || !player) return;

    // Clean up old HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Update poster
    if (poster) {
      el.poster = poster;
    }

    // Load new source
    if (src.endsWith(".m3u8") && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(el);
      hlsRef.current = hls;
    } else {
      el.src = src;
    }

    // Autoplay if requested
    if (autoplay) {
      player.play();
    }
  }, [initialized, src, poster, autoplay]);

  return <div className="aspect-video" ref={containerRef} />;
});
