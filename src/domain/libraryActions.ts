import type {
  Playlist,
  PlaylistItem,
  Presentation,
  Slide,
  SlideGroup,
  Song,
  SongStem,
} from './types';

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function defaultStems(): SongStem[] {
  return [
    { id: newId('stem'), name: 'Drums', role: 'drums', enabled: true, gainDb: 0 },
    { id: newId('stem'), name: 'Bass', role: 'bass', enabled: true, gainDb: 0 },
    { id: newId('stem'), name: 'Piano', role: 'piano', enabled: true, gainDb: 0 },
    { id: newId('stem'), name: 'Acoustic', role: 'acoustic', enabled: true, gainDb: 0 },
    { id: newId('stem'), name: 'Backing Vocals', role: 'bgv', enabled: true, gainDb: 0 },
  ];
}

export function createBlankPresentation(title = 'New Presentation') {
  const presentation: Presentation = {
    id: newId('presentation'),
    title,
    category: 'slides',
    groups: [
      {
        id: newId('group'),
        name: 'Slides',
        type: 'generic',
        slides: [{ id: newId('slide'), text: 'NEW SLIDE' }],
      },
    ],
  };

  return {
    presentation,
    item: playlistItemForPresentation(presentation),
  };
}

export function createBlankSong(title = 'New Song') {
  const slide: Slide = { id: newId('slide'), text: 'NEW SONG\nVERSE 1' };
  const group: SlideGroup = {
    id: newId('group'),
    name: 'Verse 1',
    type: 'verse',
    slides: [slide],
  };
  const presentation: Presentation = {
    id: newId('presentation'),
    title,
    category: 'song',
    groups: [group],
  };
  const song: Song = {
    id: newId('song'),
    title,
    presentationId: presentation.id,
    playbackMode: 'slides-track',
    lyricControlMode: 'manual',
    audio: {
      mode: 'single-track',
      masterGainDb: 0,
      stems: defaultStems(),
    },
    lyricCues: [],
  };

  return {
    presentation,
    song,
    item: playlistItemForSong(song),
  };
}

export function duplicatePresentationResource(source: Presentation) {
  const slideIdMap = new Map<string, string>();
  const groups = source.groups.map((group) => ({
    ...group,
    id: newId('group'),
    slides: group.slides.map((slide) => {
      const slideId = newId('slide');
      slideIdMap.set(slide.id, slideId);
      return { ...slide, id: slideId };
    }),
  }));

  const presentation: Presentation = {
    ...structuredClone(source),
    id: newId('presentation'),
    title: `${source.title} Copy`,
    groups,
  };

  return {
    presentation,
    slideIdMap,
    item: playlistItemForPresentation(presentation),
  };
}

export function duplicateSongResource(source: Song, sourcePresentation: Presentation) {
  const duplicatedPresentation = duplicatePresentationResource(sourcePresentation);
  duplicatedPresentation.presentation.title = `${source.title} Copy`;
  duplicatedPresentation.presentation.category = 'song';

  const song: Song = {
    ...structuredClone(source),
    id: newId('song'),
    title: `${source.title} Copy`,
    presentationId: duplicatedPresentation.presentation.id,
    audio: {
      ...structuredClone(source.audio),
      stems: source.audio.stems.map((stem) => ({ ...stem, id: newId('stem') })),
    },
    lyricCues: source.lyricCues.map((cue) => ({
      ...cue,
      id: newId('cue'),
      slideId: duplicatedPresentation.slideIdMap.get(cue.slideId) ?? cue.slideId,
    })),
  };

  return {
    presentation: duplicatedPresentation.presentation,
    song,
    item: playlistItemForSong(song),
  };
}

export function playlistItemForPresentation(presentation: Presentation): PlaylistItem {
  return {
    id: newId('playlist-item'),
    title: presentation.title,
    type: presentation.category === 'scripture'
      ? 'bible'
      : presentation.category === 'timer'
        ? 'timer'
        : 'presentation',
    resourceId: presentation.id,
  };
}

export function playlistItemForSong(song: Song): PlaylistItem {
  return {
    id: newId('playlist-item'),
    title: song.title,
    type: 'song',
    resourceId: song.id,
  };
}


export function createBlankService(title = 'New Service'): Playlist {
  return {
    id: newId('playlist'),
    title,
    items: [],
  };
}

export function duplicateService(source: Playlist): Playlist {
  return {
    ...structuredClone(source),
    id: newId('playlist'),
    title: `${source.title} Copy`,
    serviceDate: undefined,
    items: source.items.map((item) => ({ ...item, id: newId('playlist-item') })),
  };
}
