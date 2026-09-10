import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { SongTransportSnapshot } from '../audio/useSongTransport';
import type {
  MediaAsset,
  NetworkStageInfo,
  OutputState,
  ResourceSource,
  StageOutputState,
  Song,
} from '../domain/types';
import { AudioCuePanel } from './AudioCuePanel';
import { Icon } from './ui/Icon';
import { MediaPlaybackEditor } from './MediaPlaybackEditor';

export type MediaBinTab = 'Media' | 'Audio' | 'Stage' | 'Timers';

interface MediaBinProps {
  activeTab: MediaBinTab;
  setActiveTab: Dispatch<SetStateAction<MediaBinTab>>;
  assets: MediaAsset[];
  resourceSources: ResourceSource[];
  output: OutputState;
  stageOutput: StageOutputState;
  networkStage: NetworkStageInfo;
  activeSong?: Song;
  songTransport: SongTransportSnapshot;
  onPlaySong: (song: Song) => void;
  onPauseSong: () => void;
  onResumeSong: () => void;
  onStopSong: () => void;
  onSeekSong: (positionMs: number) => void;
  onToggleStem: (stemId: string, enabled: boolean) => void;
  onRescanResources: () => void;
  onTriggerMedia: (asset: MediaAsset) => void;
}

const tabs: Array<{ label: MediaBinTab; icon: 'media' | 'audio' | 'stage' | 'timer' }> = [
  { label: 'Media', icon: 'media' },
  { label: 'Audio', icon: 'audio' },
  { label: 'Stage', icon: 'stage' },
  { label: 'Timers', icon: 'timer' },
];

function PlaceholderTab({ tab, detail }: { tab: Exclude<MediaBinTab, 'Media'>; detail: string }) {
  const icon = tab === 'Audio' ? 'audio' : tab === 'Stage' ? 'stage' : 'timer';
  return (
    <div className="binPlaceholder">
      <Icon name={icon} />
      <div><strong>{tab}</strong><span>{detail}</span></div>
    </div>
  );
}

function AssetArtwork({ asset, live }: { asset: MediaAsset; live: boolean }) {
  return (
    <span className={`assetArtwork asset-${asset.id}`}>
      {asset.kind === 'still' && asset.fileUrl ? (
        <img src={asset.fileUrl} alt="" loading="lazy" />
      ) : asset.kind === 'motion' || asset.kind === 'video' ? (
        <>
          {asset.fileUrl ? <video src={asset.fileUrl} muted preload="metadata" /> : null}
          <Icon name="media" />
        </>
      ) : null}
      {live ? <b>LIVE</b> : null}
    </span>
  );
}

export function MediaBin({
  activeTab,
  setActiveTab,
  assets,
  resourceSources,
  output,
  stageOutput,
  networkStage,
  activeSong,
  songTransport,
  onPlaySong,
  onPauseSong,
  onResumeSong,
  onStopSong,
  onSeekSong,
  onRescanResources,
  onTriggerMedia,
}: MediaBinProps) {
  const [filter, setFilter] = useState<'all' | 'backgrounds' | string>('all');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const visualAssets = useMemo(() => assets.filter((asset) => asset.kind !== 'audio'), [assets]);

  const visibleAssets = useMemo(() => {
    if (filter === 'backgrounds') return visualAssets.filter((asset) => asset.kind === 'still' || asset.kind === 'motion');
    if (filter === 'all') return visualAssets;
    return visualAssets.filter((asset) => asset.sourceId === filter);
  }, [filter, visualAssets]);

  const backgrounds = visualAssets.filter((asset) => asset.kind === 'still' || asset.kind === 'motion').length;
  const selectedAsset = useMemo(() => {
    const explicitlySelected = selectedAssetId
      ? visualAssets.find((asset) => asset.id === selectedAssetId)
      : undefined;
    if (explicitlySelected) return explicitlySelected;
    return output.media
      ? visualAssets.find((asset) => asset.id === output.media?.id)
      : undefined;
  }, [output.media, selectedAssetId, visualAssets]);
  const selectedAssetIsLive = Boolean(selectedAsset && output.media?.id === selectedAsset.id);
  const selectedAssetDefaultLoop = selectedAssetIsLive
    ? Boolean(output.media?.loop)
    : selectedAsset?.kind === 'motion';

  return (
    <section className="mediaBin" aria-label="Media bin">
      <header className="mediaBinHeader">
        <div className="mediaTabs">
          {tabs.map((tab) => (
            <button className={activeTab === tab.label ? 'isActive' : ''} key={tab.label} onClick={() => setActiveTab(tab.label)} type="button">
              <Icon name={tab.icon}/><span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="binHeaderActions">
          {activeTab === 'Media' && resourceSources.length ? (
            <button type="button" onClick={onRescanResources}>Rescan Folders</button>
          ) : null}
          <span className="binContext">
            {activeTab === 'Media'
              ? `${visibleAssets.length} of ${visualAssets.length} visual assets`
              : activeTab === 'Audio'
                ? `${assets.filter((asset) => asset.kind === 'audio').length} indexed audio assets`
                : 'Operator utility'}
          </span>
        </div>
      </header>

      <div className="mediaBinBody">
        {activeTab === 'Media' ? (
          <>
            <nav className="mediaCategories" aria-label="Media categories">
              <small>MEDIA BIN</small>
              <button className={filter === 'all' ? 'isSelected' : ''} type="button" onClick={() => setFilter('all')}>
                <Icon name="folder"/>All Media <span>{visualAssets.length}</span>
              </button>
              <button className={filter === 'backgrounds' ? 'isSelected' : ''} type="button" onClick={() => setFilter('backgrounds')}>
                <Icon name="folder"/>Backgrounds <span>{backgrounds}</span>
              </button>
              {resourceSources.map((source) => (
                <button className={filter === source.id ? 'isSelected' : ''} key={source.id} type="button" onClick={() => setFilter(source.id)} title={source.path}>
                  <Icon name="folder"/>{source.label}
                  <span>{visualAssets.filter((asset) => asset.sourceId === source.id).length}</span>
                </button>
              ))}
            </nav>
            <div className="mediaAssetStrip">
              {visibleAssets.length ? visibleAssets.map((asset) => {
                const live = output.media?.id === asset.id;
                const selected = selectedAsset?.id === asset.id;
                return (
                  <button
                    className={`mediaAsset ${live ? 'isLive' : ''} ${selected ? 'isSelected' : ''}`}
                    key={asset.id}
                    onClick={() => {
                      setSelectedAssetId(asset.id);
                      onTriggerMedia(asset);
                    }}
                    type="button"
                    title={asset.relativePath || asset.title}
                  >
                    <AssetArtwork asset={asset} live={live} />
                    <span className="assetName">{asset.title}</span>
                    <small>{asset.kind.toUpperCase()}{asset.sourceLabel ? ' · ' + asset.sourceLabel : ''}</small>
                  </button>
                );
              }) : (
                <div className="emptyMediaLibrary">
                  <Icon name="folder" />
                  <strong>No media in this view</strong>
                  <span>Add a OneDrive/local resource folder or choose another media category.</span>
                </div>
              )}
            </div>
            <MediaPlaybackEditor
              asset={selectedAsset}
              defaultLoop={selectedAssetDefaultLoop}
              isLive={selectedAssetIsLive}
              onRetrigger={onTriggerMedia}
            />
          </>
        ) : activeTab === 'Audio' ? (
          <AudioCuePanel
            activeSong={activeSong}
            assets={assets}
            onPauseSong={onPauseSong}
            onPlaySong={onPlaySong}
            onResumeSong={onResumeSong}
            onSeekSong={onSeekSong}
            onStopSong={onStopSong}
            songTransport={songTransport}
          />
        ) : activeTab === 'Stage' ? (
          <PlaceholderTab tab="Stage" detail={`${networkStage.clientCount} tablet${networkStage.clientCount === 1 ? '' : 's'} connected · ${stageOutput.presentationTitle || 'No live presentation'}`} />
        ) : (
          <PlaceholderTab tab="Timers" detail="Timer controls will appear here when the timer engine is implemented." />
        )}
      </div>
    </section>
  );
}
