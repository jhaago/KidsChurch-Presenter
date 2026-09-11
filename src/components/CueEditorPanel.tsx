import type {
  MediaAsset,
  Presentation,
  PresentationCue,
  PresentationCueAction,
  PresentationCueColor,
  SlideGroup,
} from '../domain/types';
import { Icon } from './ui/Icon';

interface CueEditorPanelProps {
  presentation: Presentation;
  assets: MediaAsset[];
  onChange: (presentation: Presentation) => void;
}

const cueColors: Array<{ value: PresentationCueColor; label: string }> = [
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'amber', label: 'Amber' },
  { value: 'red', label: 'Red' },
  { value: 'purple', label: 'Purple' },
  { value: 'slate', label: 'Slate' },
];

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function updateGroup(
  presentation: Presentation,
  groupId: string,
  updater: (group: SlideGroup) => SlideGroup,
): Presentation {
  return {
    ...presentation,
    groups: presentation.groups.map((group) => group.id === groupId ? updater(group) : group),
  };
}

function updateCue(group: SlideGroup, cueId: string, updater: (cue: PresentationCue) => PresentationCue) {
  return {
    ...group,
    cues: (group.cues ?? []).map((cue) => cue.id === cueId ? updater(cue) : cue),
  };
}

function setAction(
  cue: PresentationCue,
  type: PresentationCueAction['type'],
  assetId: string,
): PresentationCue {
  const otherActions = cue.actions.filter((action) => action.type !== type);
  if (!assetId) return { ...cue, actions: otherActions };
  return {
    ...cue,
    actions: [
      ...otherActions,
      { id: uid(`cue-action-${type}`), type, assetId },
    ],
  };
}

function actionAssetId(cue: PresentationCue, type: PresentationCueAction['type']) {
  return cue.actions.find((action) => action.type === type)?.assetId ?? '';
}

export function CueEditorPanel({ presentation, assets, onChange }: CueEditorPanelProps) {
  const visualAssets = assets.filter((asset) => asset.kind !== 'audio');
  const audioAssets = assets.filter((asset) => asset.kind === 'audio');

  const addCue = (group: SlideGroup) => {
    const nextCue: PresentationCue = {
      id: uid('cue'),
      title: `Cue ${(group.cues?.length ?? 0) + 1}`,
      color: 'blue',
      actions: [],
    };
    onChange(updateGroup(presentation, group.id, (current) => ({
      ...current,
      cues: [...(current.cues ?? []), nextCue],
    })));
  };

  const removeCue = (groupId: string, cueId: string) => {
    onChange(updateGroup(presentation, groupId, (group) => ({
      ...group,
      cues: (group.cues ?? []).filter((cue) => cue.id !== cueId),
    })));
  };

  const moveCue = (groupId: string, cueId: string, direction: -1 | 1) => {
    onChange(updateGroup(presentation, groupId, (group) => {
      const cues = [...(group.cues ?? [])];
      const from = cues.findIndex((cue) => cue.id === cueId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= cues.length) return group;
      const [cue] = cues.splice(from, 1);
      cues.splice(to, 0, cue);
      return { ...group, cues };
    }));
  };

  return (
    <section className="cueEditorPanel" data-presenter-editor="true">
      <header className="cueEditorIntro">
        <div className="cueEditorIntroIcon"><Icon name="interactive" /></div>
        <div>
          <strong>PRESENTATION CUES</strong>
          <span>Create operator-only cue buttons for each group or scene. One click can trigger media and general audio together.</span>
        </div>
      </header>

      <div className="cueEditorGroups">
        {presentation.groups.map((group) => (
          <section className="cueEditorGroup" key={group.id}>
            <header>
              <div>
                <small>GROUP / SCENE</small>
                <strong>{group.name}</strong>
              </div>
              <button type="button" onClick={() => addCue(group)}>+ Add Cue</button>
            </header>

            {(group.cues?.length ?? 0) ? (
              <div className="cueEditorGrid">
                {(group.cues ?? []).map((cue, index) => (
                  <article className={`cueEditorCard cueColor-${cue.color ?? 'blue'}`} key={cue.id}>
                    <div className="cueEditorCardTop">
                      <input
                        aria-label="Cue name"
                        value={cue.title}
                        onChange={(event) => onChange(updateGroup(
                          presentation,
                          group.id,
                          (current) => updateCue(current, cue.id, (item) => ({ ...item, title: event.target.value })),
                        ))}
                      />
                      <select
                        aria-label="Cue colour"
                        value={cue.color ?? 'blue'}
                        onChange={(event) => onChange(updateGroup(
                          presentation,
                          group.id,
                          (current) => updateCue(current, cue.id, (item) => ({
                            ...item,
                            color: event.target.value as PresentationCueColor,
                          })),
                        ))}
                      >
                        {cueColors.map((color) => <option value={color.value} key={color.value}>{color.label}</option>)}
                      </select>
                    </div>

                    <label className="cueActionField">
                      <span><Icon name="media" />MEDIA</span>
                      <select
                        value={actionAssetId(cue, 'media')}
                        onChange={(event) => onChange(updateGroup(
                          presentation,
                          group.id,
                          (current) => updateCue(current, cue.id, (item) => setAction(item, 'media', event.target.value)),
                        ))}
                      >
                        <option value="">No media action</option>
                        {visualAssets.map((asset) => (
                          <option value={asset.id} key={asset.id}>{asset.title}</option>
                        ))}
                      </select>
                    </label>

                    <label className="cueActionField">
                      <span><Icon name="audio" />AUDIO</span>
                      <select
                        value={actionAssetId(cue, 'audio')}
                        onChange={(event) => onChange(updateGroup(
                          presentation,
                          group.id,
                          (current) => updateCue(current, cue.id, (item) => setAction(item, 'audio', event.target.value)),
                        ))}
                      >
                        <option value="">No audio action</option>
                        {audioAssets.map((asset) => (
                          <option value={asset.id} key={asset.id}>{asset.title}</option>
                        ))}
                      </select>
                    </label>

                    <div className="cueEditorCardFooter">
                      <span>{cue.actions.length} action{cue.actions.length === 1 ? '' : 's'}</span>
                      <div>
                        <button disabled={index === 0} type="button" onClick={() => moveCue(group.id, cue.id, -1)} title="Move cue earlier">↑</button>
                        <button disabled={index === (group.cues?.length ?? 1) - 1} type="button" onClick={() => moveCue(group.id, cue.id, 1)} title="Move cue later">↓</button>
                        <button className="cueDeleteButton" type="button" onClick={() => removeCue(group.id, cue.id)}>Delete</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="cueEditorEmpty">No cues in this group yet. Add one for sound effects, media changes, or combined scene events.</div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
