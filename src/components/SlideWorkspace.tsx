import type { MediaAsset, OutputState, PlaylistItem, Presentation, Slide, Song } from '../domain/types';
import type { SongTransportSnapshot } from '../audio/useSongTransport';
import { SongSetupPanel } from './SongSetupPanel';
import { SongTransportPanel } from './SongTransportPanel';
import { Icon } from './ui/Icon';

interface SlideWorkspaceProps {
  selectedItem: PlaylistItem;
  presentation?: Presentation;
  song?: Song;
  media?: MediaAsset;
  availableAssets: MediaAsset[];
  selectedSlideId: string | null;
  output: OutputState;
  songTransport: SongTransportSnapshot;
  onChangeSong: (song: Song) => void;
  onPlaySong: (song: Song) => void;
  onPauseSong: () => void;
  onResumeSong: () => void;
  onStopSong: () => void;
  onSeekSong: (positionMs: number) => void;
  onSelectSlide: (slideId: string) => void;
  onTriggerSlide: (presentation: Presentation, slide: Slide) => void;
  onTriggerMedia: (asset: MediaAsset) => void;
  onTriggerLyricsVideo: (asset: MediaAsset) => void;
}

function slideNumber(presentation: Presentation, target: Slide) {
  let number = 0;
  for (const group of presentation.groups) {
    for (const slide of group.slides) {
      number += 1;
      if (slide.id === target.id) return number;
    }
  }
  return number;
}

export function SlideWorkspace({
  selectedItem,
  presentation,
  song,
  media,
  availableAssets,
  selectedSlideId,
  output,
  songTransport,
  onChangeSong,
  onPlaySong,
  onPauseSong,
  onResumeSong,
  onStopSong,
  onSeekSong,
  onSelectSlide,
  onTriggerSlide,
  onTriggerMedia,
  onTriggerLyricsVideo,
}: SlideWorkspaceProps) {
  return (
    <section className="slideWorkspace" aria-label="Slide workspace">
      <header className="workspaceHeader">
        <div className="workspaceIdentity">
          <Icon name={selectedItem.type === 'bible' ? 'bible' : selectedItem.type === 'media' ? 'media' : selectedItem.type === 'song' ? 'audio' : 'presentation'} />
          <div>
            <h1>{selectedItem.title}</h1>
            <span>{selectedItem.type.replace('-', ' ').toUpperCase()}</span>
          </div>
        </div>
        <div className="workspaceView">
          <Icon name="grid" />
          <span>{song ? 'Song + Slide View' : 'Slide View'}</span>
        </div>
      </header>

      <div className="workspaceScroll">
        {song ? (
          <>
            <SongSetupPanel
              assets={availableAssets}
              onChange={onChangeSong}
              onTriggerLyricsVideo={onTriggerLyricsVideo}
              song={song}
            />
            <SongTransportPanel
              onPause={onPauseSong}
              onPlay={() => onPlaySong(song)}
              onResume={onResumeSong}
              onSeek={onSeekSong}
              onStop={onStopSong}
              song={song}
              transport={songTransport}
            />
          </>
        ) : null}

        {presentation ? (
          <div className="slideGroups">
            {song?.playbackMode === 'lyrics-video' ? (
              <div className="songFallbackBanner">
                <Icon name="presentation" />
                <span>Fallback / alternate lyric slides remain available, but Lyrics Video mode does not advance them automatically.</span>
              </div>
            ) : null}
            {presentation.groups.map((group) => (
              <section className={`slideGroup group-${group.type}`} key={group.id}>
                <div className="slideGroupHeader">
                  <span className="groupAccent" />
                  <strong>{group.name}</strong>
                  <span>{group.slides.length} slide{group.slides.length === 1 ? '' : 's'}</span>
                </div>
                <div className="slideGrid">
                  {group.slides.map((slide) => {
                    const selected = selectedSlideId === slide.id;
                    const live = output.slide?.presentationId === presentation.id && output.slide.slideId === slide.id;
                    return (
                      <button
                        aria-label={`${group.name}, slide ${slideNumber(presentation, slide)}${live ? ', live' : ''}`}
                        className={`slideThumbnail ${selected ? 'isSelected' : ''} ${live ? 'isLive' : ''}`}
                        key={slide.id}
                        onClick={() => {
                          onSelectSlide(slide.id);
                          onTriggerSlide(presentation, slide);
                        }}
                        type="button"
                      >
                        <span className="slideSurface">
                          <span className="thumbnailText">
                            {slide.text.split('\n').map((line, lineIndex) => (
                              <span key={`${slide.id}-${lineIndex}`}>{line}</span>
                            ))}
                          </span>
                        </span>
                        <span className="slideOrdinal">{slideNumber(presentation, slide)}</span>
                        {live ? <span className="liveFlag">LIVE</span> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : media ? (
          <div className="nonSlideWorkspace">
            <div className="preparedMedia">
              <div className={`assetArtwork asset-${media.id}`}><Icon name="media" /></div>
              <div>
                <span className="eyebrow">MEDIA PLAYLIST ITEM</span>
                <h2>{media.title}</h2>
                <p>Prepared only. Triggering the media tile sends it to the independent Media layer.</p>
                <button className="primaryAction" onClick={() => onTriggerMedia(media)} type="button">
                  <Icon name="media" /> Trigger Media
                </button>
              </div>
            </div>
          </div>
        ) : !song ? (
          <div className="nonSlideWorkspace">
            <div className="toolPlaceholder">
              <Icon name={selectedItem.type === 'web-tool' ? 'web' : 'interactive'} />
              <span className="eyebrow">{selectedItem.type === 'web-tool' ? 'WEB TOOL' : 'INTERACTIVE TOOL'}</span>
              <h2>{selectedItem.title}</h2>
              <p>This service item is prepared in the operator workspace. Its dedicated runtime is intentionally reserved for a future pass.</p>
              <div className="placeholderSteps"><span>PREPARE</span><i /><span>SHOW</span><i /><span>RESET</span></div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
