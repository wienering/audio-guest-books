"use client";

import type { MutableRefObject } from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { FastForward, Pause, Play, Rewind } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatFileDisplayName } from "@/lib/format-file-display-name";
import { cn } from "@/lib/utils";

export type RetailAudioFile = {
  id: string;
  originalFilename: string;
  durationSeconds: number | null;
  playbackUrl: string;
  /** When playing transcoded MP3, downloadable lossless id */
  losslessOriginalFileId?: string | null;
  uploadedAtIso: string;
};

export type RetailAudioPlayerHandle = {
  togglePlayPause: () => void;
};

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export const RetailAudioPlayer = forwardRef<
  RetailAudioPlayerHandle,
  {
    files: RetailAudioFile[];
    activeFileId: string | null;
    /** Parent sets true immediately before selecting a track from user/advance; cleared here after load */
    autoplayNextTrackLoadRef: MutableRefObject<boolean>;
    onAdvanceToNext: () => void;
    onFirstPlayLogged: (fileId: string) => void;
  }
>(function AudioPlayer(
  {
    files,
    activeFileId,
    autoplayNextTrackLoadRef,
    onAdvanceToNext,
    onFirstPlayLogged,
  },
  ref
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeIdRef = useRef(activeFileId);
  const loggedRef = useRef(new Set<string>());

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  activeIdRef.current = activeFileId;

  useImperativeHandle(ref, () => ({
    togglePlayPause: () => {
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) void a.play();
      else a.pause();
    },
  }));

  const activeFile = files.find((f) => f.id === activeFileId) ?? null;

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !activeFileId) return;
    const f = files.find((x) => x.id === activeFileId);
    if (!f) return;
    a.src = f.playbackUrl;
    const wantPlay = autoplayNextTrackLoadRef.current;
    autoplayNextTrackLoadRef.current = false;
    if (wantPlay) void a.play().catch(() => {});
  }, [activeFileId, autoplayNextTrackLoadRef, files]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => setCurrentTime(a.currentTime);
    const onDur = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setDuration(a.duration);
      }
    };
    const onPlay = () => {
      setIsPlaying(true);
      const id = activeIdRef.current;
      if (id && !loggedRef.current.has(id)) {
        loggedRef.current.add(id);
        onFirstPlayLogged(id);
      }
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      onAdvanceToNext();
    };

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, [onAdvanceToNext, onFirstPlayLogged]);

  const skip = useCallback((delta: number) => {
    const a = audioRef.current;
    if (!a || !Number.isFinite(a.duration)) return;
    a.currentTime = Math.min(
      Math.max(0, a.currentTime + delta),
      a.duration
    );
  }, []);

  const onSeek = useCallback((t: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = t;
    setCurrentTime(t);
  }, []);

  const maxDur = Number.isFinite(duration) && duration > 0 ? duration : 0;

  return (
    <div
      className="rounded-xl border p-4 sm:p-6"
      style={{
        borderColor: "var(--brand-body-border)",
        background: "var(--brand-player-bg)",
      }}
    >
      <audio ref={audioRef} preload="metadata" className="hidden" />
      <p
        className="text-lg font-semibold tracking-tight sm:text-xl"
        style={{ color: "var(--brand-player-text)" }}
      >
        {activeFile
          ? formatFileDisplayName(activeFile.originalFilename)
          : "No recording selected"}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-11 min-h-11 min-w-11 shrink-0 rounded-full border bg-transparent p-0 hover:bg-transparent"
          style={{
            borderColor: "var(--brand-body-border)",
            color: "var(--brand-player-text)",
          }}
          onClick={() => skip(-10)}
          aria-label="Skip back 10 seconds"
        >
          <Rewind className="size-5" aria-hidden />
        </Button>
        <Button
          type="button"
          className="h-12 w-12 min-h-12 min-w-12 shrink-0 rounded-full border-0 p-0 hover:brightness-110"
          style={{
            background: "var(--brand-player-control-bg)",
            color: "var(--brand-player-control-icon)",
          }}
          onClick={() => {
            const el = audioRef.current;
            if (!el) return;
            if (el.paused) void el.play();
            else el.pause();
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-6" aria-hidden />
          ) : (
            <Play className="size-6 translate-x-px" aria-hidden />
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-11 min-h-11 min-w-11 shrink-0 rounded-full border bg-transparent p-0 hover:bg-transparent"
          style={{
            borderColor: "var(--brand-body-border)",
            color: "var(--brand-player-text)",
          }}
          onClick={() => skip(10)}
          aria-label="Skip forward 10 seconds"
        >
          <FastForward className="size-5" aria-hidden />
        </Button>
      </div>
      <div className="mt-6 space-y-2">
        <input
          type="range"
          min={0}
          max={maxDur || 0}
          step={0.1}
          value={Math.min(currentTime, maxDur || 0)}
          onChange={(e) => onSeek(Number(e.target.value))}
          disabled={!activeFileId || !maxDur}
          className={cn(
            "retail-audio-range h-11 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          )}
          aria-label="Seek playback"
        />
        <div
          className="flex justify-between text-base tabular-nums sm:text-lg"
          style={{ color: "var(--brand-player-text)" }}
        >
          <span>{formatClock(currentTime)}</span>
          <span>{formatClock(maxDur)}</span>
        </div>
      </div>
    </div>
  );
});

RetailAudioPlayer.displayName = "RetailAudioPlayer";
