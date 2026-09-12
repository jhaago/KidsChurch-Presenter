const fs = require('node:fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content, 'utf8');
}

function replaceOne(path, before, after) {
  const source = read(path);
  if (!source.includes(before)) {
    throw new Error(`Expected text not found in ${path}: ${before.slice(0, 120)}`);
  }
  write(path, source.replace(before, after));
}

function replaceRange(path, start, end, replacement) {
  const source = read(path);
  const startIndex = source.indexOf(start);
  if (startIndex < 0) throw new Error(`Start marker not found in ${path}: ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  if (endIndex < 0) throw new Error(`End marker not found in ${path}: ${end}`);
  write(path, source.slice(0, startIndex) + replacement + source.slice(endIndex));
}

const operator = 'src/components/OperatorApp.tsx';
const library = 'src/components/LibraryPanel.tsx';
const actions = 'src/domain/libraryActions.ts';

replaceOne(
  operator,
  "import { resolveBackgroundAssetId, resolveSlideFormat, resolveSlideLayout } from '../domain/themes';\n",
  "import { resolveBackgroundAssetId, resolveSlideFormat, resolveSlideLayout } from '../domain/themes';\nimport {\n  clearSongOverride,\n  itemWithSongOverride,\n  songForProgramItem,\n} from '../domain/songProgramOverrides';\n",
);

replaceOne(
  operator,
  "  const [selectedArrangementEntryId, setSelectedArrangementEntryId] = useState<string | null>(null);\n",
  "  const [selectedArrangementEntryId, setSelectedArrangementEntryId] = useState<string | null>(null);\n  const [activeSongItemId, setActiveSongItemId] = useState<string | null>(null);\n",
);

replaceOne(
  operator,
  "  const selectedSong = selectedItem?.type === 'song'\n    ? songs.find((song) => song.id === selectedItem.resourceId)\n    : undefined;\n",
  "  const selectedSong = useMemo(\n    () => songForProgramItem(selectedItem, songs),\n    [selectedItem, songs],\n  );\n",
);

replaceOne(
  operator,
  "  const activeSong = useMemo(\n    () => songs.find((song) => song.id === songTransport.state.songId),\n    [songs, songTransport.state.songId],\n  );\n",
  "  const activeSong = useMemo(() => {\n    const programItem = activeSongItemId\n      ? playlist.items.find((item) => item.id === activeSongItemId)\n      : undefined;\n    const programSong = songForProgramItem(programItem, songs);\n    if (programSong?.id === songTransport.state.songId) return programSong;\n    return songs.find((song) => song.id === songTransport.state.songId);\n  }, [activeSongItemId, playlist.items, songs, songTransport.state.songId]);\n",
);

replaceOne(
  operator,
  "    const song = songs.find((candidate) => candidate.presentationId === presentation.id);\n",
  "    const song = selectedSong?.presentationId === presentation.id\n      ? selectedSong\n      : activeSong?.presentationId === presentation.id\n        ? activeSong\n        : songs.find((candidate) => candidate.presentationId === presentation.id);\n",
);

replaceOne(
  operator,
  "  }, [allMediaAssets, customThemes, songs]);\n\n  const triggerMedia",
  "  }, [activeSong, allMediaAssets, customThemes, selectedSong, songs]);\n\n  const triggerMedia",
);

replaceRange(
  operator,
  "  const playSong = useCallback(async (song: Song) => {",
  "\n\n  const pauseSong",
  `  const playSong = useCallback(async (song: Song) => {
    timingTransport.stop();
    const programItemId = selectedItem?.type === 'song' && selectedItem.resourceId === song.id
      ? selectedItem.id
      : null;
    const started = await songTransport.play(song);
    if (!started) return;
    setActiveSongItemId(programItemId);

    const background = song.backgroundAssetId
      ? allMediaAssets.find((asset) => asset.id === song.backgroundAssetId)
      : undefined;

    setOutput((current) => ({
      ...current,
      audio: { id: song.id, title: song.title },
      media: background && song.playbackMode !== 'lyrics-video'
        ? liveMediaFromAsset(background, 'background')
        : current.media,
      black: false,
      logo: false,
    }));
  }, [allMediaAssets, selectedItem, songTransport.play, timingTransport.stop]);`,
);

replaceOne(
  operator,
  "  const stopSong = useCallback(() => {\n    songTransport.stop();\n    setOutput((current) => ({ ...current, audio: null }));\n  }, [songTransport.stop]);\n",
  "  const stopSong = useCallback(() => {\n    songTransport.stop();\n    setActiveSongItemId(null);\n    setOutput((current) => ({ ...current, audio: null }));\n  }, [songTransport.stop]);\n",
);

replaceOne(
  operator,
  "    const linkedSongBefore = songs.find((song) => song.presentationId === updatedPresentation.id);\n    const structureSignature = (presentation?: Presentation) =>\n",
  "    const linkedSongBefore = songs.find((song) => song.presentationId === updatedPresentation.id);\n    const linkedOverrideHasCues = playlists.some((service) => service.items.some((item) => {\n      if (item.type !== 'song' || !item.songOverride) return false;\n      const effectiveSong = songForProgramItem(item, songs);\n      return effectiveSong?.presentationId === updatedPresentation.id && effectiveSong.lyricCues.length > 0;\n    }));\n    const structureSignature = (presentation?: Presentation) =>\n",
);

replaceOne(
  operator,
  "      linkedSongBefore?.lyricCues.length &&\n",
  "      (linkedSongBefore?.lyricCues.length || linkedOverrideHasCues) &&\n",
);

replaceRange(
  operator,
  "    setPlaylists((current) => current.map((service) => ({\n      ...service,\n      items: service.items.map((item) =>\n        item.type !== 'song' && item.resourceId === updatedPresentation.id\n          ? { ...item, title: updatedPresentation.title }\n          : item,\n      ),\n    })));",
  "\n\n    const linkedSong = linkedSongBefore;",
  `    setPlaylists((current) => current.map((service) => ({
      ...service,
      items: service.items.map((item) => {
        if (item.type === 'song' && item.songOverride) {
          const effectiveSong = songForProgramItem(item, songs);
          if (effectiveSong?.presentationId === updatedPresentation.id) {
            const sanitized = sanitizeSongForPresentation(effectiveSong, updatedPresentation);
            return itemWithSongOverride(
              item,
              lyricStructureChanged ? { ...sanitized, lyricCues: [] } : sanitized,
            );
          }
        }
        return item.type !== 'song' && item.resourceId === updatedPresentation.id
          ? { ...item, title: updatedPresentation.title }
          : item;
      }),
    })));

    const linkedSong = activeSong?.presentationId === updatedPresentation.id
      ? activeSong
      : selectedSong?.presentationId === updatedPresentation.id
        ? selectedSong
        : linkedSongBefore;`,
);

replaceOne(
  operator,
  "      const linkedLiveSong = songs.find((song) => song.presentationId === updatedPresentation.id);\n",
  "      const linkedLiveSong = activeSong?.presentationId === updatedPresentation.id\n        ? activeSong\n        : selectedSong?.presentationId === updatedPresentation.id\n          ? selectedSong\n          : songs.find((song) => song.presentationId === updatedPresentation.id);\n",
);

replaceOne(
  operator,
  "  }, [allMediaAssets, customThemes, output.slide, presentations, songs]);\n\n  const createCustomTheme",
  "  }, [activeSong, allMediaAssets, customThemes, output.slide, playlists, presentations, selectedSong, songs]);\n\n  const createCustomTheme",
);

replaceRange(
  operator,
  "  const updateSong = useCallback((updatedSong: Song) => {",
  "\n\n  const appendAndSelectServiceItem",
  `  const updateSong = useCallback((updatedSong: Song) => {
    const programItem = selectedItem?.type === 'song' && selectedItem.resourceId === updatedSong.id
      ? selectedItem
      : undefined;
    const master = songs.find((song) => song.id === updatedSong.id);
    const previous = programItem ? songForProgramItem(programItem, songs) : master;
    const editingLiveSong = songTransport.state.songId === updatedSong.id &&
      (!activeSongItemId || activeSongItemId === programItem?.id);

    if (editingLiveSong && previous) {
      for (const stem of updatedSong.audio.stems) {
        const oldStem = previous.audio.stems.find((candidate) => candidate.id === stem.id);
        if (oldStem && oldStem.enabled !== stem.enabled) {
          songTransport.setStemEnabled(stem.id, stem.enabled);
        }
      }
    }

    if (programItem) {
      setPlaylist((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === programItem.id ? itemWithSongOverride(item, updatedSong) : item,
        ),
      }));
    } else {
      setSongs((current) => current.map((song) => song.id === updatedSong.id ? updatedSong : song));

      if (updatedSong.presentationId && master?.title !== updatedSong.title) {
        setPresentations((current) => current.map((presentation) =>
          presentation.id === updatedSong.presentationId
            ? { ...presentation, title: updatedSong.title }
            : presentation,
        ));
      }

      setPlaylists((current) => current.map((service) => ({
        ...service,
        items: service.items.map((item) =>
          item.type === 'song' && item.resourceId === updatedSong.id && !item.songOverride
            ? { ...item, title: updatedSong.title }
            : item,
        ),
      })));
    }

    if (editingLiveSong) {
      setOutput((current) => ({
        ...current,
        audio: current.audio?.id === updatedSong.id ? { ...current.audio, title: updatedSong.title } : current.audio,
      }));
    }

    if (selectedSong?.id === updatedSong.id && updatedSong.presentationId) {
      const presentation = presentations.find((candidate) => candidate.id === updatedSong.presentationId);
      if (presentation) {
        const sequence = arrangedSlides(updatedSong, presentation);
        const selectionStillExists = sequence.some((item) =>
          item.slide.id === selectedSlideId &&
          item.arrangementEntryId === selectedArrangementEntryId,
        );
        if (!selectionStillExists) {
          setSelectedSlideId(sequence[0]?.slide.id ?? null);
          setSelectedArrangementEntryId(sequence[0]?.arrangementEntryId ?? null);
        }
      }
    }
  }, [
    activeSongItemId,
    presentations,
    selectedArrangementEntryId,
    selectedItem,
    selectedSlideId,
    selectedSong?.id,
    setPlaylist,
    songs,
    songTransport.setStemEnabled,
    songTransport.state.songId,
  ]);`,
);

replaceOne(
  operator,
  "  const updateActiveService = useCallback((updates: Partial<Pick<Playlist, 'title' | 'serviceDate' | 'description'>>) => {\n    setPlaylist((current) => ({ ...current, ...updates }));\n  }, [setPlaylist]);\n\n  const clearAll",
  `  const updateActiveService = useCallback((updates: Partial<Pick<Playlist, 'title' | 'serviceDate' | 'description'>>) => {
    setPlaylist((current) => ({ ...current, ...updates }));
  }, [setPlaylist]);

  const resetSongOverride = useCallback((itemId: string) => {
    const item = playlist.items.find((candidate) => candidate.id === itemId);
    if (!item || item.type !== 'song' || !item.songOverride) return;
    if (activeSongItemId === itemId && ['playing', 'paused'].includes(songTransport.state.status)) {
      window.alert('Stop this Song before resetting its Program-specific setup.');
      return;
    }
    const master = songs.find((song) => song.id === item.resourceId);
    if (!master) return;
    if (!window.confirm(`Use the Library setup for “${master.title}” in this Program? The Program-specific arrangement, audio and timing for this item will be removed.`)) return;
    setPlaylist((current) => ({
      ...current,
      items: current.items.map((candidate) =>
        candidate.id === itemId ? { ...clearSongOverride(candidate), title: master.title } : candidate,
      ),
    }));
  }, [activeSongItemId, playlist.items, setPlaylist, songTransport.state.status, songs]);

  const clearAll`,
);

replaceOne(
  operator,
  "  const clearAll = useCallback(() => {\n    songTransport.stop();\n    setOutput({ ...EMPTY_OUTPUT_STATE });\n  }, [songTransport.stop]);\n",
  "  const clearAll = useCallback(() => {\n    songTransport.stop();\n    setActiveSongItemId(null);\n    setOutput({ ...EMPTY_OUTPUT_STATE });\n  }, [songTransport.stop]);\n",
);

replaceOne(
  operator,
  "  const clearToLogo = useCallback(() => {\n    songTransport.stop();\n    setOutput({ ...EMPTY_OUTPUT_STATE, logo: true });\n  }, [songTransport.stop]);\n",
  "  const clearToLogo = useCallback(() => {\n    songTransport.stop();\n    setActiveSongItemId(null);\n    setOutput({ ...EMPTY_OUTPUT_STATE, logo: true });\n  }, [songTransport.stop]);\n",
);

replaceOne(
  operator,
  "    const song = songs.find((candidate) => candidate.id === transport.songId);\n",
  "    const song = activeSong?.id === transport.songId\n      ? activeSong\n      : songs.find((candidate) => candidate.id === transport.songId);\n",
);

replaceOne(
  operator,
  "    songTransport.state.status,\n    presentations,\n    songs,\n    triggerSlide,\n",
  "    songTransport.state.status,\n    activeSong,\n    presentations,\n    songs,\n    triggerSlide,\n",
);

replaceOne(
  operator,
  "  useEffect(() => {\n    if (songTransport.state.status !== 'ended' && songTransport.state.status !== 'error') return;\n    const songId = songTransport.state.songId;\n    setOutput((current) =>\n      current.audio?.id === songId ? { ...current, audio: null } : current,\n    );\n  }, [songTransport.state.songId, songTransport.state.status]);\n",
  "  useEffect(() => {\n    if (songTransport.state.status !== 'ended' && songTransport.state.status !== 'error') return;\n    const songId = songTransport.state.songId;\n    setActiveSongItemId(null);\n    setOutput((current) =>\n      current.audio?.id === songId ? { ...current, audio: null } : current,\n    );\n  }, [songTransport.state.songId, songTransport.state.status]);\n",
);

replaceOne(
  operator,
  "          onMoveServiceItem={moveServiceItem}\n          onRemoveServiceItem={removeServiceItem}\n",
  "          onMoveServiceItem={moveServiceItem}\n          onRemoveServiceItem={removeServiceItem}\n          onResetSongOverride={resetSongOverride}\n",
);

replaceOne(
  library,
  "import type { ProgramUpdate } from '../domain/programs';\n",
  "import type { ProgramUpdate } from '../domain/programs';\nimport { songForProgramItem } from '../domain/songProgramOverrides';\n",
);

replaceOne(
  library,
  "  onRemoveServiceItem: (itemId: string) => void;\n  onMoveServiceItem: (itemId: string, direction: -1 | 1) => void;\n",
  "  onRemoveServiceItem: (itemId: string) => void;\n  onResetSongOverride: (itemId: string) => void;\n  onMoveServiceItem: (itemId: string, direction: -1 | 1) => void;\n",
);

replaceOne(
  library,
  "    const song = songs.find((candidate) => candidate.id === item.resourceId);\n    return output.slide?.presentationId === song?.presentationId || output.media?.id === song?.lyricsVideoAssetId;\n",
  "    const song = songForProgramItem(item, songs);\n    return output.slide?.presentationId === song?.presentationId || output.media?.id === song?.lyricsVideoAssetId;\n",
);

replaceOne(
  library,
  "    const song = songs.find((candidate) => candidate.id === item.resourceId);\n    const presentation = song?.presentationId\n",
  "    const song = songForProgramItem(item, songs);\n    const presentation = song?.presentationId\n",
);

replaceOne(
  library,
  "  onRemoveServiceItem,\n  onMoveServiceItem,\n",
  "  onRemoveServiceItem,\n  onResetSongOverride,\n  onMoveServiceItem,\n",
);

replaceOne(
  library,
  "                    <small>{item.type.replace('-', ' ').toUpperCase()} · {slides.length ? `${slides.length} slides` : 'no slide deck'}</small>\n",
  "                    <small>{item.type.replace('-', ' ').toUpperCase()} · {slides.length ? `${slides.length} slides` : 'no slide deck'}{item.type === 'song' && item.songOverride ? ' · PROGRAM OVERRIDE' : ''}</small>\n",
);

replaceOne(
  library,
  "                <div className=\"serviceCanvasItemActions\">\n                  <button type=\"button\" onClick={() => openEditor(item.id)}>\n",
  "                <div className=\"serviceCanvasItemActions\">\n                  {item.type === 'song' && item.songOverride ? (\n                    <button type=\"button\" title=\"Discard this Program-specific Song setup\" onClick={() => onResetSongOverride(item.id)}>Use Library Setup</button>\n                  ) : null}\n                  <button type=\"button\" onClick={() => openEditor(item.id)}>\n",
);

replaceOne(
  actions,
  "    items: source.items.map((item) => ({ ...item, id: newId('playlist-item') })),\n",
  "    items: source.items.map((item) => ({ ...structuredClone(item), id: newId('playlist-item') })),\n",
);

console.log('Program song override integration edits applied.');
