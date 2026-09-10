import type { MediaAsset, Song, SongPlaybackMode, LyricControlMode } from '../domain/types';
import { Icon } from './ui/Icon';

interface SongSetupPanelProps {
  song: Song;
  assets: MediaAsset[];
  onChange: (song: Song) => void;
}

const playbackModes: Array<{ id: SongPlaybackMode; label: string; detail: string }> = [
  { id: 'slides-track', label: 'Slides + Track', detail: 'Lyrics slides with one backing track' },
  { id: 'slides-stems', label: 'Slides + Stems', detail: 'Lyrics slides with selectable multitrack stems' },
  { id: 'lyrics-video', label: 'Lyrics Video', detail: 'Existing MP4/video with embedded graphics and audio' },
  { id: 'slides-live', label: 'Live Band', detail: 'Lyrics slides with no backing audio' },
];

const lyricModes: Array<{ id: LyricControlMode; label: string }> = [
  { id: 'manual', label: 'Manual' },
  { id: 'assisted', label: 'Assisted' },
  { id: 'auto', label: 'Auto' },
];

function updatePlaybackMode(song: Song, playbackMode: SongPlaybackMode): Song {
  const mode =
    playbackMode === 'slides-track'
      ? 'single-track'
      : playbackMode === 'slides-stems'
        ? 'stems'
        : playbackMode === 'lyrics-video'
          ? 'embedded-video'
          : 'none';

  return {
    ...song,
    playbackMode,
    audio: { ...song.audio, mode },
  };
}

function secondsToMs(value: string) {
  if (!value.trim()) return undefined;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return Math.round(seconds * 1000);
}

function msToSeconds(value?: number) {
  return value && value > 0 ? (value / 1000).toString() : '';
}

export function SongSetupPanel({ song, assets, onChange }: SongSetupPanelProps) {
  const audioAssets = assets.filter((asset) => asset.kind === 'audio');
  const visualAssets = assets.filter((asset) => asset.kind !== 'audio');
  const videoAssets = assets.filter((asset) => asset.kind === 'motion' || asset.kind === 'video');
  const hasBackingAudio = song.playbackMode === 'slides-track' || song.playbackMode === 'slides-stems';

  return (
    <section className="songSetupPanel songBuildPanel" data-presenter-editor="true">
      <header className="songSetupHeader">
        <div>
          <span className="songBuildMark"><Icon name="presentation" /></span>
          <div>
            <strong>BUILD SONG</strong>
            <span>{song.title}</span>
          </div>
        </div>
        <span className="songEngineBadge songBuildBadge">CONFIGURATION</span>
      </header>

      <div className="songBuildNotice">
        <strong>PREPARATION MODE</strong>
        <span>Changes here are saved as the Song's setup for future performances. Build mode does not start live playback or trigger Audience output.</span>
      </div>

      <div className="songSetupGrid">
        <section className="songSetupSection">
          <small>SONG NAME</small>
          <input
            className="songNameInput"
            value={song.title}
            onChange={(event) => onChange({ ...song, title: event.target.value })}
          />
          <p className="songModeHint">The linked lyrics presentation and service item follow this title.</p>
        </section>

        <section className="songSetupSection">
          <small>PLAYBACK MODE</small>
          <div className="songModeGrid">
            {playbackModes.map((mode) => (
              <button
                className={song.playbackMode === mode.id ? 'isActive' : ''}
                key={mode.id}
                onClick={() => onChange(updatePlaybackMode(song, mode.id))}
                type="button"
              >
                <strong>{mode.label}</strong>
                <span>{mode.detail}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="songSetupSection">
          <small>LYRIC CONTROL</small>
          <div className="lyricModeRow">
            {lyricModes.map((mode) => (
              <button
                className={song.lyricControlMode === mode.id ? 'isActive' : ''}
                key={mode.id}
                onClick={() => onChange({ ...song, lyricControlMode: mode.id })}
                type="button"
                disabled={song.playbackMode === 'lyrics-video'}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <p className="songModeHint">
            {song.playbackMode === 'lyrics-video'
              ? 'Lyrics are embedded in the video, so slide control is not used.'
              : song.lyricControlMode === 'manual'
                ? 'Operator advances every lyric slide during Performance.'
                : song.lyricControlMode === 'assisted'
                  ? 'Operator remains in control; stored timing cues provide next-slide prompts during Performance.'
                  : `Auto mode follows ${song.lyricCues.length} stored timing cues from the live Song transport.`}
          </p>
        </section>

        {song.playbackMode !== 'lyrics-video' ? (
          <section className="songSetupSection">
            <small>BACKGROUND</small>
            <select
              value={song.backgroundAssetId ?? ''}
              onChange={(event) => onChange({ ...song, backgroundAssetId: event.target.value || undefined })}
            >
              <option value="">No assigned background</option>
              {visualAssets.map((asset) => (
                <option value={asset.id} key={asset.id}>{asset.title}</option>
              ))}
            </select>
          </section>
        ) : null}

        {song.playbackMode === 'slides-track' ? (
          <section className="songSetupSection">
            <small>BACKING TRACK</small>
            <select
              value={song.audio.singleTrackAssetId ?? ''}
              onChange={(event) =>
                onChange({
                  ...song,
                  audio: { ...song.audio, singleTrackAssetId: event.target.value || undefined },
                })
              }
            >
              <option value="">No backing track assigned</option>
              {audioAssets.map((asset) => (
                <option value={asset.id} key={asset.id}>{asset.title}</option>
              ))}
            </select>
            <p className="songModeHint">The live Performance transport uses this track and the same master clock as Auto Lyrics.</p>
          </section>
        ) : null}

        {song.playbackMode === 'slides-stems' ? (
          <section className="songSetupSection songStemSection">
            <small>STEM DEFAULTS</small>
            <div className="stemRows">
              {song.audio.stems.map((stem) => (
                <div className="stemRow" key={stem.id}>
                  <button
                    className={stem.enabled ? 'isEnabled' : ''}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...song,
                        audio: {
                          ...song.audio,
                          stems: song.audio.stems.map((candidate) =>
                            candidate.id === stem.id ? { ...candidate, enabled: !candidate.enabled } : candidate,
                          ),
                        },
                      })
                    }
                  >
                    {stem.enabled ? 'ON' : 'OFF'}
                  </button>
                  <strong>{stem.name}</strong>
                  <select
                    value={stem.assetId ?? ''}
                    onChange={(event) =>
                      onChange({
                        ...song,
                        audio: {
                          ...song.audio,
                          stems: song.audio.stems.map((candidate) =>
                            candidate.id === stem.id
                              ? { ...candidate, assetId: event.target.value || undefined }
                              : candidate,
                          ),
                        },
                      })
                    }
                  >
                    <option value="">No file assigned</option>
                    {audioAssets.map((asset) => (
                      <option value={asset.id} key={asset.id}>{asset.title}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <p className="songModeHint">
              These ON/OFF states are saved starting defaults. Live stem changes made in Performance are session-only and reset to these defaults when the Song starts again.
            </p>
          </section>
        ) : null}

        {hasBackingAudio ? (
          <section className="songSetupSection songTrimSection">
            <small>PLAYBACK TRIM</small>
            <div className="songTrimRow">
              <label>
                <span>IN</span>
                <input
                  min="0"
                  step="0.1"
                  type="number"
                  placeholder="0.0"
                  value={msToSeconds(song.audio.trimStartMs)}
                  onChange={(event) => onChange({
                    ...song,
                    audio: { ...song.audio, trimStartMs: secondsToMs(event.target.value) },
                  })}
                />
                <small>sec</small>
              </label>
              <label>
                <span>OUT</span>
                <input
                  min="0"
                  step="0.1"
                  type="number"
                  placeholder="End"
                  value={msToSeconds(song.audio.trimEndMs)}
                  onChange={(event) => onChange({
                    ...song,
                    audio: { ...song.audio, trimEndMs: secondsToMs(event.target.value) },
                  })}
                />
                <small>sec</small>
              </label>
              <button
                type="button"
                onClick={() => onChange({
                  ...song,
                  audio: { ...song.audio, trimStartMs: undefined, trimEndMs: undefined },
                })}
              >Reset Trim</button>
            </div>
            <p className="songModeHint">
              Non-destructive trim. The Song transport shows 0:00 at the In point. For stems, the same In/Out points are applied to every stem together so they remain synchronised.
            </p>
          </section>
        ) : null}

        {song.playbackMode === 'lyrics-video' ? (
          <section className="songSetupSection">
            <small>LYRICS VIDEO</small>
            <select
              value={song.lyricsVideoAssetId ?? ''}
              onChange={(event) => onChange({ ...song, lyricsVideoAssetId: event.target.value || undefined })}
            >
              <option value="">No lyrics video assigned</option>
              {videoAssets.map((asset) => (
                <option value={asset.id} key={asset.id}>{asset.title}</option>
              ))}
            </select>
            <p className="songModeHint">Assign the video here. Triggering it is intentionally only available in Performance mode.</p>
          </section>
        ) : null}

        {song.playbackMode === 'slides-live' ? (
          <section className="songSetupSection">
            <small>LIVE BAND</small>
            <div className="songLiveMode"><Icon name="audio" /><span>No backing audio. Lyrics remain operator-controlled during Performance.</span></div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
