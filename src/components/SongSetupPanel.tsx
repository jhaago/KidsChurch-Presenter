import type { MediaAsset, Song, SongPlaybackMode, LyricControlMode } from '../domain/types';
import { Icon } from './ui/Icon';

interface SongSetupPanelProps {
  song: Song;
  assets: MediaAsset[];
  onChange: (song: Song) => void;
  onTriggerLyricsVideo: (asset: MediaAsset) => void;
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

export function SongSetupPanel({ song, assets, onChange, onTriggerLyricsVideo }: SongSetupPanelProps) {
  const audioAssets = assets.filter((asset) => asset.kind === 'audio');
  const visualAssets = assets.filter((asset) => asset.kind !== 'audio');
  const videoAssets = assets.filter((asset) => asset.kind === 'motion' || asset.kind === 'video');
  const videoAsset = videoAssets.find((asset) => asset.id === song.lyricsVideoAssetId);

  return (
    <section className="songSetupPanel">
      <header className="songSetupHeader">
        <div>
          <Icon name="audio" />
          <div>
            <strong>SONG SETUP</strong>
            <span>{song.title}</span>
          </div>
        </div>
        <span className="songEngineBadge">EDITABLE SONG</span>
      </header>

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
                ? 'Operator advances every lyric slide.'
                : song.lyricControlMode === 'assisted'
                  ? 'Operator remains in control; stored timing cues will provide next-slide prompts.'
                  : `Auto mode will follow ${song.lyricCues.length} stored timing cues from the song transport.`}
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
            <p className="songModeHint">Single-track transport will use the same master song clock as Auto Lyrics.</p>
          </section>
        ) : null}

        {song.playbackMode === 'slides-stems' ? (
          <section className="songSetupSection songStemSection">
            <small>STEMS</small>
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
              All stems share one master transport clock. Muted stems stay synchronized at zero gain.
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
            <button
              className="songVideoTrigger"
              type="button"
              disabled={!videoAsset?.fileUrl}
              onClick={() => videoAsset && onTriggerLyricsVideo(videoAsset)}
            >
              <Icon name="media" />
              Trigger Lyrics Video
            </button>
            <p className="songModeHint">Lyrics video mode plays the file full-screen with its embedded audio and does not loop.</p>
          </section>
        ) : null}

        {song.playbackMode === 'slides-live' ? (
          <section className="songSetupSection">
            <small>LIVE BAND</small>
            <div className="songLiveMode"><Icon name="audio" /><span>No backing audio. Lyrics remain operator-controlled.</span></div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
