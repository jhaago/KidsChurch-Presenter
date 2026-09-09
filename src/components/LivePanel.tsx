import type { NetworkStageInfo, OutputState, ScreenKind } from '../domain/types';
import { AudienceOutput } from './AudienceOutput';
import { Icon } from './ui/Icon';

interface LivePanelProps {
  output: OutputState;
  screenVisibility: Record<ScreenKind, boolean>;
  networkStage: NetworkStageInfo;
  onNavigate: (direction: -1 | 1) => void;
  onClearAll: () => void;
  onClearSlide: () => void;
  onClearMedia: () => void;
  onClearProps: () => void;
  onClearAudio: () => void;
  onClearMessage: () => void;
  onClearToLogo: () => void;
  onToggleBlack: () => void;
}

function outputLabel(output: OutputState) {
  if (output.black) return 'Black';
  if (output.logo) return 'Logo';
  if (output.slide) return output.slide.presentationTitle;
  if (output.media) return output.media.title;
  return 'No active content';
}

function hasLiveContent(output: OutputState) {
  return Boolean(
    output.black || output.logo || output.slide || output.media || output.prop || output.message ||
    output.announcement || output.audio || output.liveVideo,
  );
}

function StatusPill({ on, children }: { on: boolean; children: string }) {
  return <span className={`statusPill ${on ? 'isOn' : ''}`}><i />{children}</span>;
}

export function LivePanel({
  output,
  screenVisibility,
  networkStage,
  onNavigate,
  onClearAll,
  onClearSlide,
  onClearMedia,
  onClearProps,
  onClearAudio,
  onClearMessage,
  onClearToLogo,
  onToggleBlack,
}: LivePanelProps) {
  const live = hasLiveContent(output);
  const layerRows = [
    ['Background', Boolean(output.media)],
    ['Media', Boolean(output.media)],
    ['Slide', Boolean(output.slide)],
    ['Prop', Boolean(output.prop)],
    ['Message', Boolean(output.message || output.announcement)],
    ['Audio', Boolean(output.audio)],
  ] as const;

  return (
    <aside className="livePanel" aria-label="Live output status">
      <section className="liveMonitorSection">
        <div className="livePanelHeading">
          <span>LIVE / STATUS</span>
          <strong className={live ? 'isLive' : ''}><i />{live ? 'LIVE' : 'IDLE'}</strong>
        </div>
        <div className={`audienceMonitor ${live ? 'hasOutput' : ''}`}>
          <AudienceOutput output={output} preview />
          <span className="monitorLabel">AUDIENCE · MAIN</span>
        </div>
        <div className="liveDescription">
          <div>
            <small>NOW SHOWING</small>
            <strong>{outputLabel(output)}</strong>
          </div>
          <span>{output.slide?.slideId ?? output.media?.kind ?? '—'}</span>
        </div>
        {output.media ? (
          <div className="mediaNowPlaying">
            <Icon name="media" />
            <div><small>MEDIA LAYER</small><strong>{output.media.title}</strong></div>
            <span>{output.media.kind.toUpperCase()}</span>
          </div>
        ) : null}
        <div className="transportControls">
          <button onClick={() => onNavigate(-1)} type="button"><Icon name="previous" />Previous</button>
          <button onClick={() => onNavigate(1)} type="button">Next<Icon name="next" /></button>
        </div>
      </section>

      <section className="consoleSection clearSection">
        <div className="sectionTitle"><span>CLEAR</span><small>LAYER CONTROLS</small></div>
        <div className="clearGrid">
          <button className="clearAllButton" onClick={onClearAll} type="button"><kbd>F1</kbd><span>Clear All</span></button>
          <button onClick={onClearSlide} type="button"><kbd>F2</kbd><span>Slide</span></button>
          <button onClick={onClearMedia} type="button"><kbd>F3</kbd><span>Media</span></button>
          <button onClick={onClearProps} type="button"><kbd>F4</kbd><span>Props</span></button>
          <button onClick={onClearAudio} type="button"><kbd>F5</kbd><span>Audio</span></button>
          <button onClick={onClearMessage} type="button"><kbd>F6</kbd><span>Message</span></button>
          <button className={output.logo ? 'isActive' : ''} onClick={onClearToLogo} type="button"><kbd>F12</kbd><span>Logo</span></button>
          <button className={`blackButton ${output.black ? 'isActive' : ''}`} onClick={onToggleBlack} type="button"><i /><span>Black</span></button>
        </div>
      </section>

      <section className="consoleSection">
        <div className="sectionTitle"><span>LIVE LAYERS</span><Icon name="layers" /></div>
        <div className="layerStack">
          {layerRows.map(([name, on]) => (
            <div className={on ? 'isOn' : ''} key={name}><i /><span>{name}</span><small>{on ? 'LIVE' : 'CLEAR'}</small></div>
          ))}
        </div>
      </section>

      <section className="consoleSection outputSection">
        <div className="sectionTitle"><span>OUTPUTS</span><small>DESTINATIONS</small></div>
        <div className="destinationGrid">
          <div><Icon name="audience"/><span>Main / Centre</span><StatusPill on={screenVisibility.audience}>{screenVisibility.audience ? 'On' : 'Off'}</StatusPill></div>
          <div><Icon name="stage"/><span>Local Stage</span><StatusPill on={screenVisibility.stage}>{screenVisibility.stage ? 'On' : 'Off'}</StatusPill></div>
          <div><Icon name="web"/><span>Network Stage</span><StatusPill on={networkStage.running}>{networkStage.running ? 'Ready' : 'Offline'}</StatusPill></div>
        </div>
        <div className="networkSummary">
          <div><span>Connected tablets</span><strong>{networkStage.clientCount}</strong></div>
          {networkStage.urls.length ? networkStage.urls.map((url, index) => (
            <div className="networkAddress" key={url}>
              <span title={url}>{url}</span>
              <button onClick={() => navigator.clipboard?.writeText(url).catch(() => undefined)} title="Copy Stage address" type="button">
                <Icon name="copy" />{networkStage.urls.length > 1 ? index + 1 : ''}
              </button>
            </div>
          )) : <p>{networkStage.error || 'Connect to a local network to expose the tablet Stage address.'}</p>}
        </div>
      </section>
    </aside>
  );
}
