import { presentationById, sundayKidsPlaylist } from '../data/demo';
import type { OutputState, PlaylistItem } from '../domain/types';
import { Icon, type IconName } from './ui/Icon';

interface LibraryPanelProps {
  selectedItemId: string;
  output: OutputState;
  onSelectItem: (id: string) => void;
}

const itemIcons: Record<PlaylistItem['type'], IconName> = {
  presentation: 'presentation',
  media: 'media',
  bible: 'bible',
  timer: 'timer',
  interactive: 'interactive',
  'web-tool': 'web',
};

function itemTone(item: PlaylistItem) {
  if (item.type === 'presentation') {
    const presentation = presentationById(item.resourceId);
    if (presentation?.category === 'song') return 'song';
    if (item.id.includes('message')) return 'message';
    if (item.id.includes('announcements')) return 'announcement';
  }
  return item.type;
}

function isLiveItem(item: PlaylistItem, output: OutputState) {
  return output.slide?.presentationId === item.resourceId || output.media?.id === item.resourceId;
}

export function LibraryPanel({ selectedItemId, output, onSelectItem }: LibraryPanelProps) {
  return (
    <aside className="libraryPanel" aria-label="Library and playlist">
      <section className="libraryTree">
        <div className="panelBar">
          <span>LIBRARY</span>
          <button className="panelAction" title="Add library (planned feature)" type="button">＋</button>
        </div>
        <div className="treeSectionLabel">LIBRARIES</div>
        <button className="treeRow isSelected" type="button">
          <Icon className="disclosure isOpen" name="chevron" />
          <Icon className="rowIcon" name="folder" />
          <span>Kids Church</span>
          <small>8</small>
        </button>
        <button className="treeRow treeChild" type="button">
          <span className="treeSpacer" />
          <Icon className="rowIcon" name="presentation" />
          <span>Presentations</span>
          <small>7</small>
        </button>
        <button className="treeRow treeChild" type="button">
          <span className="treeSpacer" />
          <Icon className="rowIcon" name="bible" />
          <span>Bible</span>
          <small>1</small>
        </button>

        <div className="treeSectionLabel playlistTreeLabel">PLAYLISTS</div>
        <button className="treeRow isSelected" type="button">
          <Icon className="disclosure isOpen" name="chevron" />
          <Icon className="rowIcon" name="playlist" />
          <span>Sunday Kids</span>
          <small>{sundayKidsPlaylist.items.length}</small>
        </button>
        <button className="treeRow" type="button">
          <Icon className="disclosure" name="chevron" />
          <Icon className="rowIcon" name="playlist" />
          <span>Christmas</span>
          <small>0</small>
        </button>
      </section>

      <section className="serviceOrder">
        <div className="serviceHeader">
          <div>
            <strong>SUNDAY KIDS</strong>
            <small>CURRENT SERVICE</small>
          </div>
          <span>{sundayKidsPlaylist.items.length} items</span>
        </div>
        <div className="serviceItems">
          {sundayKidsPlaylist.items.map((item, index) => {
            const live = isLiveItem(item, output);
            const selected = selectedItemId === item.id;
            return (
              <button
                className={`serviceItem tone-${itemTone(item)} ${selected ? 'isSelected' : ''} ${live ? 'isLive' : ''}`}
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
