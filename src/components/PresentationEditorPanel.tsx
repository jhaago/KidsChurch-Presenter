import { useEffect, useRef, useState } from 'react';
import {
  PRESENTATION_THEMES,
  isBuiltInTheme,
  resolveSlideFormat,
  resolveSlideLayout,
  themeById,
  withTheme,
} from '../domain/themes';
import type {
  MediaAsset,
  Presentation,
  PresentationTheme,
  Slide,
  SlideGroup,
  SlideGroupType,
  SlideTextFormat,
} from '../domain/types';
import { Icon } from './ui/Icon';

interface PresentationEditorPanelProps {
  presentation: Presentation;
  isSongPresentation: boolean;
  availableAssets: MediaAsset[];
  customThemes: PresentationTheme[];
  onChange: (presentation: Presentation) => void;
  onCreateTheme: (theme: PresentationTheme) => void;
  onUpdateTheme: (theme: PresentationTheme) => void;
  onDeleteTheme: (themeId: string) => void;
}

const groupTypes: Array<{ value: SlideGroupType; label: string }> = [
  { value: 'verse', label: 'Verse' },
  { value: 'chorus', label: 'Chorus' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'scripture', label: 'Scripture' },
  { value: 'generic', label: 'Generic' },
];

const fontOptions = [
  'Arial, Helvetica, sans-serif',
  'Arial Black, Arial, Helvetica, sans-serif',
  'Segoe UI, Arial, Helvetica, sans-serif',
  'Verdana, Arial, Helvetica, sans-serif',
  'Trebuchet MS, Arial, Helvetica, sans-serif',
  'Georgia, Times New Roman, serif',
];

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function updateGroup(presentation: Presentation, groupId: string, updater: (group: SlideGroup) => SlideGroup) {
  return {
    ...presentation,
    groups: presentation.groups.map((group) => group.id === groupId ? updater(group) : group),
  };
}

function updateSlide(
  presentation: Presentation,
  groupId: string,
  slideId: string,
  updater: (slide: Slide) => Slide,
) {
  return updateGroup(presentation, groupId, (group) => ({
    ...group,
    slides: group.slides.map((slide) => slide.id === slideId ? updater(slide) : slide),
  }));
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function PresentationEditorPanel({
  presentation,
  isSongPresentation,
  availableAssets,
  customThemes,
  onChange,
  onCreateTheme,
  onUpdateTheme,
  onDeleteTheme,
}: PresentationEditorPanelProps) {
  const pastRef = useRef<Presentation[]>([]);
  const futureRef = useRef<Presentation[]>([]);
  const lastMergeRef = useRef<{ key: string; at: number } | null>(null);
  const [historyRevision, setHistoryRevision] = useState(0);

  useEffect(() => {
    pastRef.current = [];
    futureRef.current = [];
    lastMergeRef.current = null;
    setHistoryRevision((value) => value + 1);
  }, [presentation.id]);

  const commit = (next: Presentation, mergeKey?: string) => {
    const now = Date.now();
    const lastMerge = lastMergeRef.current;
    const merge =
      Boolean(mergeKey) &&
      lastMerge?.key === mergeKey &&
      Boolean(lastMerge && now - lastMerge.at < 750);

    if (!merge) {
      pastRef.current.push(structuredClone(presentation));
      if (pastRef.current.length > 60) pastRef.current.shift();
    }

    futureRef.current = [];
    lastMergeRef.current = mergeKey ? { key: mergeKey, at: now } : null;
    setHistoryRevision((value) => value + 1);
    onChange(next);
  };

  const undo = () => {
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current.push(structuredClone(presentation));
    lastMergeRef.current = null;
    setHistoryRevision((value) => value + 1);
    onChange(previous);
  };

  const redo = () => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(structuredClone(presentation));
    lastMergeRef.current = null;
    setHistoryRevision((value) => value + 1);
    onChange(next);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = navigator.platform.toLowerCase().includes('mac') ? event.metaKey : event.ctrlKey;
      if (!modifier) return;

      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const addGroup = () => {
    const group: SlideGroup = {
      id: id('group'),
      name: 'New Group',
      type: isSongPresentation ? 'verse' : 'generic',
      slides: [{ id: id('slide'), text: 'NEW SLIDE' }],
    };
    commit({ ...presentation, groups: [...presentation.groups, group] });
  };

  const removeGroup = (groupId: string) => {
    if (presentation.groups.length <= 1) return;
    commit({
      ...presentation,
      groups: presentation.groups.filter((group) => group.id !== groupId),
    });
  };

  const addSlide = (groupId: string) => {
    const slide: Slide = { id: id('slide'), text: 'NEW SLIDE' };
    commit(updateGroup(presentation, groupId, (group) => ({
      ...group,
      slides: [...group.slides, slide],
    })));
  };

  const removeSlide = (groupId: string, slideId: string) => {
    commit(updateGroup(presentation, groupId, (group) => {
      if (group.slides.length <= 1) return group;
      return { ...group, slides: group.slides.filter((slide) => slide.id !== slideId) };
    }));
  };

  const updatePresentationFormat = <K extends keyof SlideTextFormat>(
    key: K,
    value: SlideTextFormat[K],
  ) => {
    commit(
      {
        ...presentation,
        format: { ...presentation.format, [key]: value },
      },
      `presentation-format:${String(key)}`,
    );
  };

  const backgroundAssets = availableAssets.filter((asset) =>
    asset.kind === 'still' || asset.kind === 'motion',
  );
  const resolvedPresentationFormat = resolveSlideFormat(presentation, undefined, customThemes);
  const resolvedPresentationLayout = resolveSlideLayout(presentation, undefined, customThemes);
  const activeTheme = themeById(presentation.themeId, customThemes);
  const activeCustomTheme = customThemes.find((theme) => theme.id === presentation.themeId);
  const saveCurrentAsTheme = () => {
    const proposed = window.prompt('Name this reusable theme', `${presentation.title} Theme`);
    if (proposed === null) return;
    const name = proposed.trim();
    if (!name) return;
    if (customThemes.some((theme) => theme.name.toLowerCase() === name.toLowerCase())) {
      window.alert('A custom theme with that name already exists.');
      return;
    }

    const theme: PresentationTheme = {
      id: id('theme'),
      name,
      description: `Created from ${presentation.title}`,
      format: { ...resolvedPresentationFormat },
      layout: { ...resolvedPresentationLayout },
    };
    onCreateTheme(theme);
    commit(withTheme(presentation, theme.id));
  };

  const updateActiveCustomTheme = () => {
    if (!activeCustomTheme) return;
    if (!window.confirm(`Update “${activeCustomTheme.name}” from this Presentation? Every Presentation using this theme will inherit the new style and layout.`)) return;

    onUpdateTheme({
      ...activeCustomTheme,
      format: { ...resolvedPresentationFormat },
      layout: { ...resolvedPresentationLayout },
    });
    commit(withTheme(presentation, activeCustomTheme.id));
  };

  const renameActiveCustomTheme = () => {
    if (!activeCustomTheme) return;
    const proposed = window.prompt('Rename custom theme', activeCustomTheme.name);
    if (proposed === null) return;
    const name = proposed.trim();
    if (!name || name === activeCustomTheme.name) return;
    if (customThemes.some((theme) => theme.id !== activeCustomTheme.id && theme.name.toLowerCase() === name.toLowerCase())) {
      window.alert('A custom theme with that name already exists.');
      return;
    }
    onUpdateTheme({ ...activeCustomTheme, name });
  };

  const deleteActiveCustomTheme = () => {
    if (!activeCustomTheme) return;
    if (!window.confirm(`Delete custom theme “${activeCustomTheme.name}”? Presentations using it will keep their current appearance as local formatting.`)) return;
    onDeleteTheme(activeCustomTheme.id);
  };

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  void historyRevision;

  return (
    <section className="presentationEditor" data-presenter-editor="true">
      <header className="presentationEditorHeader">
        <div>
          <Icon name="presentation" />
          <div>
            <strong>PRESENTATION EDITOR</strong>
            <span>Changes autosave · Ctrl/Cmd+Z undo</span>
          </div>
        </div>
        <div className="editorHeaderActions">
          <button type="button" disabled={!canUndo} onClick={undo} title="Undo (Ctrl/Cmd+Z)">↶ Undo</button>
          <button type="button" disabled={!canRedo} onClick={redo} title="Redo (Ctrl/Cmd+Y or Shift+Cmd+Z)">↷ Redo</button>
          <button type="button" onClick={addGroup}>＋ Add Group</button>
        </div>
      </header>

      <div className="presentationEditorMeta">
        <label>
          <span>{isSongPresentation ? 'LYRICS PRESENTATION NAME' : 'PRESENTATION NAME'}</span>
          <input
            value={presentation.title}
            onChange={(event) => commit(
              { ...presentation, title: event.target.value },
              'presentation-title',
            )}
            disabled={isSongPresentation}
          />
          {isSongPresentation ? <small>Song title is edited in Song Setup above.</small> : null}
        </label>
        <label>
          <span>CATEGORY</span>
          <select
            value={presentation.category}
            onChange={(event) => commit({
              ...presentation,
              category: event.target.value as Presentation['category'],
            })}
            disabled={isSongPresentation}
          >
            <option value="slides">Slides</option>
            <option value="song">Song</option>
            <option value="scripture">Scripture</option>
            <option value="timer">Timer</option>
          </select>
        </label>
      </div>

      <section className="presentationFormatPanel">
        <header>
          <div>
            <Icon name="grid" />
            <div>
              <strong>PRESENTATION FORMAT</strong>
              <span>Theme + presentation-wide text and background</span>
            </div>
          </div>
          <small>{activeTheme.name}</small>
        </header>

        <div className="presentationThemeGrid">
          <label>
            <span>THEME</span>
            <select
              value={presentation.themeId ?? 'default'}
              onChange={(event) => commit(withTheme(presentation, event.target.value))}
            >
              <optgroup label="Built-in Themes">
                {PRESENTATION_THEMES.map((theme) => (
                  <option value={theme.id} key={theme.id}>{theme.name}</option>
                ))}
              </optgroup>
              {customThemes.length ? (
                <optgroup label="My Themes">
                  {customThemes.map((theme) => (
                    <option value={theme.id} key={theme.id}>{theme.name}</option>
                  ))}
                </optgroup>
              ) : null}
            </select>
            <small>
              {activeTheme.description ?? (activeCustomTheme ? 'Custom reusable theme' : '')}
            </small>
          </label>
          <label>
            <span>BACKGROUND</span>
            <select
              value={presentation.backgroundAssetId ?? ''}
              disabled={isSongPresentation}
              onChange={(event) => commit({
                ...presentation,
                backgroundAssetId: event.target.value || undefined,
              })}
            >
              <option value="">None / current output background</option>
              {backgroundAssets.map((asset) => (
                <option value={asset.id} key={asset.id}>{asset.title}</option>
              ))}
            </select>
            <small>
              {isSongPresentation
                ? 'Default Song background is controlled in Song Setup; individual lyric slides can still override it below.'
                : 'Still and motion resources can be assigned to the whole presentation.'}
            </small>
          </label>
        </div>

        <div className="customThemeActions">
          <div>
            <strong>MY THEMES</strong>
            <span>{customThemes.length ? `${customThemes.length} saved reusable theme${customThemes.length === 1 ? '' : 's'}` : 'No custom themes saved yet'}</span>
          </div>
          <div>
            <button type="button" onClick={saveCurrentAsTheme}>＋ Save Current as Theme</button>
            <button type="button" disabled={!activeCustomTheme} onClick={updateActiveCustomTheme}>Update Theme</button>
            <button type="button" disabled={!activeCustomTheme} onClick={renameActiveCustomTheme}>Rename</button>
            <button className="danger" type="button" disabled={!activeCustomTheme} onClick={deleteActiveCustomTheme}>Delete</button>
          </div>
          <small>
            {isBuiltInTheme(presentation.themeId ?? 'default')
              ? 'Built-in themes are read-only. Save the current appearance as a new theme to customise and reuse it.'
              : 'This Presentation is linked to a custom theme. Updating that theme changes every linked Presentation; slide-specific overrides remain local.'}
          </small>
        </div>

        <div className="formatControls">
          <label className="formatFont">
            <span>FONT</span>
            <select
              value={resolvedPresentationFormat.fontFamily}
              onChange={(event) => updatePresentationFormat('fontFamily', event.target.value)}
            >
              {fontOptions.map((font) => (
                <option value={font} key={font}>{font.split(',')[0]}</option>
              ))}
            </select>
          </label>
          <label>
            <span>SIZE</span>
            <input
              type="number"
              min={2}
              max={9}
              step={0.1}
              value={resolvedPresentationFormat.fontSizeVw}
              onChange={(event) => updatePresentationFormat('fontSizeVw', Number(event.target.value))}
            />
          </label>
          <label>
            <span>WEIGHT</span>
            <select
              value={resolvedPresentationFormat.fontWeight}
              onChange={(event) => updatePresentationFormat('fontWeight', Number(event.target.value))}
            >
              <option value={400}>Regular</option>
              <option value={600}>Semi Bold</option>
              <option value={700}>Bold</option>
              <option value={800}>Extra Bold</option>
            </select>
          </label>
          <label>
            <span>ALIGN</span>
            <select
              value={resolvedPresentationFormat.textAlign}
              onChange={(event) => updatePresentationFormat('textAlign', event.target.value as SlideTextFormat['textAlign'])}
            >
              <option value="left">Left</option>
              <option value="center">Centre</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label>
            <span>VERTICAL</span>
            <select
              value={resolvedPresentationFormat.verticalAlign}
              onChange={(event) => updatePresentationFormat('verticalAlign', event.target.value as SlideTextFormat['verticalAlign'])}
            >
              <option value="top">Top</option>
              <option value="middle">Middle</option>
              <option value="bottom">Bottom</option>
            </select>
          </label>
          <label>
            <span>MARGIN %</span>
            <input
              type="number"
              min={2}
              max={25}
              step={1}
              value={resolvedPresentationFormat.marginPercent}
              onChange={(event) => updatePresentationFormat('marginPercent', Number(event.target.value))}
            />
          </label>
          <label>
            <span>LINE HEIGHT</span>
            <input
              type="number"
              min={0.9}
              max={1.8}
              step={0.02}
              value={resolvedPresentationFormat.lineHeight}
              onChange={(event) => updatePresentationFormat('lineHeight', Number(event.target.value))}
            />
          </label>
          <label>
            <span>TEXT COLOUR</span>
            <input
              className="formatColorInput"
              type="color"
              value={resolvedPresentationFormat.textColor}
              onChange={(event) => updatePresentationFormat('textColor', event.target.value)}
            />
          </label>
          <label className="formatToggle">
            <span>SHADOW</span>
            <input
              type="checkbox"
              checked={resolvedPresentationFormat.shadow}
              onChange={(event) => updatePresentationFormat('shadow', event.target.checked)}
            />
          </label>
          <label className="formatToggle">
            <span>UPPERCASE</span>
            <input
              type="checkbox"
              checked={resolvedPresentationFormat.uppercase}
              onChange={(event) => updatePresentationFormat('uppercase', event.target.checked)}
            />
          </label>
          {presentation.format ? (
            <button
              className="resetFormatButton"
              type="button"
              onClick={() => commit({ ...presentation, format: undefined })}
            >
              Reset Overrides
            </button>
          ) : null}
        </div>
      </section>

      <div className="presentationEditorGroups">
        {presentation.groups.map((group, groupIndex) => (
          <section className="presentationEditGroup" key={group.id}>
            <header>
              <span className={`groupEditAccent group-${group.type}`} />
              <input
                aria-label="Group name"
                value={group.name}
                onChange={(event) =>
                  commit(updateGroup(presentation, group.id, (candidate) => ({
                    ...candidate,
                    name: event.target.value,
                  })), `group-name:${group.id}`)
                }
              />
              <select
                aria-label="Group type"
                value={group.type}
                onChange={(event) =>
                  commit(updateGroup(presentation, group.id, (candidate) => ({
                    ...candidate,
                    type: event.target.value as SlideGroupType,
                  })))
                }
              >
                {groupTypes.map((type) => (
                  <option value={type.value} key={type.value}>{type.label}</option>
                ))}
              </select>
              <button
                title="Move group up"
                type="button"
                disabled={groupIndex === 0}
                onClick={() => commit({ ...presentation, groups: moveItem(presentation.groups, groupIndex, groupIndex - 1) })}
              >
                ↑
              </button>
              <button
                title="Move group down"
                type="button"
                disabled={groupIndex === presentation.groups.length - 1}
                onClick={() => commit({ ...presentation, groups: moveItem(presentation.groups, groupIndex, groupIndex + 1) })}
              >
                ↓
              </button>
              <button
                className="danger"
                title="Delete group"
                type="button"
                disabled={presentation.groups.length <= 1}
                onClick={() => removeGroup(group.id)}
              >
                ×
              </button>
            </header>

            <div className="presentationEditSlides">
              {group.slides.map((slide, slideIndex) => {
                const resolvedSlideFormat = resolveSlideFormat(presentation, slide, customThemes);
                const hasCustomFormat = Boolean(slide.format);
                return (
                  <article className="presentationEditSlide" key={slide.id}>
                    <div className="editSlideOrdinal">{slideIndex + 1}</div>
                    <label className="editSlideText">
                      <span>SLIDE TEXT</span>
                      <textarea
                        value={slide.text}
                        onChange={(event) =>
                          commit(updateSlide(presentation, group.id, slide.id, (item) => ({
                            ...item,
                            text: event.target.value,
                          })), `slide-text:${slide.id}`)
                        }
                      />
                    </label>
                    <label className="editSlideNotes">
                      <span>STAGE NOTES</span>
                      <textarea
                        value={slide.notes ?? ''}
                        placeholder="Optional notes for the Stage screen"
                        onChange={(event) =>
                          commit(updateSlide(presentation, group.id, slide.id, (item) => ({
                            ...item,
                            notes: event.target.value || undefined,
                          })), `slide-notes:${slide.id}`)
                        }
                      />
                    </label>
                    <div className="editSlideActions">
                      <button
                        type="button"
                        title="Move slide up"
                        disabled={slideIndex === 0}
                        onClick={() =>
                          commit(updateGroup(presentation, group.id, (candidate) => ({
                            ...candidate,
                            slides: moveItem(candidate.slides, slideIndex, slideIndex - 1),
                          })))
                        }
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        title="Move slide down"
                        disabled={slideIndex === group.slides.length - 1}
                        onClick={() =>
                          commit(updateGroup(presentation, group.id, (candidate) => ({
                            ...candidate,
                            slides: moveItem(candidate.slides, slideIndex, slideIndex + 1),
                          })))
                        }
                      >
                        ↓
                      </button>
                      <button
                        className="danger"
                        type="button"
                        title="Delete slide"
                        disabled={group.slides.length <= 1}
                        onClick={() => removeSlide(group.id, slide.id)}
                      >
                        Delete
                      </button>
                    </div>

                    <details className="editSlideFormat">
                      <summary>Slide Format / Background {hasCustomFormat || slide.backgroundAssetId !== undefined ? '• OVERRIDE' : ''}</summary>
                      <div className="slideFormatBody">
                        <label className="slideFormatToggle">
                          <span>CUSTOM TEXT FORMAT</span>
                          <input
                            type="checkbox"
                            checked={hasCustomFormat}
                            onChange={(event) => commit(
                              updateSlide(presentation, group.id, slide.id, (item) => ({
                                ...item,
                                format: event.target.checked
                                  ? { ...resolvedSlideFormat }
                                  : undefined,
                              })),
                            )}
                          />
                        </label>

                        <label>
                          <span>BACKGROUND</span>
                          <select
                            value={slide.backgroundAssetId === null ? '__none__' : slide.backgroundAssetId ?? ''}
                            onChange={(event) => commit(
                              updateSlide(presentation, group.id, slide.id, (item) => ({
                                ...item,
                                backgroundAssetId:
                                  event.target.value === '__none__'
                                    ? null
                                    : event.target.value || undefined,
                              })),
                            )}
                          >
                            <option value="">Use Presentation Background</option>
                            <option value="__none__">No Background</option>
                            {backgroundAssets.map((asset) => (
                              <option value={asset.id} key={asset.id}>{asset.title}</option>
                            ))}
                          </select>
                        </label>

                        {hasCustomFormat ? (
                          <div className="slideFormatControls">
                            <label>
                              <span>SIZE</span>
                              <input
                                type="number"
                                min={2}
                                max={9}
                                step={0.1}
                                value={resolvedSlideFormat.fontSizeVw}
                                onChange={(event) => commit(
                                  updateSlide(presentation, group.id, slide.id, (item) => ({
                                    ...item,
                                    format: { ...item.format, fontSizeVw: Number(event.target.value) },
                                  })),
                                  `slide-format-size:${slide.id}`,
                                )}
                              />
                            </label>
                            <label>
                              <span>ALIGN</span>
                              <select
                                value={resolvedSlideFormat.textAlign}
                                onChange={(event) => commit(
                                  updateSlide(presentation, group.id, slide.id, (item) => ({
                                    ...item,
                                    format: { ...item.format, textAlign: event.target.value as SlideTextFormat['textAlign'] },
                                  })),
                                )}
                              >
                                <option value="left">Left</option>
                                <option value="center">Centre</option>
                                <option value="right">Right</option>
                              </select>
                            </label>
                            <label>
                              <span>VERTICAL</span>
                              <select
                                value={resolvedSlideFormat.verticalAlign}
                                onChange={(event) => commit(
                                  updateSlide(presentation, group.id, slide.id, (item) => ({
                                    ...item,
                                    format: { ...item.format, verticalAlign: event.target.value as SlideTextFormat['verticalAlign'] },
                                  })),
                                )}
                              >
                                <option value="top">Top</option>
                                <option value="middle">Middle</option>
                                <option value="bottom">Bottom</option>
                              </select>
                            </label>
                            <label>
                              <span>COLOUR</span>
                              <input
                                className="formatColorInput"
                                type="color"
                                value={resolvedSlideFormat.textColor}
                                onChange={(event) => commit(
                                  updateSlide(presentation, group.id, slide.id, (item) => ({
                                    ...item,
                                    format: { ...item.format, textColor: event.target.value },
                                  })),
                                  `slide-format-color:${slide.id}`,
                                )}
                              />
                            </label>
                            <label className="slideFormatToggle">
                              <span>SHADOW</span>
                              <input
                                type="checkbox"
                                checked={resolvedSlideFormat.shadow}
                                onChange={(event) => commit(
                                  updateSlide(presentation, group.id, slide.id, (item) => ({
                                    ...item,
                                    format: { ...item.format, shadow: event.target.checked },
                                  })),
                                )}
                              />
                            </label>
                            <label className="slideFormatToggle">
                              <span>UPPERCASE</span>
                              <input
                                type="checkbox"
                                checked={resolvedSlideFormat.uppercase}
                                onChange={(event) => commit(
                                  updateSlide(presentation, group.id, slide.id, (item) => ({
                                    ...item,
                                    format: { ...item.format, uppercase: event.target.checked },
                                  })),
                                )}
                              />
                            </label>
                          </div>
                        ) : null}
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>

            <button className="addSlideButton" type="button" onClick={() => addSlide(group.id)}>
              ＋ Add Slide to {group.name || 'Group'}
            </button>
          </section>
        ))}
      </div>
    </section>
  );
}
