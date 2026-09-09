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
  presentations: Presentation[];
  songs: Song[];
  resourceSources: ResourceSource[];
  resourceAssetCountBySource: Record<string, number>;
  onAddResourceFolder: () => void;
  onRemoveResourceFolder: (sourceId: string) => void;
  onSelectItem: (id: string) => void;
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

export function LibraryPanel({
  selectedItemId,
  output,
  playlist,
  presentations,
  songs,
  resourceSources,
  resourceAssetCountBySource,
  onAddResourceFolder,
  onRemoveResourceFolder,
  onSelectItem,
}: LibraryPanelProps) {
  const scriptureCount = presentations.filter((presentation) => presentation.category === 'scripture').length;

  return (
    <aside className="libraryPanel" aria-label="Library and playlist">
      <section className="libraryTree">
        <div className="panelBar">
          <span>LIBRARY</span>
          <button className="panelAction" title="Add a local or OneDrive-synced resource folder" type="button" onClick={onAddResourceFolder}>＋</button>
        </div>
        <div className="treeSectionLabel">LIBRARIES</div>
        <button className="treeRow isSelected" type="button">
          <Icon className="disclosure isOpen" name="chevron" />
          <Icon className="rowIcon" name="folder" />
          <span>Kids Church</span>
          <small>{presentations.length}</small>
        </button>
        <button className="treeRow treeChild" type="button">
          <span className="treeSpacer" />
          <Icon className="rowIcon" name="presentation" />
          <span>Presentations</span>
          <small>{presentations.length}</small>
        </button>
        <button className="treeRow treeChild" type="button">
          <span className="treeSpacer" />
          <Icon className="rowIcon" name="bible" />
          <span>Bible</span>
          <small>{scriptureCount}</small>
        </button>

        <div className="treeSectionLabel resourceTreeLabel">
          <span>RESOURCE FOLDERS</span>
          <small>{resourceSources.length}</small>
        </div>
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

        <div className="treeSectionLabel playlistTreeLabel">PLAYLISTS</div>
        <button className="treeRow isSelected" type="button">
          <Icon className="disclosure isOpen" name="chevron" />
          <Icon className="rowIcon" name="playlist" />
          <span>{playlist.title}</span>
          <small>{playlist.items.length}</small>
        </button>
      </section>

      <section className="serviceOrder">
        <div className="serviceHeader">
          <div>
            <strong>{playlist.title.toUpperCase()}</strong>
            <small>CURRENT SERVICE</small>
          </div>
          <span>{playlist.items.length} items</span>
        </div>
        <div className="serviceItems">
          {playlist.items.map((item, index) => {
            const live = isLiveItem(item, output, songs);
            const selected = selectedItemId === item.id;
            return (
              <button
                className={`serviceItem tone-${itemTone(item, presentations)} ${selected ? 'isSelected' : ''} ${live ? 'isLive' : ''}`}
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                type="button"
              >
                <i className="itemAccent" />
                <span className="itemIndex">{index + 1}</span>
                <Icon className="itemIcon" name={itemIcons[item.type]} />
                <span className="itemName">{item.title}</span>
                {live ? <span className="itemLive">LIVE</span> : null}
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
