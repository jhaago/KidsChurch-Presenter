import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SongTransportSnapshot } from '../audio/useSongTransport';
import type { Presentation, Slide, Song, SongLyricCue } from '../domain/types';
import { Icon } from './ui/Icon';

interface SongTimingEditorProps {
  song: Song;
  presentation: Presentation;
  transport: SongTransportSnapshot;
  getPositionMs: () => number;
  onChangeSong: (song: Song) => void;
  onPlayPreview: (song: Song) => Promise<boolean>;
  onPausePreview: () => void;
  onResumePreview: () => Promise<boolean>;
  onStopPreview: () => void;
  onSeekPreview: (positionMs: number) => Promise<void>;
}

interface TimingSlide {
  slide: Slide;
  groupName: string;
  groupType: string;
  sequence: number;
}

function allTimingSlides(presentation: Presentation): TimingSlide[] {
  let sequence = 0;
  return presentation.groups.flatMap((group) =>
    group.slides.map((slide) => ({
      slide,
      groupName: group.name,
      groupType: group.type,
      sequence: ++sequence,
    })),
  );
}

function formatTime(ms: number) {
  const safe = Math.max(0, Math.round(ms));
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const millis = safe % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

function cueId() {
  return `cue-${crypto.randomUUID()}`;
}

function labelFor(item: TimingSlide) {
  return `${item.groupName} · Slide ${item.sequence}`;
}

export function SongTimingEditor({
  song,
  presentation,
  transport,
  getPositionMs,
  onChangeSong,
  onPlayPreview,
  onPausePreview,
  onResumePreview,
  onStopPreview,
  onSeekPreview,
}: SongTimingEditorProps) {
  const slides = useMemo(() => allTimingSlides(presentation), [presentation]);
  const songRef = useRef(song);
  const [armed, setArmed] = useState(false);
  const [nextIndex, setNextIndex] = useState(0);
  const [message, setMessage] = useState('Ready to time lyrics.');
  const isPreviewSong = transport.songId === song.id;
  const canUseTrack =
    (song.playbackMode === 'slides-track' && Boolean(song.audio.singleTrackAssetId)) ||
    (song.playbackMode === 'slides-stems' && song.audio.stems.some((stem) => stem.assetId));
  const supportedMode = song.playbackMode === 'slides-track' || song.playbackMode === 'slides-stems';
  const canStart = supportedMode && canUseTrack && slides.length > 0;

  useEffect(() => {
    songRef.current = song;
  }, [song]);

  useEffect(() => {
    setArmed(false);
    setNextIndex(0);
    setMessage('Ready to time lyrics.');
    return () => onStopPreview();
  }, [song.id, onStopPreview]);

  const commitCues = useCallback((lyricCues: SongLyricCue[]) => {
    const nextSong = {
      ...songRef.current,
      lyricCues: [...lyricCues].sort((a, b) => a.timeMs - b.timeMs),
    };
    songRef.current = nextSong;
    onChangeSong(nextSong);
  }, [onChangeSong]);

  const cueForSlide = useCallback((slideId: string) => {
    return [...song.lyricCues]
      .sort((a, b) => a.timeMs - b.timeMs)
      .find((cue) => cue.slideId === slideId);
  }, [song.lyricCues]);

  const setCueForSlide = useCallback((item: TimingSlide, timeMs: number) => {
    const current = songRef.current;
    const existing = current.lyricCues.find((cue) => cue.slideId === item.slide.id);
    const nextCue: SongLyricCue = existing
      ? { ...existing, timeMs: Math.max(0, Math.round(timeMs)), label: existing.label || labelFor(item) }
      : {
          id: cueId(),
          timeMs: Math.max(0, Math.round(timeMs)),
          slideId: item.slide.id,
          label: labelFor(item),
        };
    commitCues([
      ...current.lyricCues.filter((cue) => cue.id !== existing?.id),
      nextCue,
    ]);
  }, [commitCues]);

  const clearCueForSlide = useCallback((slideId: string) => {
    commitCues(songRef.current.lyricCues.filter((cue) => cue.slideId !== slideId));
  }, [commitCues]);

  const captureNext = useCallback(() => {
    if (!armed || nextIndex >= slides.length) return;
    if (!isPreviewSong || transport.status !== 'playing') {
      setMessage('Preview must be playing before you tap a lyric cue.');
      return;
    }

    const item = slides[nextIndex];
    const captured = getPositionMs();
    setCueForSlide(item, captured);

    const following = nextIndex + 1;
    if (following >= slides.length) {
      setArmed(false);
      setNextIndex(slides.length);
      onPausePreview();
      setMessage('Timing pass complete. Preview paused for review.');
    } else {
      setNextIndex(following);
      setMessage(`Captured ${labelFor(item)} at ${formatTime(captured)}.`);
    }
  }, [
    armed,
    getPositionMs,
    isPreviewSong,
    nextIndex,
    onPausePreview,
    setCueForSlide,
    slides,
    transport.status,
  ]);

  const undoTap = useCallback(() => {
    if (!armed || nextIndex <= 0) return;
    const previousIndex = nextIndex - 1;
    clearCueForSlide(slides[previousIndex].slide.id);
    setNextIndex(previousIndex);
    setMessage(`Removed ${labelFor(slides[previousIndex])}. Tap it again when ready.`);
  }, [armed, clearCueForSlide, nextIndex, slides]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editingText = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (editingText) return;

      if (armed && event.code === 'Space') {
        event.preventDefault();
        captureNext();
      } else if (armed && event.key === 'Backspace') {
        event.preventDefault();
        undoTap();
      } else if (armed && event.key === 'Escape') {
        event.preventDefault();
        setArmed(false);
        setMessage('Tap mode disarmed. Existing cues were kept.');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [armed, captureNext, undoTap]);

  const startTapSession = useCallback(async () => {
    if (!canStart) return;
    if (songRef.current.lyricCues.length) {
      const replace = window.confirm('Replace all existing lyric timing cues with a new tap-through pass?');
      if (!replace) return;
    }

    const cleared = { ...songRef.current, lyricCues: [] };
    songRef.current = cleared;
    onChangeSong(cleared);
    onStopPreview();
    setNextIndex(0);
    setArmed(true);
    setMessage('Loading preview… Tap SPACE when the first lyric slide should appear.');

    const started = await onPlayPreview(cleared);
    if (!started) {
      setArmed(false);
      setMessage('Preview could not start. Check the assigned backing track or stems.');
    } else {
      setMessage('Tap mode armed. SPACE = next lyric cue · BACKSPACE = undo last tap · ESC = disarm.');
    }
  }, [canStart, onChangeSong, onPlayPreview, onStopPreview]);

  const armFromFirstMissing = useCallback(() => {
    const firstMissing = slides.findIndex((item) => !cueForSlide(item.slide.id));
    const index = firstMissing >= 0 ? firstMissing : 0;
    setNextIndex(index);
    setArmed(true);
    setMessage(`Tap mode armed from ${labelFor(slides[index])}. Start/resume preview, then press SPACE.`);
  }, [cueForSlide, slides]);

  const adjustCue = useCallback((item: TimingSlide, deltaMs: number) => {
    const cue = cueForSlide(item.slide.id);
    if (!cue) return;
    setCueForSlide(item, cue.timeMs + deltaMs);
  }, [cueForSlide, setCueForSlide]);

  const setCueSeconds = useCallback((item: TimingSlide, seconds: number) => {
    if (!Number.isFinite(seconds)) return;
    setCueForSlide(item, seconds * 1000);
  }, [setCueForSlide]);

  const clearAll = useCallback(() => {
    if (!songRef.current.lyricCues.length) return;
    if (!window.confirm('Clear all saved lyric timing cues for this song?')) return;
    commitCues([]);
    setArmed(false);
    setNextIndex(0);
    setMessage('All lyric timing cues cleared.');
  }, [commitCues]);

  const timedCount = slides.filter((item) => Boolean(cueForSlide(item.slide.id))).length;
  const timelineDuration = isPreviewSong && transport.durationMs > 0
    ? transport.durationMs
    : Math.max(1, ...song.lyricCues.map((cue) => cue.timeMs + 5000));

  return (
    <section className="songTimingEditor">
      <header className="songTimingHeader">
        <div>
          <Icon name="timer" />
          <div>
            <strong>SONG TIMING EDITOR</strong>
            <span>{timedCount}/{slides.length} lyric slides timed</span>
          </div>
        </div>
        <span className={armed ? 'isArmed' : ''}>{armed ? 'TAP MODE ARMED' : 'PREPARATION MODE'}</span>
      </header>

      <div className="timingSafetyNote">
        <Icon name="stage" />
        <span>Preview transport is local/editor-only. Timing taps never trigger Audience or Stage output.</span>
      </div>

      {!supportedMode ? (
        <div className="timingBlocked">
          <strong>Timing editor is for Slides + Track or Slides + Stems.</strong>
          <span>Lyrics Video already contains its timing; Live Band should normally stay Manual because performance timing varies.</span>
        </div>
      ) : !canUseTrack ? (
        <div className="timingBlocked">
          <strong>Assign audio first.</strong>
          <span>Choose a backing track or at least one stem in Song Setup above.</span>
        </div>
      ) : (
        <>
          <div className="timingTransport">
            <div className="timingTransportButtons">
              <button className="timingStartButton" type="button" onClick={() => void startTapSession()}>
                ● Start New Tap Pass
              </button>
              <button type="button" onClick={armFromFirstMissing} disabled={!slides.length}>
                Arm First Missing
              </button>
              {transport.status === 'playing' && isPreviewSong ? (
                <button type="button" onClick={onPausePreview}>Ⅱ Pause Preview</button>
              ) : transport.status === 'paused' && isPreviewSong ? (
                <button type="button" onClick={() => void onResumePreview()}>▶ Resume Preview</button>
              ) : (
                <button type="button" onClick={() => void onPlayPreview(song)}>▶ Play Preview</button>
              )}
              <button type="button" onClick={onStopPreview}>■ Stop</button>
            </div>

            <div className="timingClock">
              <b>{formatTime(isPreviewSong ? transport.positionMs : 0)}</b>
              <span>/ {transport.durationMs ? formatTime(transport.durationMs) : '--:--.---'}</span>
            </div>

            <input
              aria-label="Timing preview position"
              type="range"
              min={0}
              max={Math.max(transport.durationMs, 1)}
              step={10}
              value={isPreviewSong ? Math.min(transport.positionMs, Math.max(transport.durationMs, 1)) : 0}
              disabled={!isPreviewSong || transport.durationMs <= 0}
              onChange={(event) => void onSeekPreview(Number(event.target.value))}
            />
          </div>

          <div className="timingTapArea">
            <button
              className={armed ? 'isArmed' : ''}
              type="button"
              disabled={!armed || !isPreviewSong || transport.status !== 'playing' || nextIndex >= slides.length}
              onClick={captureNext}
            >
              <span>SPACE / TAP</span>
              <strong>
                {nextIndex < slides.length
                  ? `Set ${labelFor(slides[nextIndex])}`
                  : 'Timing Complete'}
              </strong>
              <small>{nextIndex < slides.length ? slides[nextIndex].slide.text.replace(/\n/g, ' / ') : 'All slides have been captured.'}</small>
            </button>
            <div className="timingTapMessage">{message}</div>
          </div>

          <div className="timingTimeline">
            <div className="timingTimelineTrack">
              {song.lyricCues.map((cue) => (
                <button
                  key={cue.id}
                  type="button"
                  title={`${cue.label ?? cue.slideId} · ${formatTime(cue.timeMs)}`}
                  style={{ left: `${Math.min(100, (cue.timeMs / timelineDuration) * 100)}%` }}
                  onClick={() => void onSeekPreview(cue.timeMs)}
                />
              ))}
            </div>
          </div>

          <div className="timingCueTable">
            <div className="timingCueHeader">
              <span>#</span><span>LYRIC SLIDE</span><span>TIME</span><span>FINE ADJUST</span><span>ACTIONS</span>
            </div>
            {slides.map((item, index) => {
              const cue = cueForSlide(item.slide.id);
              const isNext = armed && index === nextIndex;
              return (
                <div className={`timingCueRow ${cue ? 'isTimed' : ''} ${isNext ? 'isNext' : ''}`} key={item.slide.id}>
                  <span className="timingCueNumber">{item.sequence}</span>
                  <div className="timingCueText">
                    <strong>{item.groupName}</strong>
                    <span>{item.slide.text.replace(/\n/g, ' / ')}</span>
                  </div>
                  <div className="timingCueTime">
                    <input
                      aria-label={`Cue time for ${labelFor(item)} in seconds`}
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="--"
                      value={cue ? (cue.timeMs / 1000).toFixed(3) : ''}
                      onChange={(event) => {
                        if (event.target.value === '') clearCueForSlide(item.slide.id);
                        else setCueSeconds(item, Number(event.target.value));
                      }}
                    />
                    <small>{cue ? formatTime(cue.timeMs) : 'Not timed'}</small>
                  </div>
                  <div className="timingFineAdjust">
                    <button type="button" disabled={!cue} onClick={() => adjustCue(item, -100)}>−100</button>
                    <button type="button" disabled={!cue} onClick={() => adjustCue(item, -10)}>−10</button>
                    <button type="button" disabled={!cue} onClick={() => adjustCue(item, 10)}>+10</button>
                    <button type="button" disabled={!cue} onClick={() => adjustCue(item, 100)}>+100</button>
                    <small>milliseconds</small>
                  </div>
                  <div className="timingCueActions">
                    <button
                      type="button"
                      title="Set this cue to the current preview position"
                      disabled={!isPreviewSong}
                      onClick={() => setCueForSlide(item, getPositionMs())}
                    >
                      Set Now
                    </button>
                    <button type="button" disabled={!cue} onClick={() => cue && void onSeekPreview(cue.timeMs)}>Go</button>
                    <button className="danger" type="button" disabled={!cue} onClick={() => clearCueForSlide(item.slide.id)}>×</button>
                  </div>
                </div>
              );
            })}
          </div>

          <footer className="timingFooter">
            <div>
              <strong>{timedCount === slides.length && slides.length ? 'Timing map complete' : `${slides.length - timedCount} cues remaining`}</strong>
              <span>Saved automatically with this Song.</span>
            </div>
            <div>
              <button type="button" className="danger" disabled={!song.lyricCues.length} onClick={clearAll}>Clear All Cues</button>
              <button
                type="button"
                className="timingAutoButton"
                disabled={timedCount !== slides.length || !slides.length}
                onClick={() => onChangeSong({ ...songRef.current, lyricControlMode: 'auto' })}
              >
                Use Auto Lyrics
              </button>
            </div>
          </footer>
        </>
      )}
    </section>
  );
}
