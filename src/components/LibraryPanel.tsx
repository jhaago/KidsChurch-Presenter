import type {
  OutputState,
  Playlist,
  PlaylistItem,
  Presentation,
  ResourceSource,
  Song,
} from '../domain/types';
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
  onMoveServiceItem: (itemId: string, direction: -1 | 1) => void;
  onSelectItem: (id: string) => void;
  onSelectService: (playlistId: string) => void;
  onCreateService: () => void;
  onDuplicateService: () => void;
  onDeleteService: () => void;
  onUpdateService: (updates: Partial<Pick<Playlist, 'title' | 'serviceDate' | 'description'>>) => void;
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
    const song = songs.find((candidate) => candidate.id === item.resourceId);
    return output.slide?.presentationId === song?.presentationId || output.media?.id === song?.lyricsVideoAssetId;
  }
  return output.slide?.presentationId === item.resourceId || output.media?.id === item.resourceId;
}

function serviceDateLabel(value?: string) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
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
  onMoveServiceItem,
  onSelectItem,
  onSelectService,
  onCreateService,
  onDuplicateService,
  onDeleteService,
  onUpdateService,
}: LibraryPanelProps) {
  const selectedItem = playlist.items.find((item) => item.id === selectedItemId);
  const canManageSelected = Boolean(
    selectedItem &&
    ['presentation', 'song', 'bible', 'timer'].includes(selectedItem.type),
  );
  const linkedPresentationIds = new Set(songs.map((song) => song.presentationId).filter(Boolean));
  const standalonePresentations = presentations
    .filter((presentation) => !linkedPresentationIds.has(presentation.id))
    .sort((a, b) => a.title.localeCompare(b.title));
  const sortedSongs = [...songs].sort((a, b) => a.title.localeCompare(b.title));
  const scriptureCount = presentations.filter((presentation) => presentation.category === 'scripture').length;

  return (
    <aside className="libraryPanel" aria-label="Library and playlist">
      <section className="libraryTree libraryManager">
        <div className="panelBar">
          <span>LIBRARY</span>
          <button className="panelAction" title="Add a local or OneDrive-synced resource folder" type="button" onClick={onAddResourceFolder}>＋</button>
        </div>

        <section className="servicesManager" aria-label="Saved services">
          <div className="servicesManagerHeader">
            <span>SERVICES</span>
            <small>{playlists.length}</small>
            <button type="button" onClick={onCreateService}>＋ New</button>
          </div>
          <div className="servicesList">
            {playlists.map((service) => (
              <button
                className={service.id === activePlaylistId ? 'isActive' : ''}
                key={service.id}
                onClick={() => onSelectService(service.id)}
                type="button"
                title={service.description || service.title}
              >
                <Icon name="playlist" />
                <span>
                  <strong>{service.title}</strong>
                  <small>{serviceDateLabel(service.serviceDate) || `${service.items.length} items`}</small>
                </span>
                <em>{service.items.length}</em>
              </button>
            ))}
          </div>
          <div className="servicesActions">
            <button type="button" onClick={onDuplicateService}>Duplicate Service</button>
            <button className="danger" type="button" disabled={playlists.length <= 1} onClick={onDeleteService}>Delete Service</button>
          </div>
        </section>

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

        <div className="treeSectionLabel libraryManagerLabel">
          <span>LIBRARY ITEMS</span>
          <small>{standalonePresentations.length + songs.length}</small>
        </div>
        <div className="libraryItemList">
          {sortedSongs.map((song) => {
            const count = playlist.items.filter((item) => item.type === 'song' && item.resourceId === song.id).length;
            return (
              <div className="libraryResourceRow" key={song.id}>
                <Icon name="audio" />
                <span title={song.title}>{song.title}</span>
                {count ? <small>{count}×</small> : null}
                <button
                  type="button"
                  title="Add Song to current service"
                  onClick={() => onAddSongToService(song.id)}
                >
                  ＋
                </button>
              </div>
            );
          })}
          {standalonePresentations.map((presentation) => {
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
                  title="Add Presentation to current service"
                  onClick={() => onAddPresentationToService(presentation.id)}
                >
                  ＋
                </button>
              </div>
            );
          })}
        </div>

        <div className="librarySelectionActions">
          <button type="button" disabled={!canManageSelected} onClick={onDuplicateSelected}>Duplicate Item</button>
          <button className="danger" type="button" disabled={!canManageSelected} onClick={onDeleteSelected}>Delete Item</button>
        </div>

        <div className="treeSectionLabel resourceTreeLabel">
          <span>RESOURCE FOLDERS</span>
          <small>{resourceSources.length}</small>
        </div>
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

        <div className="librarySummary">
          <span><Icon name="presentation" />{presentations.length} presentations</span>
          <span><Icon name="bible" />{scriptureCount} Bible</span>
        </div>
      </section>

      <section className="serviceOrder">
        <div className="serviceHeader serviceHeaderEditable">
          <div className="serviceHeaderFields">
            <input
              aria-label="Service name"
              value={playlist.title}
              onChange={(event) => onUpdateService({ title: event.target.value })}
            />
            <div>
              <input
                aria-label="Service date"
                type="date"
                value={playlist.serviceDate ?? ''}
                onChange={(event) => onUpdateService({ serviceDate: event.target.value || undefined })}
              />
              <span>{playlist.items.length} items</span>
            </div>
            <input
              aria-label="Service description"
              className="serviceDescriptionInput"
              placeholder="Optional service note"
              value={playlist.description ?? ''}
              onChange={(event) => onUpdateService({ description: event.target.value || undefined })}
            />
          </div>
        </div>
        <div className="serviceItems">
          {playlist.items.length ? playlist.items.map((item, index) => {
            const live = isLiveItem(item, output, songs);
            const selected = selectedItemId === item.id;
            return (
              <div
                className={`serviceItem serviceItemManaged tone-${itemTone(item, presentations)} ${selected ? 'isSelected' : ''} ${live ? 'isLive' : ''}`}
                key={item.id}
              >
                <i className="itemAccent" />
                <button
                  className="serviceItemSelect"
                  onClick={() => onSelectItem(item.id)}
                  type="button"
                >
                  <span className="itemIndex">{index + 1}</span>
                  <Icon className="itemIcon" name={itemIcons[item.type]} />
                  <span className="itemName">{item.title}</span>
                  {live ? <span className="itemLive">LIVE</span> : null}
                </button>
                <div className="serviceItemActions">
                  <button
                    type="button"
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => onMoveServiceItem(item.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    disabled={index === playlist.items.length - 1}
                    onClick={() => onMoveServiceItem(item.id, 1)}
                  >
                    ↓
                  </button>
                  <button
                    className="danger"
                    type="button"
                    title="Remove from service (keeps library resource)"
                    onClick={() => onRemoveServiceItem(item.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="emptyService">
              <Icon name="playlist" />
              <strong>This service is empty</strong>
              <span>Add saved Songs/Presentations with the ＋ buttons in the Library above.</span>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
