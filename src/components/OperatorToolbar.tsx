import { useEffect, useState } from 'react';
import type { ScreenKind } from '../domain/types';
import { Icon, type IconName } from './ui/Icon';

interface OperatorToolbarProps {
  screenVisibility: Record<ScreenKind, boolean>;
  onOpenSearch: () => void;
  onShowMedia: () => void;
  onToggleScreen: (kind: ScreenKind) => void;
}

type ToolbarWorkspaceMode = 'show' | 'edit' | 'other';

type AuthoringTool = {
  label: string;
  icon: IconName;
  workspaceAction?: 'show' | 'edit';
};

const authoringTools: AuthoringTool[] = [
  { label: 'Text', icon: 'text' },
  { label: 'Theme', icon: 'theme' },
  { label: 'Show', icon: 'show', workspaceAction: 'show' },
  { label: 'Edit', icon: 'edit', workspaceAction: 'edit' },
  { label: 'Reflow', icon: 'reflow' },
  { label: 'Bible', icon: 'bible' },
  { label: 'More', icon: 'more' },
];

function workspaceActionButtons() {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>('.workspaceHeaderActions > button'),
  );
}

function buttonLabel(button: HTMLButtonElement | undefined) {
  return button?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function findEditButton() {
  return workspaceActionButtons().find((button) => {
    const label = buttonLabel(button);
    return label === 'Edit' || label === 'Done Editing';
  });
}

function currentWorkspaceMode(): ToolbarWorkspaceMode {
  const active = workspaceActionButtons().find((button) => button.classList.contains('isActive'));
  if (!active) return 'show';
  return buttonLabel(active) === 'Done Editing' ? 'edit' : 'other';
}

function showWorkspace() {
  const active = workspaceActionButtons().find((button) => button.classList.contains('isActive'));
  if (active) active.click();
}

function editWorkspace() {
  const edit = findEditButton();
  if (!edit || edit.disabled || buttonLabel(edit) === 'Done Editing') return;

  const active = workspaceActionButtons().find((button) => button.classList.contains('isActive'));
  if (active && active !== edit) {
    active.click();
    window.requestAnimationFrame(() => {
      const refreshedEdit = findEditButton();
      if (refreshedEdit && !refreshedEdit.disabled && buttonLabel(refreshedEdit) === 'Edit') {
        refreshedEdit.click();
      }
    });
    return;
  }

  edit.click();
}

export function OperatorToolbar({ screenVisibility, onOpenSearch, onShowMedia, onToggleScreen }: OperatorToolbarProps) {
  const [workspaceMode, setWorkspaceMode] = useState<ToolbarWorkspaceMode>('show');
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const syncWorkspaceState = () => {
      const edit = findEditButton();
      setCanEdit(Boolean(edit && !edit.disabled));
      setWorkspaceMode(currentWorkspaceMode());
    };

    syncWorkspaceState();
    const observer = new MutationObserver(syncWorkspaceState);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'disabled'],
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <header className="operatorToolbar">
      <div className="toolbarGroup toolbarPrimary">
        <button className="toolbarTool" onClick={onOpenSearch} title="Search library (Cmd/Ctrl+F)" type="button">
          <Icon name="search" />
          <span>Search</span>
        </button>
        <span className="toolbarDivider" />
        {authoringTools.map((tool) => {
          const active =
            tool.workspaceAction === 'show'
              ? workspaceMode === 'show'
              : tool.workspaceAction === 'edit'
                ? workspaceMode === 'edit'
                : false;
          const disabled = tool.workspaceAction === 'edit' && !canEdit;
          const title = tool.workspaceAction === 'show'
            ? 'Return to the normal Show / slide workspace'
            : tool.workspaceAction === 'edit'
              ? canEdit
                ? 'Edit the selected Presentation or Song slides'
                : 'Select a Presentation or Song to edit'
              : `${tool.label} — planned feature`;

          return (
            <button
              className={`toolbarTool ${active ? 'isActive' : ''}`}
              disabled={disabled}
              key={tool.label}
              onClick={tool.workspaceAction === 'show'
                ? showWorkspace
                : tool.workspaceAction === 'edit'
                  ? editWorkspace
                  : undefined}
              title={title}
              type="button"
            >
              <Icon name={tool.icon} />
              <span>{tool.label}</span>
            </button>
          );
        })}
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
