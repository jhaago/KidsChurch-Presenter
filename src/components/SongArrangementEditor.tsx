import { useMemo } from 'react';
import {
  effectiveArrangement,
  occurrenceLabel,
  sourceOrderArrangement,
} from '../domain/songArrangement';
import type { Presentation, Song, SongArrangementEntry } from '../domain/types';
import { Icon } from './ui/Icon';

interface SongArrangementEditorProps {
  song: Song;
  presentation: Presentation;
  onChangeSong: (song: Song) => void;
}

function newEntryId() {
  return `arrangement-${crypto.randomUUID()}`;
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function SongArrangementEditor({
  song,
  presentation,
  onChangeSong,
}: SongArrangementEditorProps) {
  const occurrences = useMemo(() => effectiveArrangement(song, presentation), [presentation, song]);
  const isCustom = Boolean(song.arrangement?.length);

  const currentEntries = () =>
    song.arrangement?.length
      ? song.arrangement.map((entry) => ({ ...entry }))
      : sourceOrderArrangement(presentation);

  const commitStructuralChange = (entries: SongArrangementEntry[] | undefined) => {
    if (song.lyricCues.length) {
      const proceed = window.confirm(
        'Changing the Song arrangement changes the lyric sequence, so the saved Auto Lyrics timing map must be cleared. Continue?',
      );
      if (!proceed) return;
    }

    onChangeSong({
      ...song,
      arrangement: entries?.length ? entries : undefined,
      lyricCues: [],
    });
  };

  const addGroup = (groupId: string) => {
    commitStructuralChange([
      ...currentEntries(),
      { id: newEntryId(), groupId },
    ]);
  };

  const duplicateOccurrence = (index: number) => {
    const entries = currentEntries();
    const source = entries[index];
    entries.splice(index + 1, 0, { id: newEntryId(), groupId: source.groupId });
    commitStructuralChange(entries);
  };

  const removeOccurrence = (index: number) => {
    const entries = currentEntries();
    if (entries.length <= 1) return;
    entries.splice(index, 1);
    commitStructuralChange(entries);
  };

  const moveOccurrence = (index: number, direction: -1 | 1) => {
    const entries = currentEntries();
    const moved = moveItem(entries, index, index + direction);
    if (moved === entries) return;
    commitStructuralChange(moved);
  };

  const resetToSourceOrder = () => {
    if (!isCustom) return;
    commitStructuralChange(undefined);
  };

  return (
    <section className="songArrangementEditor">
      <header className="songArrangementHeader">
        <div>
          <Icon name="playlist" />
          <div>
            <strong>SONG ARRANGEMENT</strong>
            <span>
              {presentation.groups.length} source section{presentation.groups.length === 1 ? '' : 's'}
              {' · '}
              {occurrences.length} arranged section{occurrences.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <span className={isCustom ? 'isCustom' : ''}>
          {isCustom ? 'CUSTOM ARRANGEMENT' : 'SOURCE ORDER'}
        </span>
      </header>

      <div className="arrangementExplanation">
        <Icon name="presentation" />
        <span>
          Source lyrics are edited once. The arrangement can reuse Verse, Chorus and Bridge sections as many times as needed without copying the slides.
        </span>
      </div>

      <div className="arrangementColumns">
        <section className="arrangementSources">
          <header>
            <strong>SOURCE SECTIONS</strong>
            <span>Add a section to the end of the arrangement</span>
          </header>
          <div>
            {presentation.groups.map((group) => (
              <article className={`arrangementSource group-${group.type}`} key={group.id}>
                <i />
                <div>
                  <strong>{group.name}</strong>
                  <span>{group.type.toUpperCase()} · {group.slides.length} slide{group.slides.length === 1 ? '' : 's'}</span>
                  <small>{group.slides[0]?.text.replace(/\n/g, ' / ') || 'Empty section'}</small>
                </div>
                <button type="button" onClick={() => addGroup(group.id)}>＋ Add</button>
              </article>
            ))}
          </div>
        </section>

        <section className="arrangementSequence">
          <header>
            <div>
              <strong>ARRANGEMENT</strong>
              <span>Top to bottom is the live/timing order</span>
            </div>
            <button type="button" disabled={!isCustom} onClick={resetToSourceOrder}>
              Reset to Source Order
            </button>
          </header>

          <div className="arrangementSequenceRows">
            {occurrences.map((occurrence, index) => (
              <article className={`arrangementSequenceRow group-${occurrence.group.type}`} key={occurrence.entry.id}>
                <span className="arrangementOrdinal">{index + 1}</span>
                <i />
                <div className="arrangementSectionName">
                  <strong>
                    {occurrenceLabel(
                      occurrence.group,
                      occurrence.occurrenceIndex,
                      occurrence.occurrenceCount,
                    )}
                  </strong>
                  <span>
                    {occurrence.group.type.toUpperCase()} · {occurrence.group.slides.length} slide{occurrence.group.slides.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="arrangementRowActions">
                  <button
                    type="button"
                    title="Move section up"
                    disabled={index === 0}
                    onClick={() => moveOccurrence(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="Move section down"
                    disabled={index === occurrences.length - 1}
                    onClick={() => moveOccurrence(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    className="duplicate"
                    type="button"
                    title="Repeat this section immediately after itself"
                    onClick={() => duplicateOccurrence(index)}
                  >
                    Repeat
                  </button>
                  <button
                    className="danger"
                    type="button"
                    title="Remove this occurrence from the arrangement"
                    disabled={occurrences.length <= 1}
                    onClick={() => removeOccurrence(index)}
                  >
                    ×
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <footer className="arrangementFooter">
        <span>
          {isCustom
            ? 'Editing source lyrics updates every occurrence automatically.'
            : 'This Song currently follows the presentation source order. Make any arrangement change to create a custom sequence.'}
        </span>
        {song.lyricCues.length ? (
          <strong>{song.lyricCues.length} timing cue{song.lyricCues.length === 1 ? '' : 's'} saved</strong>
        ) : (
          <strong>No timing cues yet</strong>
        )}
      </footer>
    </section>
  );
}
