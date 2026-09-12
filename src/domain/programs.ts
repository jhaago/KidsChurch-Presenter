import type { Playlist } from './types';

export interface ProgramMetadata {
  savedAt?: string;
  savedSignature?: string;
  archivedAt?: string;
}

export type ProgramPlaylist = Playlist & ProgramMetadata;
export type ProgramUpdate = Partial<Pick<Playlist, 'title' | 'serviceDate' | 'description'>> & Partial<ProgramMetadata>;
export type ProgramState = 'draft' | 'changed' | 'saved' | 'archived';

export function asProgram(playlist: Playlist): ProgramPlaylist {
  return playlist as ProgramPlaylist;
}

export function programSignature(playlist: Playlist) {
  return JSON.stringify({
    title: playlist.title.trim(),
    serviceDate: playlist.serviceDate ?? '',
    description: playlist.description?.trim() ?? '',
    items: playlist.items.map((item) => ({
      title: item.title,
      type: item.type,
      resourceId: item.resourceId ?? '',
    })),
  });
}

export function programState(playlist: Playlist): ProgramState {
  const program = asProgram(playlist);
  if (program.archivedAt) return 'archived';
  if (!program.savedAt || !program.savedSignature) return 'draft';
  return program.savedSignature === programSignature(playlist) ? 'saved' : 'changed';
}

export function savedProgramUpdate(playlist: Playlist, title = playlist.title): ProgramUpdate {
  const savedAt = new Date().toISOString();
  const snapshot: Playlist = {
    ...playlist,
    title,
  };

  return {
    title,
    serviceDate: snapshot.serviceDate,
    description: snapshot.description,
    savedAt,
    savedSignature: programSignature(snapshot),
    archivedAt: undefined,
  };
}

export function draftProgramUpdate(): ProgramUpdate {
  return {
    savedAt: undefined,
    savedSignature: undefined,
    archivedAt: undefined,
  };
}

export function savedTimeLabel(savedAt?: string) {
  if (!savedAt) return 'Not explicitly saved yet';
  const date = new Date(savedAt);
  if (Number.isNaN(date.valueOf())) return 'Saved';
  return `Saved ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}
