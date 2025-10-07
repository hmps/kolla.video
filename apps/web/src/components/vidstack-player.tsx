"use client";

import {
  MediaPlayer,
  type MediaPlayerInstance,
  MediaProvider,
} from "@vidstack/react";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

interface VidstackPlayerProps {
  src: string;
  poster?: string;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onNextClip?: () => void;
  onPreviousClip?: () => void;
}

export interface VidstackPlayerRef {
  player: MediaPlayerInstance | null;
}

/**
 * Vidstack Player component - https://vidstack.io
 * Supports HLS streaming and direct video playback
 */
export const VidstackPlayer = memo(
  forwardRef<VidstackPlayerRef, VidstackPlayerProps>(function VidstackPlayer(
    {
      src,
      poster,
      onTimeUpdate,
      onEnded,
      onPlay,
      onPause,
      autoplay = false,
      muted = true,
      loop = true,
      onNextClip,
      onPreviousClip,
    },
    ref,
  ) {
    const playerRef = useRef<MediaPlayerInstance>(null);

    // Expose player instance via ref
    useImperativeHandle(ref, () => ({
      player: playerRef.current,
    }));

    // Handle autoplay when source or autoplay prop changes
    useEffect(() => {
      const player = playerRef.current;
      if (!player || !autoplay) return;

      const handleCanPlay = () => {
        player.play().catch((error) => {
          console.warn("Autoplay failed:", error);
        });
      };

      player.addEventListener("can-play", handleCanPlay);

      return () => {
        player.removeEventListener("can-play", handleCanPlay);
      };
    }, [src, autoplay]);

    // Handle event callbacks
    useEffect(() => {
      const player = playerRef.current;
      if (!player) return;

      const handleTimeUpdate = () => {
        if (onTimeUpdate) {
          onTimeUpdate(player.currentTime);
        }
      };

      const handleEnded = () => {
        if (onEnded) {
          onEnded();
        }
      };

      const handlePlay = () => {
        if (onPlay) {
          onPlay();
        }
      };

      const handlePause = () => {
        if (onPause) {
          onPause();
        }
      };

      player.addEventListener("time-update", handleTimeUpdate);
      player.addEventListener("ended", handleEnded);
      player.addEventListener("play", handlePlay);
      player.addEventListener("pause", handlePause);

      return () => {
        player.removeEventListener("time-update", handleTimeUpdate);
        player.removeEventListener("ended", handleEnded);
        player.removeEventListener("play", handlePlay);
        player.removeEventListener("pause", handlePause);
      };
    }, [onTimeUpdate, onEnded, onPlay, onPause]);

    return (
      <MediaPlayer
        ref={playerRef}
        src={src}
        poster={poster}
        autoplay={autoplay}
        muted={muted}
        loop={loop}
        playsInline
        className="aspect-video"
        keyDisabled
      >
        <MediaProvider />
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    );
  }),
);
