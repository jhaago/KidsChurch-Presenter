import { useEffect, useMemo, useState } from 'react';
import type { SongTransportSnapshot } from '../audio/useSongTransport';
import {
  arrangedSlides,
  effectiveArrangement,
  occurrenceLabel,
} from '../domain/songArrangement';
import { resolveSlideElements } from '../domain/slideElements';
import { resolveBackgroundAssetId } from '../domain/themes';
import type { MediaAsset, OutputState, PlaylistItem, Presentation, PresentationTheme, Slide, Song } from '../domain/types';
import { PresentationEditorPanel } from './PresentationEditorPanel';
import { SlideLayoutEditor } from './SlideLayoutEditor';
import { SongArrangementEditor } from './SongArrangementEditor';
import { SongPerformancePanel } from './SongPerformancePanel';
import { SongSetupPanel } from './SongSetupPanel';
import { SongTimingEditor } from './SongTimingEditor';
import { Icon } from './ui/Icon';

type SongWorkspaceMode = 'build' | 'perform';

interface SlideWorkspaceProps {
  selectedItem: PlaylistItem;
  presentation?: Presentation;
  song?: Song;
  media?: MediaAsset;
  availableAssets: MediaAsset[];
  customThemes: PresentationTheme[];
  selectedSlideId: string | null;
  selectedArrangementEntryId: string | null;
  output: OutputState;
  songTransport: SongTransportSnapshot;
  timingTransport: SongTransportSnapshot;
  getTimingPositionMs: () => number;
  onChangePresentation: (presentation: Presentation) => void;
  onCreateTheme: (theme: PresentationTheme) => void;
  onUpdateTheme: (theme: PresentationTheme) => void;
  onDeleteTheme: (themeId: string) => void;
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
  customThemes,
  selectedSlideId,
  selectedArrangementEntryId,
  output,
  songTransport,
  timingTransport,
  getTimingPositionMs,
  onChangePresentation,
  onCreateTheme,
  onUpdateTheme,
  onDeleteTheme,
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
  const [viewMode, setViewMode] = useState<'slides' | 'edit' | 'layout' | 'arrange' | 'timing'>('slides');
  const [songWorkspaceMode, setSongWorkspaceMode] = useState<SongWorkspaceMode>('perform');

  useEffect(() => {
    setViewMode('slides');
    setSongWorkspaceMode(selectedItem.type === 'song' ? 'perform' : 'build');
    onStopTimingSong();
  }, [selectedItem.id, selectedItem.type, onStopTimingSong]);

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

  const enterBuildMode = () => {
    if (!song) return;
    if (
      songTransport.songId === song.id &&
      (songTransport.status === 'playing' || songTransport.status === 'paused')
    ) {
      window.alert('This Song is currently live. Stop the live Song before changing its Build configuration.');
      return;
    }
    onStopTimingSong();
    setViewMode('slides');
    setSongWorkspaceMode('build');
  };

  const enterPerformanceMode = () => {
    onStopTimingSong();
    setViewMode('slides');
    setSongWorkspaceMode('perform');
  };

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

  const isSongBuild = Boolean(song && songWorkspaceMode === 'build');
  const isSongPerformance = Boolean(song && songWorkspaceMode === 'perform');

  return (
    <section
      className={`slideWorkspace ${isSongBuild ? 'songBuildWorkspace' : ''} ${isSongPerformance ? 'songPerformanceWorkspace' : ''}`}
      aria-label="Slide workspace"
      data-presenter-editor={isSongBuild ? 'true' : undefined}
    >
      <header className="workspaceHeader">
        <div className="workspaceIdentity">
          <Icon name={selectedItem.type === 'bible' ? 'bible' : selectedItem.type === 'media' ? 'media' : selectedItem.type === 'song' ? 'audio' : 'presentation'} />
          <div>
            <h1>{selectedItem.title}</h1>
            <span>{selectedItem.type.replace('-', ' ').toUpperCase()}</span>
          </div>
        </div>
        <div className="workspaceHeaderActions">
          {song ? (
            <div className="songWorkspaceModeSwitch" aria-label="Song workspace mode">
              <button
                className={songWorkspaceMode === 'build' ? 'isActive isBuild' : ''}
                type="button"
                onClick={enterBuildMode}
              >
                <Icon name="presentation" />
                <span><b>BUILD</b><small>Prepare</small></span>
              </button>
              <button
                className={songWorkspaceMode === 'perform' ? 'isActive isPerform' : ''}
                type="button"
                onClick={enterPerformanceMode}
              >
                <Icon name="audio" />
                <span><b>PERFORM</b><small>Run Live</small></span>
              </button>
            </div>
          ) : null}

          {presentation && (!song || songWorkspaceMode === 'build') ? (
            <button
              className={viewMode === 'edit' ? 'isActive' : ''}
              type="button"
              onClick={() => setViewMode((current) => current === 'edit' ? 'slides' : 'edit')}
            >
              <Icon name="presentation" />
              {viewMode === 'edit' ? 'Done Editing' : 'Edit'}
            </button>
          ) : null}
          {presentation && (!song || songWorkspaceMode === 'build') ? (
            <button
              className={viewMode === 'layout' ? 'isActive' : ''}
              type="button"
              onClick={() => {
                onStopTimingSong();
                setViewMode((current) => current === 'layout' ? 'slides' : 'layout');
              }}
            >
              <Icon name="grid" />
              {viewMode === 'layout' ? 'Done Layout' : 'Layout'}
            </button>
          ) : null}
          {song && presentation && songWorkspaceMode === 'build' ? (
            <button
              className={viewMode === 'arrange' ? 'isActive' : ''}
              type="button"
              onClick={openArrangeMode}
            >
              <Icon name="playlist" />
              {viewMode === 'arrange' ? 'Done Arranging' : 'Arrange'}
            </button>
          ) : null}
          {song && presentation && songWorkspaceMode === 'build' ? (
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
              {song
                ? songWorkspaceMode === 'perform'
                  ? 'Live Performance'
                  : viewMode === 'edit'
                    ? 'Build · Lyrics Editor'
                    : viewMode === 'layout'
                      ? 'Build · Visual Layout'
                      : viewMode === 'arrange'
                        ? 'Build · Arrangement'
                        : viewMode === 'timing'
                          ? 'Build · Timing'
                          : 'Build · Song Setup'
                : viewMode === 'edit'
                  ? 'Editor'
                  : viewMode === 'layout'
                    ? 'Visual Layout'
                    : 'Slide View'}
            </span>
          </div>
        </div>
      </header>

      <div className="workspaceScroll">
        {song && songWorkspaceMode === 'build' && viewMode !== 'layout' ? (
          <SongSetupPanel
            assets={availableAssets}
            onChange={onChangeSong}
            song={song}
          />
        ) : null}

        {song && presentation && songWorkspaceMode === 'perform' ? (
          <SongPerformancePanel
            assets={availableAssets}
            onPause={onPauseSong}
            onPlay={() => onPlaySong(song)}
            onResume={onResumeSong}
            onSeek={onSeekSong}
            onSelectSlide={onSelectSlide}
            onStop={onStopSong}
            onTriggerLyricsVideo={onTriggerLyricsVideo}
            onTriggerSlide={onTriggerSlide}
            output={output}
            presentation={presentation}
            song={song}
            transport={songTransport}
          />
        ) : null}

        {viewMode === 'layout' && presentation ? (
          <SlideLayoutEditor
            availableAssets={availableAssets}
            customThemes={customThemes}
            defaultBackgroundAssetId={song?.backgroundAssetId}
            onChange={onChangePresentation}
            onSelectSlide={(slideId) => onSelectSlide(slideId)}
            onUpdateTheme={onUpdateTheme}
            presentation={presentation}
            selectedSlideId={selectedSlideId}
          />
        ) : viewMode === 'timing' && song && presentation ? (
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
            customThemes={customThemes}
            isSongPresentation={Boolean(song)}
            onChange={onChangePresentation}
            onCreateTheme={onCreateTheme}
            onUpdateTheme={onUpdateTheme}
            onDeleteTheme={onDeleteTheme}
            presentation={presentation}
          />
        ) : presentation ? (
          <div className={`slideGroups ${isSongBuild ? 'buildSlideGroups' : ''}`}>
            {isSongBuild ? (
              <div className="songBuildSelectionBanner">
                <Icon name="presentation" />
                <div>
                  <strong>BUILD PREVIEW</strong>
                  <span>Clicking lyric slides selects them for preparation only. Audience output will not change until you switch to Perform.</span>
                </div>
              </div>
            ) : null}
            {song?.playbackMode === 'lyrics-video' ? (
              <div className="songFallbackBanner">
                <Icon name="presentation" />
                <span>
                  {isSongBuild
                    ? 'Fallback lyric slides can be prepared here. The assigned Lyrics Video is triggered only from Perform.'
                    : 'Fallback / alternate lyric slides remain available, but Lyrics Video mode does not advance them automatically.'}
                </span>
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
                    const elements = resolveSlideElements(
                      presentation,
                      slide,
                      customThemes,
                      availableAssets,
                    );
                    const resolvedBackgroundId = resolveBackgroundAssetId(presentation, slide);
                    const backgroundId = slide.backgroundAssetId === null
                      ? undefined
                      : resolvedBackgroundId ?? song?.backgroundAssetId;
                    const background = backgroundId
                      ? availableAssets.find((asset) => asset.id === backgroundId)
                      : undefined;
                    return (
                      <button
                        aria-label={`${label}, slide ${sequence}${live ? ', live' : ''}${isSongBuild ? ', build selection only' : ''}`}
                        className={`slideThumbnail ${selected ? 'isSelected' : ''} ${live ? 'isLive' : ''} ${isSongBuild ? 'isBuildOnly' : ''}`}
                        key={`${key}:${slide.id}`}
                        onClick={() => {
                          onSelectSlide(slide.id, arrangementEntryId);
                          if (!isSongBuild) onTriggerSlide(presentation, slide, arrangementEntryId);
                        }}
                        type="button"
                      >
                        <span className="slideSurface">
                          {background?.fileUrl && background.kind === 'still' ? (
                            <img className="thumbnailBackground" src={background.fileUrl} alt="" />
                          ) : background?.fileUrl && background.kind === 'motion' ? (
                            <video className="thumbnailBackground" src={background.fileUrl} muted loop autoPlay playsInline />
                          ) : null}
                          {elements.map((element, elementIndex) => {
                            if (element.type === 'image') {
                              if (!element.fileUrl) return null;
                              return (
                                <img
                                  className="thumbnailSlideElementImage"
                                  key={element.id}
                                  src={element.fileUrl}
                                  alt=""
                                  style={{
                                    left: `${element.layout.xPercent}%`,
                                    top: `${element.layout.yPercent}%`,
                                    width: `${element.layout.widthPercent}%`,
                                    height: `${element.layout.heightPercent}%`,
                                    objectFit: element.fit,
                                    opacity: element.opacity,
                                    zIndex: elementIndex + 1,
                                  }}
                                />
                              );
                            }

                            if (element.type === 'shape') {
                              return (
                                <span
                                  className="thumbnailSlideElementShape"
                                  key={element.id}
                                  style={{
                                    left: `${element.layout.xPercent}%`,
                                    top: `${element.layout.yPercent}%`,
                                    width: `${element.layout.widthPercent}%`,
                                    height: `${element.layout.heightPercent}%`,
                                    backgroundColor: element.fillColor,
                                    borderColor: element.borderColor,
                                    borderStyle: element.borderWidth > 0 ? 'solid' : 'none',
                                    borderWidth: Math.max(0.5, element.borderWidth * 0.25),
                                    borderRadius: element.shape === 'ellipse' ? '50%' : 0,
                                    opacity: element.opacity,
                                    zIndex: elementIndex + 1,
                                  }}
                                />
                              );
                            }

                            const alignItems = element.format.textAlign === 'left'
                              ? 'flex-start'
                              : element.format.textAlign === 'right'
                                ? 'flex-end'
                                : 'center';
                            const justifyContent = element.format.verticalAlign === 'top'
                              ? 'flex-start'
                              : element.format.verticalAlign === 'bottom'
                                ? 'flex-end'
                                : 'center';

                            return (
                              <span
                                className="thumbnailText"
                                key={element.id}
                                style={{
                                  inset: 'auto',
                                  left: `${element.layout.xPercent}%`,
                                  top: `${element.layout.yPercent}%`,
                                  width: `${element.layout.widthPercent}%`,
                                  height: `${element.layout.heightPercent}%`,
                                  alignItems,
                                  justifyContent,
                                  color: element.format.textColor,
                                  fontFamily: element.format.fontFamily,
                                  fontWeight: element.format.fontWeight,
                                  lineHeight: element.format.lineHeight,
                                  textAlign: element.format.textAlign,
                                  textShadow: element.format.shadow ? '0 1px 3px #000' : 'none',
                                  textTransform: element.format.uppercase ? 'uppercase' : 'none',
                                  fontSize: `clamp(7px, ${Math.max(0.55, element.format.fontSizeVw * 0.16)}vw, 14px)`,
                                  opacity: element.opacity,
                                  zIndex: elementIndex + 1,
                                }}
                              >
                                {element.text.split('\n').map((line, lineIndex) => (
                                  <span key={`${element.id}:${lineIndex}`}>{line}</span>
                                ))}
                              </span>
                            );
                          })}
                        </span>
                        <span className="slideOrdinal">{sequence}</span>
                        {live ? <span className="liveFlag">LIVE</span> : null}
                        {isSongBuild ? <span className="buildFlag">BUILD</span> : null}
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
