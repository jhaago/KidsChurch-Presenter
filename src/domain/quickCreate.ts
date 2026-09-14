import type { Slide, SlideGroup, SlideGroupType, SongArrangementEntry } from './types';

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function headingType(label: string): SlideGroupType {
  const normalized = label.toLowerCase();
  if (normalized.includes('chorus')) return 'chorus';
  if (normalized.includes('bridge')) return 'bridge';
  if (normalized.includes('verse')) return 'verse';
  return 'generic';
}

function normalizedHeading(line: string) {
  const trimmed = line.trim();
  const bracketed = trimmed.match(/^\[([^\]]+)]$/);
  const label = bracketed?.[1]?.trim() ?? trimmed.replace(/:$/, '').trim();
  return /^(verse(?:\s+\d+)?|chorus(?:\s+\d+)?|pre[- ]?chorus|bridge(?:\s+\d+)?|intro|ending|outro|tag)$/i.test(label)
    ? label
    : null;
}

function slidesFromLines(lines: string[], maxLines: number): Slide[] {
  const safeMaximum = Math.max(1, Math.min(8, maxLines));
  const blocks: string[][] = [];
  let block: string[] = [];

  const flush = () => {
    if (block.length) blocks.push(block);
    block = [];
  };

  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned) {
      flush();
      continue;
    }
    block.push(cleaned);
  }
  flush();

  const slides = blocks.flatMap((paragraph) => {
    const chunks: Slide[] = [];
    for (let index = 0; index < paragraph.length; index += safeMaximum) {
      chunks.push({ id: newId('slide'), text: paragraph.slice(index, index + safeMaximum).join('\n') });
    }
    return chunks;
  });

  return slides.length ? slides : [{ id: newId('slide'), text: 'NEW SLIDE' }];
}

export function songStructureFromLyrics(rawLyrics: string, maxLines = 4): {
  groups: SlideGroup[];
  arrangement: SongArrangementEntry[];
} {
  const sections: Array<{ name: string; type: SlideGroupType; lines: string[] }> = [];
  let current = { name: 'Verse 1', type: 'verse' as SlideGroupType, lines: [] as string[] };

  for (const line of rawLyrics.replaceAll('\r\n', '\n').split('\n')) {
    const heading = normalizedHeading(line);
    if (heading) {
      if (current.lines.some((item) => item.trim())) sections.push(current);
      current = { name: heading, type: headingType(heading), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.some((item) => item.trim()) || !sections.length) sections.push(current);

  const groups: SlideGroup[] = [];
  const arrangement: SongArrangementEntry[] = [];
  const reusableByLabel = new Map<string, { group: SlideGroup; content: string }>();

  for (const section of sections) {
    const key = section.name.trim().toLowerCase();
    const content = section.lines.map((line) => line.trim()).filter(Boolean).join('\n');
    const reusable = reusableByLabel.get(key);
    let group = reusable?.group;

    if (!group || (content && reusable?.content && content !== reusable.content)) {
      group = {
        id: newId('group'),
        name: reusable ? `${section.name} ${groups.filter((item) => item.name.startsWith(section.name)).length + 1}` : section.name,
        type: section.type,
        slides: slidesFromLines(section.lines, maxLines),
      };
      groups.push(group);
      if (!reusable) reusableByLabel.set(key, { group, content });
    }

    arrangement.push({ id: newId('arrangement'), groupId: group.id });
  }

  return { groups, arrangement };
}

export function songGroupsFromLyrics(rawLyrics: string, maxLines = 4): SlideGroup[] {
  return songStructureFromLyrics(rawLyrics, maxLines).groups;
}

export function genericSlidesFromText(rawText: string, maxLines = 4): Slide[] {
  return slidesFromLines(rawText.replaceAll('\r\n', '\n').split('\n'), maxLines);
}
