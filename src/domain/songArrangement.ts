import type {
  Presentation,
  Slide,
  SlideGroup,
  Song,
  SongArrangementEntry,
  SongLyricCue,
} from './types';

export interface ArrangedGroupOccurrence {
  entry: SongArrangementEntry;
  group: SlideGroup;
  position: number;
  occurrenceIndex: number;
  occurrenceCount: number;
  implicit: boolean;
}

export interface ArrangedSlideOccurrence {
  arrangementEntryId: string;
  group: SlideGroup;
  slide: Slide;
  sequence: number;
  occurrenceIndex: number;
  occurrenceCount: number;
}

export function defaultArrangementEntryId(groupId: string) {
  return `source:${groupId}`;
}

export function sourceOrderArrangement(presentation: Presentation): SongArrangementEntry[] {
  return presentation.groups.map((group) => ({
    id: defaultArrangementEntryId(group.id),
    groupId: group.id,
  }));
}

export function effectiveArrangement(song: Song, presentation: Presentation): ArrangedGroupOccurrence[] {
  const groupsById = new Map(presentation.groups.map((group) => [group.id, group]));
  const explicit = Boolean(song.arrangement?.length);
  const entries = explicit
    ? song.arrangement!.filter((entry) => groupsById.has(entry.groupId))
    : sourceOrderArrangement(presentation);

  const usableEntries = entries.length ? entries : sourceOrderArrangement(presentation);
  const totals = usableEntries.reduce<Map<string, number>>((counts, entry) => {
    counts.set(entry.groupId, (counts.get(entry.groupId) ?? 0) + 1);
    return counts;
  }, new Map());
  const seen = new Map<string, number>();

  return usableEntries.flatMap((entry, position) => {
    const group = groupsById.get(entry.groupId);
    if (!group) return [];
    const occurrenceIndex = (seen.get(entry.groupId) ?? 0) + 1;
    seen.set(entry.groupId, occurrenceIndex);

    return [{
      entry,
      group,
      position,
      occurrenceIndex,
      occurrenceCount: totals.get(entry.groupId) ?? 1,
      implicit: !explicit,
    }];
  });
}

export function arrangedSlides(song: Song, presentation: Presentation): ArrangedSlideOccurrence[] {
  let sequence = 0;
  return effectiveArrangement(song, presentation).flatMap((occurrence) =>
    occurrence.group.slides.map((slide) => ({
      arrangementEntryId: occurrence.entry.id,
      group: occurrence.group,
      slide,
      sequence: ++sequence,
      occurrenceIndex: occurrence.occurrenceIndex,
      occurrenceCount: occurrence.occurrenceCount,
    })),
  );
}

export function occurrenceLabel(
  group: SlideGroup,
  occurrenceIndex: number,
  occurrenceCount: number,
) {
  return occurrenceCount > 1
    ? `${group.name} · ${occurrenceIndex}/${occurrenceCount}`
    : group.name;
}

export function findCueForOccurrence(
  lyricCues: SongLyricCue[],
  occurrence: ArrangedSlideOccurrence,
  sequence: ArrangedSlideOccurrence[],
) {
  const exact = lyricCues.find((cue) =>
    cue.slideId === occurrence.slide.id &&
    cue.arrangementEntryId === occurrence.arrangementEntryId,
  );
  if (exact) return exact;

  const legacy = lyricCues.find((cue) =>
    cue.slideId === occurrence.slide.id &&
    !cue.arrangementEntryId,
  );
  if (!legacy) return undefined;

  const firstOccurrence = sequence.find((candidate) => candidate.slide.id === occurrence.slide.id);
  return firstOccurrence?.arrangementEntryId === occurrence.arrangementEntryId ? legacy : undefined;
}

export function sanitizeSongForPresentation(song: Song, presentation: Presentation): Song {
  const validGroupIds = new Set(presentation.groups.map((group) => group.id));
  const validSlideIds = new Set(
    presentation.groups.flatMap((group) => group.slides.map((slide) => slide.id)),
  );

  let arrangement = song.arrangement?.filter((entry) => validGroupIds.has(entry.groupId));
  if (song.arrangement && !arrangement?.length) arrangement = undefined;

  const arrangementIds = new Set(
    arrangement?.map((entry) => entry.id) ??
    presentation.groups.map((group) => defaultArrangementEntryId(group.id)),
  );

  return {
    ...song,
    arrangement,
    lyricCues: song.lyricCues.filter((cue) =>
      validSlideIds.has(cue.slideId) &&
      (!cue.arrangementEntryId || arrangementIds.has(cue.arrangementEntryId)),
    ),
  };
}
