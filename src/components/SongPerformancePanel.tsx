import { useMemo } from 'react';
import type { SongTransportSnapshot } from '../audio/useSongTransport';
import { arrangedSlides } from '../domain/songArrangement';
import type { MediaAsset, OutputState, Presentation, Slide, Song } from '../domain/types';
import { Icon } from './ui/Icon';

interface SongPerformancePanelProps {
  song: Song;
  presentation: Presentation;
  assets: MediaAsset[];
  output: OutputState;
  transport: SongTransportSnapshot;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSeek: (positionMs: number) => void;
  onSelectSlide: (slideId: string, arrangementEntryId?: string) => void;
  onTriggerSlide: (presentation: Presentation, slide: Slide, arrangementEntryId?: string) => void;
  onTriggerLyricsVideo: (asset: MediaAsset) => void;
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
}

function cleanText(text?: string | null) {
  return text?.replace(/\n/g, ' / ') || '—';
}

export function SongPerformancePanel({
  song,
  presentation,
  assets,
  output,
  transport,
  onPlay,
  onPause,
  onResume,
  onStop,
  onSeek,
  onSelectSlide,
  onTriggerSlide,
  onTriggerLyricsVideo,
}: SongPerformancePanelProps) {
  const sequence = useMemo(() => arrangedSlides(song, presentation), [presentation, song]);
  const active = transport.songId === song.id;
  const status = active ? transport.status : 'idle';
  const positionMs = active ? transport.positionMs : 0;
  const durationMs = active ? transport.durationMs : 0;
  const liveIndex = output.slide?.presentationId === presentation.id
    ? sequence.findIndex((item) =>
        item.slide.id === output.slide?.slideId &&
        (!output.slide?.arrangementEntryId || item.arrangementEntryId === output.slide.arrangementEntryId),
      )
    : -1;
  const current = liveIndex >= 0 ? sequence[liveIndex] : undefined;
  const next = sequence[liveIndex >= 0 ? liveIndex + 1 : 0];
  const previous = liveIndex > 0 ? sequence[liveIndex - 1] : undefined;
  const lyricsVideo = song.lyricsVideoAssetId
    ? assets.find((asset) => asset.id === song.lyricsVideoAssetId)
    : undefined;
  const missingTrack = song.playbackMode === 'slides-track' && !song.audio.singleTrackAssetId;
  const missingStems = song.playbackMode === 'slides-stems' && !song.audio.stems.some((stem) => stem.assetId);
  const canPlay = song.playbackMode !== 'lyrics-video' && !missingTrack && !missingStems;

  const triggerOccurrence = (occurrence: (typeof sequence)[number] | undefined) => {
    if (!occurrence) return;
    onSelectSlide(occurrence.slide.id, occurrence.arrangementEntryId);
    onTriggerSlide(presentation, occurrence.slide, occurrence.arrangementEntryId);
  };

  return (
    <section className="songPerformancePanel">
      <header className="songPerformanceHeader">
        <div className="songPerformanceIdentity">
          <span className="performanceLiveMark"><Icon name="audio" /></span>
          <div>
            <strong>PERFORM SONG</strong>
            <span>{song.title}</span>
          </div>
        </div>
        <div className="performanceStatus">
          <b>{active ? status.toUpperCase() : 'READY'}</b>
          <span>{song.playbackMode.replaceAll('-', ' ')} · {song.lyricControlMode} lyrics</span>
        </div>
      </header>

      <div className="songPerformanceBody">
        <section className="performanceTransport">
          <div className="performanceTransportButtons">
            {song.playbackMode === 'lyrics-video' ? (
              <button
                className="performancePrimary"
                type="button"
                disabled={!lyricsVideo?.fileUrl}
                onClick={() => lyricsVideo && onTriggerLyricsVideo(lyricsVideo)}
              >
                <Icon name="media" /> SHOW LYRICS VIDEO
              </button>
            ) : status === 'playing' ? (
              <button className="performancePrimary" type="button" onClick={onPause}>Ⅱ PAUSE</button>
            ) : status === 'paused' ? (
              <button className="performancePrimary" type="button" onClick={onResume}>▶ RESUME</button>
            ) : (
              <button className="performancePrimary" type="button" disabled={!canPlay} onClick={onPlay}>▶ START SONG</button>
            )}
            {song.playbackMode !== 'lyrics-video' ? (
              <button type="button" disabled={!active || status === 'idle'} onClick={onStop}>■ STOP</button>
            ) : null}
          </div>

          {song.playbackMode !== 'lyrics-video' ? (
            <div className="performanceTimeline">
              <b>{formatTime(positionMs)}</b>
              <input
                aria-label="Live song position"
                min={0}
                max={Math.max(durationMs, 1)}
                step={100}
                type="range"
                value={Math.min(positionMs, Math.max(durationMs, 1))}
                disabled={!active || durationMs <= 0}
                onChange={(event) => onSeek(Number(event.target.value))}
              />
              <span>{durationMs ? formatTime(durationMs) : '--:--'}</span>
            </div>
          ) : null}

          {missingTrack ? <p className="performanceWarning">Build mode: assign a backing track before performance.</p> : null}
          {missingStems ? <p className="performanceWarning">Build mode: assign at least one stem before performance.</p> : null}
          {song.playbackMode === 'lyrics-video' && !lyricsVideo?.fileUrl ? (
            <p className="performanceWarning">Build mode: assign a lyrics video before performance.</p>
          ) : null}
        </section>

        <section className="performanceLyrics">
          <div className="performanceLyricCard isCurrent">
            <small>CURRENT / LIVE</small>
            <strong>{cleanText(current?.slide.text)}</strong>
            <span>{current ? `Slide ${current.sequence}` : 'No lyric slide is live'}</span>
          </div>
          <div className="performanceLyricCard isNext">
            <small>NEXT</small>
            <strong>{cleanText(next?.slide.text)}</strong>
            <span>{next ? `Slide ${next.sequence}` : 'End of song'}</span>
          </div>
          <div className="performanceLyricActions">
            <button type="button" disabled={!previous} onClick={() => triggerOccurrence(previous)}>← PREVIOUS</button>
            <button className="performanceGo" type="button" disabled={!next} onClick={() => triggerOccurrence(next)}>GO NEXT →</button>
          </div>
        </section>
      </div>

      {song.playbackMode === 'slides-stems' ? (
        <div className="performanceStemStrip">
          <div>
            <strong>LIVE STEM MIX</strong>
            <span>{active ? 'Session-only controls · restarting uses saved Build defaults' : 'Start the song to adjust the live mix'}</span>
          </div>
          <div className="performanceStemButtons">
            {song.audio.stems.filter((stem) => stem.assetId).map((stem) => {
              const enabled = active
                ? transport.stemEnabled[stem.id] ?? stem.enabled
                : stem.enabled;
              return (
                <button
                  className={enabled ? 'isEnabled' : ''}
                  key={stem.id}
                  type="button"
                  disabled={!active || !['playing', 'paused'].includes(status)}
                  onClick={() => transport.setStemEnabled(stem.id, !enabled)}
                >
                  <strong>{stem.name}</strong>
                  <span>{enabled ? 'ON' : 'OFF'}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <footer className="songPerformanceFooter">
        <span><b>PERFORMANCE MODE</b> only runs the prepared Song. Use Build to change lyrics, arrangement, audio files, timing or visual design.</span>
      </footer>
    </section>
  );
}
