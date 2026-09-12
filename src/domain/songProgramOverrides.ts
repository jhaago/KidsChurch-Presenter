import type {
  PlaylistItem,
  Song,
  SongArrangementEntry,
  SongAudioSession,
  SongLyricCue,
  SongPlaybackMode,
  LyricControlMode,
} from './types';

export interface ProgramSongOverride {
  playbackMode: SongPlaybackMode;
  lyricControlMode: LyricControlMode;
  backgroundAssetId?: string;
  lyricsVideoAssetId?: string;
  audio: SongAudioSession;
  arrangement?: SongArrangementEntry[];
  lyricCues: SongLyricCue[];
}

declare module './types' {
  interface PlaylistItem {
    songOverride?: ProgramSongOverride;
  }
}

export function songOverrideFromSong(song: Song): ProgramSongOverride {
  return structuredClone({
    playbackMode: song.playbackMode,
    lyricControlMode: song.lyricControlMode,
    backgroundAssetId: song.backgroundAssetId,
    lyricsVideoAssetId: song.lyricsVideoAssetId,
    audio: song.audio,
    arrangement: song.arrangement,
    lyricCues: song.lyricCues,
  });
}

export function songForProgramItem(item: PlaylistItem | undefined, songs: Song[]): Song | undefined {
  if (!item || item.type !== 'song' || !item.resourceId) return undefined;
  const master = songs.find((song) => song.id === item.resourceId);
  if (!master) return undefined;
  const override = item.songOverride;
  if (!override) return master;

  return {
    ...master,
    title: item.title || master.title,
    playbackMode: override.playbackMode,
    lyricControlMode: override.lyricControlMode,
    backgroundAssetId: override.backgroundAssetId,
    lyricsVideoAssetId: override.lyricsVideoAssetId,
    audio: structuredClone(override.audio),
    arrangement: override.arrangement ? structuredClone(override.arrangement) : undefined,
    lyricCues: structuredClone(override.lyricCues),
  };
}

export function itemWithSongOverride(item: PlaylistItem, song: Song): PlaylistItem {
  return {
    ...item,
    title: song.title,
    songOverride: songOverrideFromSong(song),
  };
}

export function clearSongOverride(item: PlaylistItem): PlaylistItem {
  const { songOverride: _songOverride, ...rest } = item;
  return rest;
}
