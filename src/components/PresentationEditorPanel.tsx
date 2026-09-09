import type { Presentation, Slide, SlideGroup, SlideGroupType } from '../domain/types';
import { Icon } from './ui/Icon';

interface PresentationEditorPanelProps {
  presentation: Presentation;
  isSongPresentation: boolean;
  onChange: (presentation: Presentation) => void;
}

const groupTypes: Array<{ value: SlideGroupType; label: string }> = [
  { value: 'verse', label: 'Verse' },
  { value: 'chorus', label: 'Chorus' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'scripture', label: 'Scripture' },
  { value: 'generic', label: 'Generic' },
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
  onChange,
}: PresentationEditorPanelProps) {
  const addGroup = () => {
    const group: SlideGroup = {
      id: id('group'),
      name: 'New Group',
      type: isSongPresentation ? 'verse' : 'generic',
      slides: [{ id: id('slide'), text: 'NEW SLIDE' }],
    };
    onChange({ ...presentation, groups: [...presentation.groups, group] });
  };

  const removeGroup = (groupId: string) => {
    if (presentation.groups.length <= 1) return;
    onChange({
      ...presentation,
      groups: presentation.groups.filter((group) => group.id !== groupId),
    });
  };

  const addSlide = (groupId: string) => {
    const slide: Slide = { id: id('slide'), text: 'NEW SLIDE' };
    onChange(updateGroup(presentation, groupId, (group) => ({
      ...group,
      slides: [...group.slides, slide],
    })));
  };

  const removeSlide = (groupId: string, slideId: string) => {
    onChange(updateGroup(presentation, groupId, (group) => {
      if (group.slides.length <= 1) return group;
      return { ...group, slides: group.slides.filter((slide) => slide.id !== slideId) };
    }));
  };

  return (
    <section className="presentationEditor">
      <header className="presentationEditorHeader">
        <div>
          <Icon name="presentation" />
          <div>
            <strong>PRESENTATION EDITOR</strong>
            <span>Changes autosave</span>
          </div>
        </div>
        <button type="button" onClick={addGroup}>＋ Add Group</button>
      </header>

      <div className="presentationEditorMeta">
        <label>
          <span>{isSongPresentation ? 'LYRICS PRESENTATION NAME' : 'PRESENTATION NAME'}</span>
          <input
            value={presentation.title}
            onChange={(event) => onChange({ ...presentation, title: event.target.value })}
            disabled={isSongPresentation}
          />
          {isSongPresentation ? <small>Song title is edited in Song Setup above.</small> : null}
        </label>
        <label>
          <span>CATEGORY</span>
          <select
            value={presentation.category}
            onChange={(event) => onChange({ ...presentation, category: event.target.value as Presentation['category'] })}
            disabled={isSongPresentation}
          >
            <option value="slides">Slides</option>
            <option value="song">Song</option>
            <option value="scripture">Scripture</option>
            <option value="timer">Timer</option>
          </select>
        </label>
      </div>

      <div className="presentationEditorGroups">
        {presentation.groups.map((group, groupIndex) => (
          <section className="presentationEditGroup" key={group.id}>
            <header>
              <span className={`groupEditAccent group-${group.type}`} />
              <input
                aria-label="Group name"
                value={group.name}
                onChange={(event) =>
                  onChange(updateGroup(presentation, group.id, (candidate) => ({
                    ...candidate,
                    name: event.target.value,
                  })))
                }
              />
              <select
                aria-label="Group type"
                value={group.type}
                onChange={(event) =>
                  onChange(updateGroup(presentation, group.id, (candidate) => ({
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
                onClick={() => onChange({ ...presentation, groups: moveItem(presentation.groups, groupIndex, groupIndex - 1) })}
              >
                ↑
              </button>
              <button
                title="Move group down"
                type="button"
                disabled={groupIndex === presentation.groups.length - 1}
                onClick={() => onChange({ ...presentation, groups: moveItem(presentation.groups, groupIndex, groupIndex + 1) })}
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
              {group.slides.map((slide, slideIndex) => (
                <article className="presentationEditSlide" key={slide.id}>
                  <div className="editSlideOrdinal">{slideIndex + 1}</div>
                  <label className="editSlideText">
                    <span>SLIDE TEXT</span>
                    <textarea
                      value={slide.text}
                      onChange={(event) =>
                        onChange(updateGroup(presentation, group.id, (candidate) => ({
                          ...candidate,
                          slides: candidate.slides.map((item) =>
                            item.id === slide.id ? { ...item, text: event.target.value } : item,
                          ),
                        })))
                      }
                    />
                  </label>
                  <label className="editSlideNotes">
                    <span>STAGE NOTES</span>
                    <textarea
                      value={slide.notes ?? ''}
                      placeholder="Optional notes for the Stage screen"
                      onChange={(event) =>
                        onChange(updateGroup(presentation, group.id, (candidate) => ({
                          ...candidate,
                          slides: candidate.slides.map((item) =>
                            item.id === slide.id ? { ...item, notes: event.target.value || undefined } : item,
                          ),
                        })))
                      }
                    />
                  </label>
                  <div className="editSlideActions">
                    <button
                      type="button"
                      title="Move slide up"
                      disabled={slideIndex === 0}
                      onClick={() =>
                        onChange(updateGroup(presentation, group.id, (candidate) => ({
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
                        onChange(updateGroup(presentation, group.id, (candidate) => ({
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
                </article>
              ))}
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
