import type { Song } from '../domain/types';
import type { SongTransportSnapshot } from '../audio/useSongTransport';
import { Icon } from './ui/Icon';

interface SongTransportPanelProps {
  song: Song;
  transport: SongTransportSnapshot;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSeek: (positionMs: number) => void;
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function nextCue(song: Song, positionMs: number) {
  return [...song.lyricCues]
    .sort((a, b) => a.timeMs - b.timeMs)
    .find((cue) => cue.timeMs > positionMs + 20);
}

export function SongTransportPanel({
  song,
  transport,
  onPlay,
  onPause,
  onResume,
  onStop,
  onSeek,
}: SongTransportPanelProps) {
  const isActiveSong = transport.songId === song.id;
  const status = isActiveSong ? transport.status : 'idle';
  const positionMs = isActiveSong ? transport.positionMs : 0;
  const durationMs = isActiveSong ? transport.durationMs : 0;
  const cue = song.lyricControlMode === 'manual' ? undefined : nextCue(song, positionMs);
  const cueCountdown = cue ? Math.max(0, cue.timeMs - positionMs) : null;

  const missingTrack =
    song.playbackMode === 'slides-track' && !song.audio.singleTrackAssetId;
  const missingStems =
    song.playbackMode === 'slides-stems' && !song.audio.stems.some((stem) => stem.assetId);
  const usesVideo = song.playbackMode === 'lyrics-video';
  const canPlay = !usesVideo && !missingTrack && !missingStems;

  return (
    <section className="songTransportPanel">
      <header>
        <div>
          <Icon name="audio" />
          <div>
            <strong>SONG TRANSPORT</strong>
            <span>{isActiveSong ? status.toUpperCase() : 'READY'}</span>
          </div>
        </div>
        <div className="songTransportClock">
          <b>{formatTime(positionMs)}</b>
          <span>/ {durationMs ? formatTime(durationMs) : '--:--'}</span>
        </div>
      </header>

      <div className="songTransportBody">
        <div className="songTransportControls">
          {status === 'playing' ? (
            <button className="transportPrimary" type="button" onClick={onPause}>Ⅱ Pause</button>
          ) : status === 'paused' ? (
            <button className="transportPrimary" type="button" onClick={onResume}>▶ Resume</button>
          ) : (
            <button className="transportPrimary" type="button" onClick={onPlay} disabled={!canPlay}>▶ Play</button>
          )}
          <button type="button" onClick={onStop} disabled={!isActiveSong || status === 'idle'}>■ Stop</button>
        </div>

        <div className="songTransportTimeline">
          <input
            aria-label="Song position"
            max={Math.max(durationMs, 1)}
            min={0}
            onChange={(event) => onSeek(Number(event.target.value))}
            step={100}
            type="range"
            value={Math.min(positionMs, Math.max(durationMs, 1))}
            disabled={!isActiveSong || durationMs <= 0}
          />
          <div className="songCueReadout">
            {usesVideo ? (
              <span>Lyrics Video uses the Audience video player.</span>
            ) : missingTrack ? (
              <span>Assign a backing track before playback.</span>
            ) : missingStems ? (
              <span>Assign at least one stem before playback.</span>
            ) : song.lyricControlMode === 'manual' ? (
              <span>Manual lyrics · operator advances slides.</span>
            ) : cue && cueCountdown !== null ? (
              <>
                <span>{song.lyricControlMode === 'auto' ? 'AUTO NEXT' : 'NEXT CUE'} · {cue.label || cue.slideId}</span>
                <b>{(cueCountdown / 1000).toFixed(1)}s</b>
              </>
            ) : (
              <span>No further lyric cues.</span>
            )}
          </div>
        </div>
      </div>

      {isActiveSong && transport.warning ? <p className="songTransportWarning">{transport.warning}</p> : null}
      {isActiveSong && transport.error ? <p className="songTransportError">{transport.error}</p> : null}
    </section>
  );
}
