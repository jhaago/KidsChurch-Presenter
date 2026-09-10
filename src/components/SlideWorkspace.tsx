import { useEffect, useMemo, useState } from 'react';
import type { SongTransportSnapshot } from '../audio/useSongTransport';
import {
  arrangedSlides,
  effectiveArrangement,
  occurrenceLabel,
} from '../domain/songArrangement';
import { resolveBackgroundAssetId, resolveSlideFormat } from '../domain/themes';
import type { MediaAsset, OutputState, PlaylistItem, Presentation, Slide, Song } from '../domain/types';
import { PresentationEditorPanel } from './PresentationEditorPanel';
import { SongArrangementEditor } from './SongArrangementEditor';
import { SongSetupPanel } from './SongSetupPanel';
import { SongTimingEditor } from './SongTimingEditor';
import { SongTransportPanel } from './SongTransportPanel';
import { Icon } from './ui/Icon';

interface SlideWorkspaceProps {
  selectedItem: PlaylistItem;
  presentation?: Presentation;
  song?: Song;
  media?: MediaAsset;
  availableAssets: MediaAsset[];
  selectedSlideId: string | null;
  selectedArrangementEntryId: string | null;
  output: OutputState;
  songTransport: SongTransportSnapshot;
  timingTransport: SongTransportSnapshot;
  getTimingPositionMs: () => number;
  onChangePresentation: (presentation: Presentation) => void;
  onChangeSong: (song: Song) => void;
  onPlaySong: (song: Song) => void;
  onPauseSong: () => void;
  onResumeSong: () => void;
  onStopSong: () => void;
  onSeekSong: (positionMs: number) => void;
  onPlayTimingSong: (song: Song) => Promise<boolean>;
  onPauseTimingSong: () => void;
  onResumeTimingSong: () => Promise<boolean>;
  onStopTimingSong: () => void;
  onSeekTimingSong: (positionMs: number) => Promise<void>;
  onSelectSlide: (slideId: string, arrangementEntryId?: string) => void;
  onTriggerSlide: (presentation: Presentation, slide: Slide, arrangementEntryId?: string) => void;
  onTriggerMedia: (asset: MediaAsset) => void;
  onTriggerLyricsVideo: (asset: MediaAsset) => void;
}

function sourceSlideNumber(presentation: Presentation, target: Slide) {
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
  selectedArrangementEntryId,
  output,
  songTransport,
  timingTransport,
  getTimingPositionMs,
  onChangePresentation,
  onChangeSong,
  onPlaySong,
  onPauseSong,
  onResumeSong,
  onStopSong,
  onSeekSong,
  onPlayTimingSong,
  onPauseTimingSong,
  onResumeTimingSong,
  onStopTimingSong,
  onSeekTimingSong,
  onSelectSlide,
  onTriggerSlide,
  onTriggerMedia,
  onTriggerLyricsVideo,
}: SlideWorkspaceProps) {
  const [viewMode, setViewMode] = useState<'slides' | 'edit' | 'arrange' | 'timing'>('slides');

  useEffect(() => {
    setViewMode('slides');
    onStopTimingSong();
  }, [selectedItem.id, onStopTimingSong]);

  const songOccurrences = useMemo(
    () => song && presentation ? effectiveArrangement(song, presentation) : [],
    [presentation, song],
  );
  const arrangedSongSlides = useMemo(
    () => song && presentation ? arrangedSlides(song, presentation) : [],
    [presentation, song],
  );
  const arrangedSequenceByKey = useMemo(
    () => new Map(
      arrangedSongSlides.map((item) => [
        `${item.arrangementEntryId}:${item.slide.id}`,
        item.sequence,
      ]),
    ),
    [arrangedSongSlides],
  );

  const openArrangeMode = () => {
    if (viewMode === 'arrange') {
      setViewMode('slides');
      return;
    }
    if (
      song &&
      songTransport.songId === song.id &&
      (songTransport.status === 'playing' || songTransport.status === 'paused')
    ) {
      window.alert('Stop the live Song transport before changing its arrangement.');
      return;
    }
    onStopTimingSong();
    setViewMode('arrange');
  };

  const renderGroups = song && presentation
    ? songOccurrences.map((occurrence) => ({
        key: occurrence.entry.id,
        arrangementEntryId: occurrence.entry.id,
        group: occurrence.group,
        label: occurrenceLabel(
          occurrence.group,
          occurrence.occurrenceIndex,
          occurrence.occurrenceCount,
        ),
      }))
    : presentation?.groups.map((group) => ({
        key: group.id,
        arrangementEntryId: undefined,
        group,
        label: group.name,
      })) ?? [];

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
        <div className="workspaceHeaderActions">
          {presentation ? (
            <button
              className={viewMode === 'edit' ? 'isActive' : ''}
              type="button"
              onClick={() => setViewMode((current) => current === 'edit' ? 'slides' : 'edit')}
            >
              <Icon name="presentation" />
              {viewMode === 'edit' ? 'Done Editing' : 'Edit'}
            </button>
          ) : null}
          {song && presentation ? (
            <button
              className={viewMode === 'arrange' ? 'isActive' : ''}
              type="button"
              onClick={openArrangeMode}
            >
              <Icon name="playlist" />
              {viewMode === 'arrange' ? 'Done Arranging' : 'Arrange'}
            </button>
          ) : null}
          {song && presentation ? (
            <button
              className={viewMode === 'timing' ? 'isActive' : ''}
              type="button"
              onClick={() => {
                onStopTimingSong();
                setViewMode((current) => current === 'timing' ? 'slides' : 'timing');
              }}
            >
              <Icon name="timer" />
              {viewMode === 'timing' ? 'Done Timing' : 'Timing'}
            </button>
          ) : null}
          <div className="workspaceView">
            <Icon name="grid" />
            <span>
              {viewMode === 'edit'
                ? 'Editor'
                : viewMode === 'arrange'
                  ? 'Arrangement Editor'
                  : viewMode === 'timing'
                    ? 'Timing Editor'
                    : song
                      ? 'Song + Slide View'
                      : 'Slide View'}
            </span>
          </div>
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
            {viewMode !== 'timing' && viewMode !== 'arrange' ? (
              <SongTransportPanel
                onPause={onPauseSong}
                onPlay={() => onPlaySong(song)}
                onResume={onResumeSong}
                onSeek={onSeekSong}
                onStop={onStopSong}
                song={song}
                transport={songTransport}
              />
            ) : null}
          </>
        ) : null}

        {viewMode === 'timing' && song && presentation ? (
          <SongTimingEditor
            getPositionMs={getTimingPositionMs}
            onChangeSong={onChangeSong}
            onPausePreview={onPauseTimingSong}
            onPlayPreview={onPlayTimingSong}
            onResumePreview={onResumeTimingSong}
            onSeekPreview={onSeekTimingSong}
            onStopPreview={onStopTimingSong}
            presentation={presentation}
            song={song}
            transport={timingTransport}
          />
        ) : viewMode === 'arrange' && song && presentation ? (
          <SongArrangementEditor
            onChangeSong={onChangeSong}
            presentation={presentation}
            song={song}
          />
        ) : viewMode === 'edit' && presentation ? (
          <PresentationEditorPanel
            availableAssets={availableAssets}
            isSongPresentation={Boolean(song)}
            onChange={onChangePresentation}
            presentation={presentation}
          />
        ) : presentation ? (
          <div className="slideGroups">
            {song?.playbackMode === 'lyrics-video' ? (
              <div className="songFallbackBanner">
                <Icon name="presentation" />
                <span>Fallback / alternate lyric slides remain available, but Lyrics Video mode does not advance them automatically.</span>
              </div>
            ) : null}
            {song && songOccurrences.length ? (
              <div className="songArrangementBanner">
                <Icon name="playlist" />
                <span>
                  Arrangement: {songOccurrences.map((occurrence) =>
                    occurrenceLabel(
                      occurrence.group,
                      occurrence.occurrenceIndex,
                      occurrence.occurrenceCount,
                    ),
                  ).join(' → ')}
                </span>
              </div>
            ) : null}
            {renderGroups.map(({ key, arrangementEntryId, group, label }) => (
              <section className={`slideGroup group-${group.type}`} key={key}>
                <div className="slideGroupHeader">
                  <span className="groupAccent" />
                  <strong>{label}</strong>
                  <span>{group.slides.length} slide{group.slides.length === 1 ? '' : 's'}</span>
                </div>
                <div className="slideGrid">
                  {group.slides.map((slide) => {
                    const sequence = arrangementEntryId
                      ? arrangedSequenceByKey.get(`${arrangementEntryId}:${slide.id}`) ?? 0
                      : sourceSlideNumber(presentation, slide);
                    const selected =
                      selectedSlideId === slide.id &&
                      (song ? selectedArrangementEntryId === arrangementEntryId : true);
                    const live =
                      output.slide?.presentationId === presentation.id &&
                      output.slide.slideId === slide.id &&
                      (song
                        ? output.slide.arrangementEntryId === arrangementEntryId ||
                          (!output.slide.arrangementEntryId && selectedArrangementEntryId === arrangementEntryId)
                        : true);
                    const format = resolveSlideFormat(presentation, slide);
                    const backgroundId = resolveBackgroundAssetId(presentation, slide);
                    const background = backgroundId
                      ? availableAssets.find((asset) => asset.id === backgroundId)
                      : undefined;
                    const alignItems = format.textAlign === 'left'
                      ? 'flex-start'
                      : format.textAlign === 'right'
                        ? 'flex-end'
                        : 'center';
                    const justifyContent = format.verticalAlign === 'top'
                      ? 'flex-start'
                      : format.verticalAlign === 'bottom'
                        ? 'flex-end'
                        : 'center';
                    return (
                      <button
                        aria-label={`${label}, slide ${sequence}${live ? ', live' : ''}`}
                        className={`slideThumbnail ${selected ? 'isSelected' : ''} ${live ? 'isLive' : ''}`}
                        key={`${key}:${slide.id}`}
                        onClick={() => {
                          onSelectSlide(slide.id, arrangementEntryId);
                          onTriggerSlide(presentation, slide, arrangementEntryId);
                        }}
                        type="button"
                      >
                        <span className="slideSurface">
                          {background?.fileUrl && background.kind === 'still' ? (
                            <img className="thumbnailBackground" src={background.fileUrl} alt="" />
                          ) : background?.fileUrl && background.kind === 'motion' ? (
                            <video className="thumbnailBackground" src={background.fileUrl} muted loop autoPlay playsInline />
                          ) : null}
                          <span
                            className="thumbnailText"
                            style={{
                              inset: `${Math.max(4, format.marginPercent * 0.7)}% ${Math.max(4, format.marginPercent * 0.7)}%`,
                              alignItems,
                              justifyContent,
                              color: format.textColor,
                              fontFamily: format.fontFamily,
                              fontWeight: format.fontWeight,
                              lineHeight: format.lineHeight,
                              textAlign: format.textAlign,
                              textShadow: format.shadow ? '0 1px 3px #000' : 'none',
                              textTransform: format.uppercase ? 'uppercase' : 'none',
                              fontSize: `clamp(7px, ${Math.max(0.55, format.fontSizeVw * 0.16)}vw, 14px)`,
                            }}
                          >
                            {slide.text.split('\n').map((line, lineIndex) => (
                              <span key={`${key}:${slide.id}:${lineIndex}`}>{line}</span>
                            ))}
                          </span>
                        </span>
                        <span className="slideOrdinal">{sequence}</span>
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
