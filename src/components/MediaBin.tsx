import type { Dispatch, SetStateAction } from 'react';
import { mediaAssets } from '../data/demo';
import type { MediaAsset, NetworkStageInfo, OutputState, StageOutputState } from '../domain/types';
import { Icon } from './ui/Icon';

export type MediaBinTab = 'Media' | 'Audio' | 'Stage' | 'Timers';

interface MediaBinProps {
  activeTab: MediaBinTab;
  setActiveTab: Dispatch<SetStateAction<MediaBinTab>>;
  output: OutputState;
  stageOutput: StageOutputState;
  networkStage: NetworkStageInfo;
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

export function MediaBin({ activeTab, setActiveTab, output, stageOutput, networkStage, onTriggerMedia }: MediaBinProps) {
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
        <span className="binContext">{activeTab === 'Media' ? `${mediaAssets.length} assets` : 'Operator utility'}</span>
      </header>

      <div className="mediaBinBody">
        {activeTab === 'Media' ? (
          <>
            <nav className="mediaCategories" aria-label="Media categories">
              <small>MEDIA BIN</small>
              <button className="isSelected" type="button"><Icon name="folder"/>All Media <span>{mediaAssets.length}</span></button>
              <button type="button"><Icon name="folder"/>Backgrounds <span>2</span></button>
              <button type="button"><Icon name="folder"/>Kids Church <span>3</span></button>
            </nav>
            <div className="mediaAssetStrip">
              {mediaAssets.map((asset) => {
                const live = output.media?.id === asset.id;
                return (
                  <button className={`mediaAsset ${live ? 'isLive' : ''}`} key={asset.id} onClick={() => onTriggerMedia(asset)} type="button">
                    <span className={`assetArtwork asset-${asset.id}`}>
                      {asset.kind === 'video' || asset.kind === 'motion' ? <Icon name="media" /> : null}
                      {live ? <b>LIVE</b> : null}
                    </span>
                    <span className="assetName">{asset.title}</span>
                    <small>{asset.kind.toUpperCase()}</small>
                  </button>
                );
              })}
            </div>
          </>
        ) : activeTab === 'Audio' ? (
          <PlaceholderTab tab="Audio" detail="Audio layer is clear. Full playback controls are planned." />
        ) : activeTab === 'Stage' ? (
          <PlaceholderTab tab="Stage" detail={`${networkStage.clientCount} tablet${networkStage.clientCount === 1 ? '' : 's'} connected · ${stageOutput.presentationTitle || 'No live presentation'}`} />
        ) : (
          <PlaceholderTab tab="Timers" detail="Timer controls will appear here when the timer engine is implemented." />
        )}
      </div>
    </section>
  );
}
