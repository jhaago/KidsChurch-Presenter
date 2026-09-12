import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { arrangedSlides, occurrenceLabel } from '../domain/songArrangement';
import type { ProgramUpdate } from '../domain/programs';
import { songForProgramItem } from '../domain/songProgramOverrides';
import type {
  OutputState,
  Playlist,
  PlaylistItem,
  Presentation,
  ResourceSource,
  Slide,
  Song,
} from '../domain/types';
import { ProgramHeaderActions, ProgramSidebar } from './ProgramControls';
import { Icon, type IconName } from './ui/Icon';

interface LibraryPanelProps {
  selectedItemId: string;
  output: OutputState;
  playlist: Playlist;
  playlists: Playlist[];
  activePlaylistId: string;
  presentations: Presentation[];
  songs: Song[];
  resourceSources: ResourceSource[];
  resourceAssetCountBySource: Record<string, number>;
  onAddResourceFolder: () => void;
  onRemoveResourceFolder: (sourceId: string) => void;
  onCreatePresentation: () => void;
  onCreateSong: () => void;
  onAddPresentationToService: (presentationId: string) => void;
  onAddSongToService: (songId: string) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onRemoveServiceItem: (itemId: string) => void;
  onResetSongOverride: (itemId: string) => void;
  onMoveServiceItem: (itemId: string, direction: -1 | 1) => void;
  onSelectItem: (id: string) => void;
  onSelectService: (playlistId: string) => void;
  onCreateService: () => void;
  onDuplicateService: () => void;
  onDeleteService: () => void;
  onUpdateService: (updates: ProgramUpdate) => void;
}

interface CanvasSlide {
  slideId: string;
  presentationId: string;
  arrangementEntryId?: string;
  sequence: number;
  groupLabel: string;
  text: string;
}

const itemIcons: Record<PlaylistItem['type'], IconName> = {
  presentation: 'presentation',
  song: 'audio',
  media: 'media',
  bible: 'bible',
  timer: 'timer',
  interactive: 'interactive',
  'web-tool': 'web',
};

function itemTone(item: PlaylistItem, presentations: Presentation[]) {
  if (item.type === 'song') return 'song';
  if (item.type === 'presentation') {
    const presentation = presentations.find((candidate) => candidate.id === item.resourceId);
    if (presentation?.category === 'song') return 'song';
    if (item.id.includes('message')) return 'message';
    if (item.id.includes('announcements')) return 'announcement';
  }
  return item.type;
}

function isLiveItem(item: PlaylistItem, output: OutputState, songs: Song[]) {
  if (item.type === 'song') {
    const song = songForProgramItem(item, songs);
    return output.slide?.presentationId === song?.presentationId || output.media?.id === song?.lyricsVideoAssetId;
  }
  return output.slide?.presentationId === item.resourceId || output.media?.id === item.resourceId;
}

function slideText(slide: Slide) {
  const direct = slide.text.trim();
  if (direct) return direct;
  return slide.elements
    ?.map((element) => element.type === 'text' ? element.text.trim() : '')
    .filter(Boolean)
    .join('\n') || 'Blank slide';
}

function slidesForItem(item: PlaylistItem, presentations: Presentation[], songs: Song[]): CanvasSlide[] {
  if (item.type === 'song') {
    const song = songForProgramItem(item, songs);
    const presentation = song?.presentationId
      ? presentations.find((candidate) => candidate.id === song.presentationId)
      : undefined;
    if (!song || !presentation) return [];

    return arrangedSlides(song, presentation).map((occurrence) => ({
      slideId: occurrence.slide.id,
      presentationId: presentation.id,
      arrangementEntryId: occurrence.arrangementEntryId,
      sequence: occurrence.sequence,
      groupLabel: occurrenceLabel(
        occurrence.group,
        occurrence.occurrenceIndex,
        occurrence.occurrenceCount,
      ),
      text: slideText(occurrence.slide),
    }));
  }

  const presentation = presentations.find((candidate) => candidate.id === item.resourceId);
  if (!presentation) return [];
  let sequence = 0;
  return presentation.groups.flatMap((group) => group.slides.map((slide) => ({
    slideId: slide.id,
    presentationId: presentation.id,
    sequence: ++sequence,
    groupLabel: group.name,
    text: slideText(slide),
  })));
}

function groupedSlides(slides: CanvasSlide[]) {
  return slides.reduce<Array<{ label: string; slides: CanvasSlide[] }>>((groups, slide) => {
    const last = groups.at(-1);
    if (last?.label === slide.groupLabel) {
      last.slides.push(slide);
    } else {
      groups.push({ label: slide.groupLabel, slides: [slide] });
    }
    return groups;
  }, []);
}

function LibraryCategory({
  title,
  count,
  children,
  open = true,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details className="libraryCategory" open={open}>
      <summary>
        <span>{title}</span>
        <small>{count}</small>
      </summary>
      <div className="libraryCategoryBody">{children}</div>
    </details>
  );
}

export function LibraryPanel({
  selectedItemId,
  output,
  playlist,
  playlists,
  activePlaylistId,
  presentations,
  songs,
  resourceSources,
  resourceAssetCountBySource,
  onAddResourceFolder,
  onRemoveResourceFolder,
  onCreatePresentation,
  onCreateSong,
  onAddPresentationToService,
  onAddSongToService,
  onDuplicateSelected,
  onDeleteSelected,
  onRemoveServiceItem,
  onResetSongOverride,
  onMoveServiceItem,
  onSelectItem,
  onSelectService,
  onCreateService,
  onDuplicateService,
  onDeleteService,
  onUpdateService,
}: LibraryPanelProps) {
  const [libraryQuery, setLibraryQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  useEffect(() => {
    setPortalTarget(document.querySelector('.operatorMain'));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('service-editor-open', editorOpen);
    return () => document.documentElement.classList.remove('service-editor-open');
  }, [editorOpen]);

  useEffect(() => {
    setEditorOpen(false);
  }, [activePlaylistId]);

  const selectedItem = playlist.items.find((item) => item.id === selectedItemId);
  const canManageSelected = Boolean(
    selectedItem &&
    ['presentation', 'song', 'bible', 'timer'].includes(selectedItem.type),
  );

  const linkedPresentationIds = useMemo(
    () => new Set(songs.map((song) => song.presentationId).filter(Boolean)),
    [songs],
  );
  const query = libraryQuery.trim().toLowerCase();
  const sortedSongs = useMemo(
    () => [...songs]
      .filter((song) => !query || song.title.toLowerCase().includes(query))
      .sort((a, b) => a.title.localeCompare(b.title)),
    [query, songs],
  );
  const standalonePresentations = useMemo(
    () => presentations
      .filter((presentation) => !linkedPresentationIds.has(presentation.id))
      .filter((presentation) => !query || presentation.title.toLowerCase().includes(query))
      .sort((a, b) => a.title.localeCompare(b.title)),
    [linkedPresentationIds, presentations, query],
  );
  const slidePresentations = standalonePresentations.filter((presentation) =>
    presentation.category !== 'scripture' && presentation.category !== 'timer',
  );
  const scripturePresentations = standalonePresentations.filter((presentation) =>
    presentation.category === 'scripture',
  );
  const timerPresentations = standalonePresentations.filter((presentation) =>
    presentation.category === 'timer',
  );

  const canvasItems = useMemo(
    () => playlist.items.map((item) => ({
      item,
      slides: slidesForItem(item, presentations, songs),
      live: isLiveItem(item, output, songs),
    })),
    [output, playlist.items, presentations, songs],
  );

  const liveIndex = canvasItems.findIndex((entry) => entry.live);
  const selectedIndex = canvasItems.findIndex((entry) => entry.item.id === selectedItemId);
  const currentIndex = liveIndex >= 0 ? liveIndex : selectedIndex >= 0 ? selectedIndex : 0;
  const currentEntry = canvasItems[currentIndex];
  const nextEntry = canvasItems[currentIndex + 1];
  const currentSlide = currentEntry?.slides.find((slide) =>
    output.slide?.presentationId === slide.presentationId &&
    output.slide.slideId === slide.slideId &&
    (!slide.arrangementEntryId || !output.slide.arrangementEntryId || output.slide.arrangementEntryId === slide.arrangementEntryId),
  );

  const selectService = (playlistId: string) => {
    setEditorOpen(false);
    onSelectService(playlistId);
  };

  const openEditor = (itemId: string) => {
    onSelectItem(itemId);
    setEditorOpen(true);
  };

  const triggerCanvasSlide = (itemId: string, slideIndex: number) => {
    onSelectItem(itemId);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const workspace = document.querySelector('.operatorMain > .slideWorkspace');
        const thumbnails = workspace?.querySelectorAll<HTMLButtonElement>('.slideThumbnail');
        thumbnails?.[slideIndex]?.click();
      });
    });
  };

  const renderPresentationRows = (items: Presentation[]) => items.map((presentation) => {
    const count = playlist.items.filter((item) => item.resourceId === presentation.id).length;
    const icon: IconName = presentation.category === 'scripture'
      ? 'bible'
      : presentation.category === 'timer'
        ? 'timer'
        : 'presentation';
    return (
      <div className="libraryResourceRow" key={presentation.id}>
        <Icon name={icon} />
        <span title={presentation.title}>{presentation.title}</span>
        {count ? <small>{count}×</small> : null}
        <button
          type="button"
          title="Add to current program"
          onClick={() => onAddPresentationToService(presentation.id)}
        >
          ＋
        </button>
      </div>
    );
  });

  const serviceCanvas = (
    <section className="serviceCanvasPortal" aria-label={`${playlist.title} program canvas`}>
      <header className="serviceCanvasHeader programCanvasHeader">
        <div className="serviceCanvasTitleRow">
          <Icon name="playlist" />
          <div>
            <input
              aria-label="Program name"
              className="serviceCanvasTitleInput"
              value={playlist.title}
              onChange={(event) => onUpdateService({ title: event.target.value })}
            />
            <span>{playlist.items.length} items · scroll through the full program</span>
          </div>
          <input
            aria-label="Program date"
            className="serviceCanvasDateInput"
            type="date"
            value={playlist.serviceDate ?? ''}
            onChange={(event) => onUpdateService({ serviceDate: event.target.value || undefined })}
          />
        </div>
        <input
          aria-label="Program description"
          className="serviceCanvasDescriptionInput"
          placeholder="Optional program note"
          value={playlist.description ?? ''}
          onChange={(event) => onUpdateService({ description: event.target.value || undefined })}
        />
        <ProgramHeaderActions
          onDuplicateService={onDuplicateService}
          onUpdateService={onUpdateService}
          playlist={playlist}
        />
      </header>

      <div className="serviceNowNext">
        <div className={liveIndex >= 0 ? 'isLive' : ''}>
          <span>{liveIndex >= 0 ? 'LIVE' : 'CURRENT'}</span>
          <strong>{currentEntry?.item.title ?? 'No program item selected'}</strong>
          <small>{currentSlide ? `Slide ${currentSlide.sequence} · ${currentSlide.groupLabel}` : currentEntry ? `${currentEntry.slides.length} slides` : ''}</small>
        </div>
        <i />
        <div>
          <span>NEXT</span>
          <strong>{nextEntry?.item.title ?? 'End of program'}</strong>
          <small>{nextEntry ? `${nextEntry.slides.length} slides` : 'No more items'}</small>
        </div>
        <div className="serviceNowNextActions">
          <button type="button" disabled={!canManageSelected} onClick={onDuplicateSelected}>Duplicate Item</button>
          <button className="danger" type="button" disabled={!canManageSelected} onClick={onDeleteSelected}>Delete Item</button>
        </div>
      </div>

      <div className="serviceCanvasScroll">
        {canvasItems.length ? canvasItems.map(({ item, slides, live }, index) => {
          const selected = selectedItemId === item.id;
          const groups = groupedSlides(slides);
          return (
            <section
              className={`serviceCanvasItem tone-${itemTone(item, presentations)} ${selected ? 'isSelected' : ''} ${live ? 'isLive' : ''}`}
              key={item.id}
            >
              <header className="serviceCanvasItemHeader">
                <button className="serviceCanvasItemIdentity" type="button" onClick={() => onSelectItem(item.id)}>
                  <span className="serviceCanvasItemNumber">{index + 1}</span>
                  <Icon name={itemIcons[item.type]} />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.type.replace('-', ' ').toUpperCase()} · {slides.length ? `${slides.length} slides` : 'no slide deck'}{item.type === 'song' && item.songOverride ? ' · PROGRAM OVERRIDE' : ''}</small>
                  </span>
                  {live ? <em>LIVE</em> : null}
                </button>
                <div className="serviceCanvasItemActions">
                  {item.type === 'song' && item.songOverride ? (
                    <button type="button" title="Discard this Program-specific Song setup" onClick={() => onResetSongOverride(item.id)}>Use Library Setup</button>
                  ) : null}
                  <button type="button" onClick={() => openEditor(item.id)}>
                    {item.type === 'song' ? 'Open / Perform' : 'Edit'}
                  </button>
                  <button type="button" title="Move up" disabled={index === 0} onClick={() => onMoveServiceItem(item.id, -1)}>↑</button>
                  <button type="button" title="Move down" disabled={index === playlist.items.length - 1} onClick={() => onMoveServiceItem(item.id, 1)}>↓</button>
                  <button className="danger" type="button" title="Remove from program" onClick={() => onRemoveServiceItem(item.id)}>×</button>
                </div>
              </header>

              {groups.length ? groups.map((group) => (
                <div className="serviceCanvasGroup" key={`${item.id}:${group.label}:${group.slides[0]?.sequence ?? 0}`}>
                  <div className="serviceCanvasGroupLabel">
                    <span>{group.label}</span>
                    <small>{group.slides.length}</small>
                  </div>
                  <div className="serviceCanvasSlideGrid">
                    {group.slides.map((slide) => {
                      const slideLive = output.slide?.presentationId === slide.presentationId &&
                        output.slide.slideId === slide.slideId &&
                        (!slide.arrangementEntryId || !output.slide.arrangementEntryId || output.slide.arrangementEntryId === slide.arrangementEntryId);
                      return (
                        <button
                          className={`serviceCanvasSlide ${slideLive ? 'isLive' : ''}`}
                          key={`${item.id}:${slide.arrangementEntryId ?? 'source'}:${slide.slideId}:${slide.sequence}`}
                          onClick={() => triggerCanvasSlide(item.id, slide.sequence - 1)}
                          type="button"
                          title={`Show ${item.title} · ${group.label} · slide ${slide.sequence}`}
                        >
                          <span className="serviceCanvasSlideSurface">
                            {slide.text.split('\n').slice(0, 5).map((line, lineIndex) => (
                              <span key={`${slide.slideId}:${lineIndex}`}>{line || ' '}</span>
                            ))}
                          </span>
                          <span className="serviceCanvasSlideNumber">{slide.sequence}</span>
                          {slideLive ? <span className="serviceCanvasLiveFlag">LIVE</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )) : (
                <button className="serviceCanvasNoSlides" type="button" onClick={() => openEditor(item.id)}>
                  <Icon name={itemIcons[item.type]} />
                  <span>
                    <strong>{item.title}</strong>
                    <small>Open this item for its dedicated controls.</small>
                  </span>
                </button>
              )}
            </section>
          );
        }) : (
          <div className="serviceCanvasEmpty">
            <Icon name="playlist" />
            <strong>This program is empty</strong>
            <span>Add Songs, slides or Bible content from the Library on the left.</span>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <>
      <aside className="libraryPanel" aria-label="Library">
        <section className="libraryTree libraryManager">
          <div className="panelBar">
            <span>LIBRARY</span>
            <button className="panelAction" title="Add a local or OneDrive-synced resource folder" type="button" onClick={onAddResourceFolder}>＋</button>
          </div>

          {editorOpen ? (
            <button className="backToServiceCanvas" type="button" onClick={() => setEditorOpen(false)}>
              ← Back to full program
            </button>
          ) : null}

          <ProgramSidebar
            activePlaylistId={activePlaylistId}
            onCreateService={onCreateService}
            onDeleteService={onDeleteService}
            onDuplicateService={onDuplicateService}
            onSelectService={selectService}
            onUpdateService={onUpdateService}
            playlist={playlist}
            playlists={playlists}
          />

          <div className="libraryCreateRow">
            <button type="button" onClick={onCreatePresentation}>
              <Icon name="presentation" />
              New Slides
            </button>
            <button type="button" onClick={onCreateSong}>
              <Icon name="audio" />
              New Song
            </button>
          </div>

          <div className="librarySearchField">
            <Icon name="search" />
            <input
              aria-label="Search library"
              onChange={(event) => setLibraryQuery(event.target.value)}
              placeholder="Search songs and slides…"
              value={libraryQuery}
            />
            {libraryQuery ? <button type="button" onClick={() => setLibraryQuery('')}>×</button> : null}
          </div>

          <div className="libraryCategories">
            <LibraryCategory title="SONGS" count={sortedSongs.length}>
              {sortedSongs.length ? sortedSongs.map((song) => {
                const count = playlist.items.filter((item) => item.type === 'song' && item.resourceId === song.id).length;
                return (
                  <div className="libraryResourceRow" key={song.id}>
                    <Icon name="audio" />
                    <span title={song.title}>{song.title}</span>
                    {count ? <small>{count}×</small> : null}
                    <button type="button" title="Add Song to current program" onClick={() => onAddSongToService(song.id)}>＋</button>
                  </div>
                );
              }) : <span className="libraryCategoryEmpty">No matching songs</span>}
            </LibraryCategory>

            <LibraryCategory title="SLIDES" count={slidePresentations.length}>
              {slidePresentations.length ? renderPresentationRows(slidePresentations) : <span className="libraryCategoryEmpty">No matching slide decks</span>}
            </LibraryCategory>

            <LibraryCategory title="BIBLE" count={scripturePresentations.length} open={false}>
              {scripturePresentations.length ? renderPresentationRows(scripturePresentations) : <span className="libraryCategoryEmpty">No matching Bible slides</span>}
            </LibraryCategory>

            <LibraryCategory title="TIMERS" count={timerPresentations.length} open={false}>
              {timerPresentations.length ? renderPresentationRows(timerPresentations) : <span className="libraryCategoryEmpty">No matching timers</span>}
            </LibraryCategory>

            <LibraryCategory title="RESOURCE FOLDERS" count={resourceSources.length} open={false}>
              <div className="resourceFolderList">
                {resourceSources.length ? resourceSources.map((source) => (
                  <div className="resourceTreeRow" key={source.id} title={source.path}>
                    <Icon className="rowIcon" name="folder" />
                    <span>{source.label}</span>
                    <small>{resourceAssetCountBySource[source.id] ?? 0}</small>
                    <button
                      aria-label={'Remove ' + source.label}
                      title="Remove this folder from Presenter (does not delete files)"
                      type="button"
                      onClick={() => onRemoveResourceFolder(source.id)}
                    >
                      ×
                    </button>
                  </div>
                )) : (
                  <button className="resourceEmptyRow" type="button" onClick={onAddResourceFolder}>
                    <Icon name="folder" />
                    <span>Add OneDrive or local folder…</span>
                  </button>
                )}
              </div>
            </LibraryCategory>
          </div>

          <div className="librarySummary compactLibrarySummary">
            <span><Icon name="presentation" />{presentations.length} presentations</span>
            <span><Icon name="audio" />{songs.length} songs</span>
          </div>
        </section>
      </aside>
      {portalTarget && !editorOpen ? createPortal(serviceCanvas, portalTarget) : null}
    </>
  );
}
