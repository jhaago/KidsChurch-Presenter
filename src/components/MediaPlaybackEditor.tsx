import { useEffect, useRef, useState } from 'react';
import {
  clearMediaPlaybackSettings,
  getMediaPlaybackSettings,
  setMediaPlaybackSettings,
} from '../domain/mediaPlayback';
import type { MediaAsset } from '../domain/types';

interface MediaPlaybackEditorProps {
  asset?: MediaAsset;
  defaultLoop: boolean;
  isLive: boolean;
  onRetrigger: (asset: MediaAsset) => void;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00.0';
  const wholeMinutes = Math.floor(seconds / 60);
  const remaining = seconds - wholeMinutes * 60;
  return `${wholeMinutes}:${remaining.toFixed(1).padStart(4, '0')}`;
}

export function MediaPlaybackEditor({
  asset,
  defaultLoop,
  isLive,
  onRetrigger,
}: MediaPlaybackEditorProps) {
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const [loop, setLoop] = useState(defaultLoop);
  const [trimStart, setTrimStart] = useState('0');
  const [trimEnd, setTrimEnd] = useState('');
  const [duration, setDuration] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const playable = asset?.kind === 'motion' || asset?.kind === 'video';

  useEffect(() => {
    if (!asset) return;
    const saved = getMediaPlaybackSettings(asset.id);
    setLoop(saved.loop ?? defaultLoop);
    setTrimStart(((saved.trimStartMs ?? 0) / 1000).toString());
    setTrimEnd(saved.trimEndMs ? (saved.trimEndMs / 1000).toString() : '');
    setDuration(0);
    setPlayhead(0);
    setError(null);
  }, [asset?.id, defaultLoop]);

  if (!asset) {
    return (
      <div className="mediaPlaybackEditor isEmpty">
        <strong>MEDIA PLAYBACK</strong>
        <span>Select a media item to adjust loop and trim settings.</span>
      </div>
    );
  }

  if (!playable) {
    return (
      <div className="mediaPlaybackEditor isStill">
        <div>
          <strong>MEDIA PLAYBACK · {asset.title}</strong>
          <span>Still images do not need loop or trim controls.</span>
        </div>
      </div>
    );
  }

  const apply = () => {
    const parsedStart = Number(trimStart || 0);
    const parsedEnd = trimEnd.trim() ? Number(trimEnd) : undefined;

    if (!Number.isFinite(parsedStart) || parsedStart < 0) {
      setError('In point must be zero or greater.');
      return;
    }
    if (parsedEnd !== undefined && (!Number.isFinite(parsedEnd) || parsedEnd <= parsedStart)) {
      setError('Out point must be later than the In point.');
      return;
    }
    if (duration > 0 && parsedStart >= duration) {
      setError('In point must be before the end of the media.');
      return;
    }

    const clampedEnd = parsedEnd === undefined
      ? undefined
      : duration > 0
        ? Math.min(parsedEnd, duration)
        : parsedEnd;

    setMediaPlaybackSettings(asset.id, {
      loop,
      trimStartMs: Math.round(parsedStart * 1000),
      trimEndMs: clampedEnd === undefined ? undefined : Math.round(clampedEnd * 1000),
    });
    setTrimStart(parsedStart.toString());
    setTrimEnd(clampedEnd === undefined ? '' : clampedEnd.toString());
    setError(null);

    if (isLive) onRetrigger(asset);
  };

  const reset = () => {
    clearMediaPlaybackSettings(asset.id);
    setLoop(defaultLoop);
    setTrimStart('0');
    setTrimEnd('');
    setError(null);
    if (previewRef.current) previewRef.current.currentTime = 0;
    if (isLive) onRetrigger(asset);
  };

  const setInFromPlayhead = () => {
    const next = Math.max(0, playhead);
    setTrimStart(next.toFixed(2));
    const parsedEnd = trimEnd.trim() ? Number(trimEnd) : undefined;
    if (parsedEnd !== undefined && parsedEnd <= next) setTrimEnd('');
    setError(null);
  };

  const setOutFromPlayhead = () => {
    const start = Number(trimStart || 0);
    if (playhead <= start) {
      setError('Move the preview playhead after the In point before setting Out.');
      return;
    }
    setTrimEnd(playhead.toFixed(2));
    setError(null);
  };

  return (
    <section className="mediaPlaybackEditor">
      <div className="mediaPlaybackPreview">
        {asset.fileUrl ? (
          <video
            key={asset.id}
            ref={previewRef}
            src={asset.fileUrl}
            controls
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => {
              const nextDuration = Number.isFinite(event.currentTarget.duration)
                ? event.currentTarget.duration
                : 0;
              setDuration(nextDuration);
              const savedStart = Number(trimStart || 0);
              if (savedStart > 0 && savedStart < nextDuration) {
                event.currentTarget.currentTime = savedStart;
              }
            }}
            onTimeUpdate={(event) => setPlayhead(event.currentTarget.currentTime)}
            onSeeked={(event) => setPlayhead(event.currentTarget.currentTime)}
          />
        ) : (
          <div className="mediaPlaybackNoPreview">Preview unavailable</div>
        )}
      </div>

      <div className="mediaPlaybackControls">
        <div className="mediaPlaybackHeading">
          <div>
            <strong>MEDIA PLAYBACK · {asset.title}</strong>
            <span>{isLive ? 'LIVE NOW' : asset.kind.toUpperCase()} · non-destructive settings saved for this media</span>
          </div>
          <button type="button" className="mediaPlaybackReset" onClick={reset}>Reset</button>
        </div>

        <div className="mediaPlaybackControlRow">
          <label className="mediaLoopToggle">
            <input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} />
            <span>Loop</span>
          </label>

          <label>
            <span>IN</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={trimStart}
              onChange={(event) => setTrimStart(event.target.value)}
            />
            <small>sec</small>
          </label>
          <button type="button" onClick={setInFromPlayhead}>Set In</button>

          <label>
            <span>OUT</span>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder={duration > 0 ? duration.toFixed(1) : 'End'}
              value={trimEnd}
              onChange={(event) => setTrimEnd(event.target.value)}
            />
            <small>sec</small>
          </label>
          <button type="button" onClick={setOutFromPlayhead}>Set Out</button>

          <button type="button" className="mediaPlaybackApply" onClick={apply}>Apply</button>
        </div>

        <div className="mediaPlaybackReadout">
          <span>Preview {formatTime(playhead)}</span>
          <span>{duration > 0 ? `Duration ${formatTime(duration)}` : 'Duration —'}</span>
          <span>{trimEnd.trim() ? `Trim ${trimStart || '0'}s → ${trimEnd}s` : `Trim ${trimStart || '0'}s → End`}</span>
        </div>
        {error ? <div className="mediaPlaybackError">{error}</div> : null}
      </div>
    </section>
  );
}
