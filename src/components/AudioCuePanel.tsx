import { useEffect, useMemo, useState } from 'react';
import { useAudioCueTransport } from '../audio/useAudioCueTransport';
import type { SongTransportSnapshot } from '../audio/useSongTransport';
import {
  clearMediaPlaybackSettings,
  getMediaPlaybackSettings,
  setMediaPlaybackSettings,
} from '../domain/mediaPlayback';
import type { MediaAsset, Song } from '../domain/types';
import { Icon } from './ui/Icon';

interface AudioCuePanelProps {
  assets: MediaAsset[];
  activeSong?: Song;
  songTransport: SongTransportSnapshot;
  onPlaySong: (song: Song) => void;
  onPauseSong: () => void;
  onResumeSong: () => void;
  onStopSong: () => void;
  onSeekSong: (positionMs: number) => void;
  hidden?: boolean;
}

function formatTime(ms: number) {
  const safe = Math.max(0, Math.round(ms));
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const tenths = Math.floor((safe % 1000) / 100);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}

function secondsValue(ms?: number) {
  return ms && ms > 0 ? (ms / 1000).toString() : '';
}

export function AudioCuePanel({
  assets,
  activeSong,
  songTransport,
  onPlaySong,
  onPauseSong,
  onResumeSong,
  onStopSong,
  onSeekSong,
  hidden = false,
}: AudioCuePanelProps) {
  const audioAssets = useMemo(() => assets.filter((asset) => asset.kind === 'audio'), [assets]);
  const cueTransport = useAudioCueTransport(audioAssets);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [loop, setLoop] = useState(false);
  const [trimStart, setTrimStart] = useState('');
  const [trimEnd, setTrimEnd] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedAsset = useMemo(() => {
    const selected = selectedAssetId
      ? audioAssets.find((asset) => asset.id === selectedAssetId)
      : undefined;
    return selected ?? audioAssets.find((asset) => asset.id === cueTransport.state.assetId) ?? audioAssets[0];
  }, [audioAssets, cueTransport.state.assetId, selectedAssetId]);

  useEffect(() => {
    if (!selectedAsset) return;
    const settings = getMediaPlaybackSettings(selectedAsset.id);
    setLoop(Boolean(settings.loop));
    setTrimStart(secondsValue(settings.trimStartMs));
    setTrimEnd(secondsValue(settings.trimEndMs));
    setError(null);
  }, [selectedAsset?.id]);

  const selectedIsActive = Boolean(selectedAsset && cueTransport.state.assetId === selectedAsset.id);
  const transportStartMs = selectedIsActive ? cueTransport.state.trimStartMs : Math.max(0, Number(trimStart || 0) * 1000 || 0);
  const transportEndMs = selectedIsActive
    ? cueTransport.state.trimEndMs ?? cueTransport.state.durationMs
    : trimEnd.trim()
      ? Math.max(transportStartMs, Number(trimEnd) * 1000 || transportStartMs)
      : 0;

  const applySettings = async () => {
    if (!selectedAsset) return;
    const startSeconds = Number(trimStart || 0);
    const endSeconds = trimEnd.trim() ? Number(trimEnd) : undefined;
    if (!Number.isFinite(startSeconds) || startSeconds < 0) {
      setError('In point must be zero or greater.');
      return;
    }
    if (endSeconds !== undefined && (!Number.isFinite(endSeconds) || endSeconds <= startSeconds)) {
      setError('Out point must be later than the In point.');
      return;
    }
    if (selectedIsActive && cueTransport.state.durationMs > 0 && startSeconds * 1000 >= cueTransport.state.durationMs) {
      setError('In point must be before the end of the audio file.');
      return;
    }

    const maxEndSeconds = selectedIsActive && cueTransport.state.durationMs > 0
      ? cueTransport.state.durationMs / 1000
      : undefined;
    const clampedEnd = endSeconds === undefined || maxEndSeconds === undefined
      ? endSeconds
      : Math.min(endSeconds, maxEndSeconds);

    setMediaPlaybackSettings(selectedAsset.id, {
      loop,
      trimStartMs: Math.round(startSeconds * 1000),
      trimEndMs: clampedEnd === undefined ? undefined : Math.round(clampedEnd * 1000),
    });
    setTrimStart(startSeconds > 0 ? startSeconds.toString() : '');
    setTrimEnd(clampedEnd === undefined ? '' : clampedEnd.toString());
    setError(null);

    if (selectedIsActive && (cueTransport.state.status === 'playing' || cueTransport.state.status === 'paused')) {
      await cueTransport.play(selectedAsset);
    }
  };

  const resetSettings = () => {
    if (!selectedAsset) return;
    clearMediaPlaybackSettings(selectedAsset.id);
    setLoop(false);
    setTrimStart('');
    setTrimEnd('');
    setError(null);
    if (selectedIsActive) cueTransport.stop();
  };

  const setIn = () => {
    if (!selectedIsActive || cueTransport.state.durationMs <= 0) {
      setError('Play the selected cue first, then move the playhead to set an In point.');
      return;
    }
    const seconds = cueTransport.state.positionMs / 1000;
    setTrimStart(seconds.toFixed(2));
    const existingEnd = trimEnd.trim() ? Number(trimEnd) : undefined;
    if (existingEnd !== undefined && existingEnd <= seconds) setTrimEnd('');
    setError(null);
  };

  const setOut = () => {
    if (!selectedIsActive || cueTransport.state.durationMs <= 0) {
      setError('Play the selected cue first, then move the playhead to set an Out point.');
      return;
    }
    const startSeconds = Number(trimStart || 0);
    const seconds = cueTransport.state.positionMs / 1000;
    if (seconds <= startSeconds) {
      setError('Move the playhead after the In point before setting Out.');
      return;
    }
    setTrimEnd(seconds.toFixed(2));
    setError(null);
  };

  const songPlaying = songTransport.status === 'playing';
  const songPaused = songTransport.status === 'paused';
  const songActive = Boolean(activeSong && songTransport.songId === activeSong.id);

  return (
    <div className={`audioCuePanel ${hidden ? 'isHidden' : ''}`} aria-hidden={hidden || undefined}>
      <section className="audioCueLibrary">
        <header><Icon name="audio" /><strong>AUDIO CUES</strong><span>{audioAssets.length}</span></header>
        <div className="audioCueAssetList">
          {audioAssets.length ? audioAssets.map((asset) => {
            const selected = selectedAsset?.id === asset.id;
            const active = cueTransport.state.assetId === asset.id &&
              (cueTransport.state.status === 'playing' || cueTransport.state.status === 'paused');
            return (
              <button
                className={`${selected ? 'isSelected' : ''} ${active ? 'isActive' : ''}`}
                key={asset.id}
                onClick={() => setSelectedAssetId(asset.id)}
                type="button"
                title={asset.relativePath || asset.title}
                tabIndex={hidden ? -1 : undefined}
              >
                <Icon name="audio" />
                <span>{asset.title}</span>
                {active ? <b>{cueTransport.state.status === 'paused' ? 'PAUSED' : 'LIVE'}</b> : null}
              </button>
            );
          }) : <div className="audioCueEmpty">No indexed audio files</div>}
        </div>
      </section>

      <section className="audioCueControls">
        <div className="audioCueTitle">
          <div>
            <small>GENERAL AUDIO</small>
            <strong>{selectedAsset?.title ?? 'Select an audio cue'}</strong>
          </div>
          {selectedAsset ? <span>{selectedIsActive ? cueTransport.state.status.toUpperCase() : 'READY'}</span> : null}
        </div>

        <div className="audioCueTransportButtons">
          {selectedAsset ? (
            cueTransport.state.status === 'playing' && selectedIsActive ? (
              <button type="button" onClick={cueTransport.pause}>Ⅱ Pause</button>
            ) : cueTransport.state.status === 'paused' && selectedIsActive ? (
              <button className="isPrimary" type="button" onClick={() => void cueTransport.resume()}>▶ Resume</button>
            ) : (
              <button className="isPrimary" type="button" onClick={() => void cueTransport.play(selectedAsset)}>▶ Play</button>
            )
          ) : <button disabled type="button">▶ Play</button>}
          <button type="button" onClick={cueTransport.stop} disabled={!cueTransport.state.assetId}>■ Stop</button>
          <label className="audioCueLoop"><input checked={loop} onChange={(event) => setLoop(event.target.checked)} type="checkbox" />Loop</label>
        </div>

        <div className="audioCueTrimRow">
          <label><span>IN</span><input min="0" step="0.1" type="number" value={trimStart} placeholder="0" onChange={(event) => setTrimStart(event.target.value)} /></label>
          <button type="button" onClick={setIn}>Set In</button>
          <label><span>OUT</span><input min="0" step="0.1" type="number" value={trimEnd} placeholder="End" onChange={(event) => setTrimEnd(event.target.value)} /></label>
          <button type="button" onClick={setOut}>Set Out</button>
          <button className="audioCueApply" type="button" onClick={() => void applySettings()}>Apply</button>
          <button type="button" onClick={resetSettings}>Reset</button>
        </div>

        <div className="audioCueSeek">
          <span>{selectedIsActive ? formatTime(cueTransport.state.positionMs) : formatTime(transportStartMs)}</span>
          <input
            aria-label="Audio cue position"
            type="range"
            min={selectedIsActive ? cueTransport.state.trimStartMs : 0}
            max={selectedIsActive ? Math.max(1, cueTransport.state.trimEndMs ?? cueTransport.state.durationMs) : 1}
            step={50}
            value={selectedIsActive ? Math.min(cueTransport.state.positionMs, cueTransport.state.trimEndMs ?? cueTransport.state.durationMs) : 0}
            disabled={!selectedIsActive || cueTransport.state.durationMs <= 0}
            onChange={(event) => void cueTransport.seek(Number(event.target.value))}
          />
          <span>{selectedIsActive && cueTransport.state.durationMs > 0 ? formatTime(transportEndMs) : '--:--.-'}</span>
        </div>
        {error || cueTransport.state.error ? <div className="audioCueError">{error || cueTransport.state.error}</div> : null}
      </section>

      <section className="audioSongTransport">
        <div className="audioCueTitle">
          <div><small>SONG TRANSPORT</small><strong>{activeSong?.title ?? 'No active song'}</strong></div>
          {activeSong ? <span>{songTransport.status.toUpperCase()}</span> : null}
        </div>
        {activeSong ? (
          <>
            <div className="audioCueTransportButtons">
              {songPlaying ? (
                <button type="button" onClick={onPauseSong}>Ⅱ Pause</button>
              ) : songPaused ? (
                <button className="isPrimary" type="button" onClick={onResumeSong}>▶ Resume</button>
              ) : (
                <button className="isPrimary" type="button" onClick={() => onPlaySong(activeSong)}>▶ Play</button>
              )}
              <button type="button" onClick={onStopSong}>■ Stop</button>
            </div>
            <div className="audioCueSeek">
              <span>{formatTime(songTransport.positionMs)}</span>
              <input
                aria-label="Active song position"
                disabled={!songActive || songTransport.durationMs <= 0}
                max={Math.max(songTransport.durationMs, 1)}
                min={0}
                onChange={(event) => onSeekSong(Number(event.target.value))}
                step={100}
                type="range"
                value={Math.min(songTransport.positionMs, Math.max(songTransport.durationMs, 1))}
              />
              <span>{songTransport.durationMs ? formatTime(songTransport.durationMs) : '--:--.-'}</span>
            </div>
            {activeSong.playbackMode === 'slides-stems' ? (
              <div className="audioCueStemRow">
                {activeSong.audio.stems.filter((stem) => stem.assetId).map((stem) => {
                  const enabled = songActive ? songTransport.stemEnabled[stem.id] ?? stem.enabled : stem.enabled;
                  return (
                    <button
                      className={enabled ? 'isEnabled' : ''}
                      disabled={!songActive || (!songPlaying && !songPaused)}
                      key={stem.id}
                      type="button"
                      onClick={() => songTransport.setStemEnabled(stem.id, !enabled)}
                    >{stem.name} {enabled ? 'ON' : 'OFF'}</button>
                  );
                })}
              </div>
            ) : null}
            {songTransport.warning ? <div className="audioCueNotice">{songTransport.warning}</div> : null}
            {songTransport.error ? <div className="audioCueError">{songTransport.error}</div> : null}
          </>
        ) : <p className="audioSongEmpty">Start a Song from the service order to use the Song transport.</p>}
      </section>
    </div>
  );
}
