import type { ScreenKind } from '../domain/types';
import { Icon, type IconName } from './ui/Icon';

interface OperatorToolbarProps {
  screenVisibility: Record<ScreenKind, boolean>;
  onOpenSearch: () => void;
  onShowMedia: () => void;
  onToggleScreen: (kind: ScreenKind) => void;
}

const authoringTools: Array<{ label: string; icon: IconName; active?: boolean }> = [
  { label: 'Text', icon: 'text' },
  { label: 'Theme', icon: 'theme' },
  { label: 'Show', icon: 'show', active: true },
  { label: 'Edit', icon: 'edit' },
  { label: 'Reflow', icon: 'reflow' },
  { label: 'Bible', icon: 'bible' },
  { label: 'More', icon: 'more' },
];

export function OperatorToolbar({ screenVisibility, onOpenSearch, onShowMedia, onToggleScreen }: OperatorToolbarProps) {
  return (
    <header className="operatorToolbar">
      <div className="toolbarGroup toolbarPrimary">
        <button className="toolbarTool" onClick={onOpenSearch} title="Search library (Cmd/Ctrl+F)" type="button">
          <Icon name="search" />
          <span>Search</span>
        </button>
        <span className="toolbarDivider" />
        {authoringTools.map((tool) => (
          <button
            className={`toolbarTool ${tool.active ? 'isActive' : ''}`}
            key={tool.label}
            title={tool.active ? 'Show workspace' : `${tool.label} — planned feature`}
            type="button"
          >
            <Icon name={tool.icon} />
            <span>{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="toolbarGroup toolbarOutputs">
        <button className="toolbarTool" onClick={onShowMedia} type="button">
          <Icon name="media" />
          <span>Media</span>
        </button>
        <button className="toolbarTool" title="Looks — planned feature" type="button">
          <Icon name="looks" />
          <span>Looks</span>
        </button>
        <span className="toolbarDivider" />
        {(['audience', 'stage'] as const).map((kind) => (
          <button
            className={`outputTool ${screenVisibility[kind] ? 'isOn' : ''}`}
            key={kind}
            onClick={() => onToggleScreen(kind)}
            type="button"
          >
            <span className="outputIconWrap">
              <Icon name={kind} />
              <i className="statusDot" />
            </span>
            <span>{kind === 'audience' ? 'Audience' : 'Stage'}</span>
          </button>
        ))}
      </div>
    </header>
  );
}
