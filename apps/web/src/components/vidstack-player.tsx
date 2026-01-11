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
  onLoadedMetadata?: (metadata: {
    duration: number | null;
    width: number | null;
    height: number | null;
  }) => void;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onNextClip?: () => void;
  onPreviousClip?: () => void;
  title?: string;
  tags?: string[];
  // Segment boundary props
  segmentStart?: number; // Start time in seconds for segments
  segmentEnd?: number; // End time in seconds for segments
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
      onLoadedMetadata,
      autoplay = false,
      muted = true,
      loop = true,
      title,
      tags,
      segmentStart,
      segmentEnd,
    },
    ref,
  ) {
    const playerRef = useRef<MediaPlayerInstance>(null);
    const hasSeekToStartRef = useRef(false);

    // Expose player instance via ref
    useImperativeHandle(ref, () => ({
      player: playerRef.current,
    }));

    // Reset seek flag when src changes
    useEffect(() => {
      hasSeekToStartRef.current = false;
    }, [src]);

    // Handle autoplay and initial seek for segments
    useEffect(() => {
      const player = playerRef.current;
      if (!player) return;

      const handleCanPlay = () => {
        // Seek to segment start if defined and not already done
        if (segmentStart !== undefined && !hasSeekToStartRef.current) {
          player.currentTime = segmentStart;
          hasSeekToStartRef.current = true;
        }

        // Auto play if requested
        if (autoplay) {
          player.play().catch((error) => {
            console.warn("Autoplay failed:", error);
          });
        }
      };

      player.addEventListener("can-play", handleCanPlay);

      return () => {
        player.removeEventListener("can-play", handleCanPlay);
      };
    }, [autoplay, segmentStart]);

    // Handle event callbacks and segment boundary enforcement
    useEffect(() => {
      const player = playerRef.current;
      if (!player) return;

      const handleTimeUpdate = () => {
        // Report time update
        if (onTimeUpdate) {
          onTimeUpdate(player.currentTime);
        }

        // Enforce segment end boundary
        if (segmentEnd !== undefined && player.currentTime >= segmentEnd) {
          if (loop && segmentStart !== undefined) {
            // Loop back to segment start
            player.currentTime = segmentStart;
          } else {
            // Pause at segment end
            player.pause();
            if (onEnded) {
              onEnded();
            }
          }
        }
      };

      const handleEnded = () => {
        // Only call onEnded if we're not in segment mode (segment mode handles this in timeUpdate)
        if (segmentEnd === undefined && onEnded) {
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

      const handleLoadedMetadata = () => {
        if (onLoadedMetadata) {
          const videoEl = player.el?.querySelector("video");

          onLoadedMetadata({
            duration: videoEl?.duration ? Math.round(videoEl?.duration) : null,
            width: videoEl?.videoWidth ?? null,
            height: videoEl?.videoHeight ?? null,
          });
        }
      };

      player.addEventListener("time-update", handleTimeUpdate);
      player.addEventListener("ended", handleEnded);
      player.addEventListener("play", handlePlay);
      player.addEventListener("pause", handlePause);
      player.addEventListener("loaded-metadata", handleLoadedMetadata);

      return () => {
        player.removeEventListener("time-update", handleTimeUpdate);
        player.removeEventListener("ended", handleEnded);
        player.removeEventListener("play", handlePlay);
        player.removeEventListener("pause", handlePause);
        player.removeEventListener("loaded-metadata", handleLoadedMetadata);
      };
    }, [onTimeUpdate, onEnded, onPlay, onPause, onLoadedMetadata, segmentStart, segmentEnd, loop]);

    const displayTitle = title
      ? tags && tags.length > 0
        ? `${title} • ${tags.map((tag) => `#${tag}`).join(", ")}`
        : title
      : undefined;

    return (
      <MediaPlayer
        ref={playerRef}
        src={src}
        poster={poster}
        autoPlay={autoplay}
        muted={muted}
        loop={loop}
        playsInline
        className="aspect-video"
        keyDisabled
        title={displayTitle}
      >
        <MediaProvider />
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    );
  }),
);
