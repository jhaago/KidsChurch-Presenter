import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useSongTransport } from '../audio/useSongTransport';
import { arrangedSlides, sanitizeSongForPresentation } from '../domain/songArrangement';
import { resolveBackgroundAssetId, resolveSlideFormat, resolveSlideLayout } from '../domain/themes';
import {
  createBlankPresentation,
  createBlankService,
  createBlankSong,
  duplicatePresentationResource,
  duplicateService,
  duplicateSongResource,
  playlistItemForPresentation,
  playlistItemForSong,
} from '../domain/libraryActions';
import {
  mediaAssets as demoMediaAssets,
  mediaById,
  presentations as demoPresentations,
  songs as demoSongs,
  sundayKidsPlaylist as demoPlaylist,
} from '../data/demo';
import {
  EMPTY_OUTPUT_STATE,
  EMPTY_STAGE_OUTPUT_STATE,
  type MediaAsset,
  type NetworkStageInfo,
  type OutputState,
  type Playlist,
  type PresenterLibraryData,
  type PresenterOutputState,
  type PresentationTheme,
  type ResourceLibrarySnapshot,
  type ScreenKind,
  type Slide,
  type Song,
  type StageOutputState,
  type Presentation,
} from '../domain/types';
import { APP_VERSION } from '../version';
import { LibraryPanel } from './LibraryPanel';
import { LivePanel } from './LivePanel';
import { MediaBin, type MediaBinTab } from './MediaBin';
import { OperatorToolbar } from './OperatorToolbar';
import { SlideWorkspace } from './SlideWorkspace';
import { Icon } from './ui/Icon';

function allSlides(presentation: Presentation) {
  return presentation.groups.flatMap((group) => group.slides);
}

function liveMediaFromAsset(asset: MediaAsset, playbackRole: 'background' | 'video' = 'background') {
  return {
    id: asset.id,
    title: asset.title,
    kind: asset.kind,
    fileUrl: asset.fileUrl,
    sourceId: asset.sourceId,
    sourceLabel: asset.sourceLabel,
    playbackRole,
    muted: playbackRole === 'background',
    loop: playbackRole === 'background' && asset.kind === 'motion',
  } as const;
}

export function OperatorApp() {
  const [selectedItemId, setSelectedItemId] = useState('pi-song');
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>('loh-v1-1');
  const [selectedArrangementEntryId, setSelectedArrangementEntryId] = useState<string | null>(null);
  const [output, setOutput] = useState<OutputState>({ ...EMPTY_OUTPUT_STATE });
  const [stageOutput, setStageOutput] = useState<StageOutputState>({ ...EMPTY_STAGE_OUTPUT_STATE });
  const [activeMediaTab, setActiveMediaTab] = useState<MediaBinTab>('Media');
  const [screenVisibility, setScreenVisibility] = useState<Record<ScreenKind, boolean>>({
    audience: false,
    stage: false,
  });
  const [networkStage, setNetworkStage] = useState<NetworkStageInfo>({
    running: false,
    port: null,
    urls: [],
    clientCount: 0,
    error: null,
  });
  const [resourceLibrary, setResourceLibrary] = useState<ResourceLibrarySnapshot>({
    sources: [],
    assets: [],
    lastError: null,
  });
  const [presentations, setPresentations] = useState<Presentation[]>(() => structuredClone(demoPresentations));
  const [customThemes, setCustomThemes] = useState<PresentationTheme[]>([]);
  const [songs, setSongs] = useState<Song[]>(() => structuredClone(demoSongs));
  const [playlists, setPlaylists] = useState<Playlist[]>(() => [structuredClone(demoPlaylist)]);
  const [activePlaylistId, setActivePlaylistId] = useState(demoPlaylist.id);
  const activePlaylistIdRef = useRef(demoPlaylist.id);
  const [libraryReady, setLibraryReady] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState<'loading' | 'saved' | 'saving' | 'error' | 'recovered'>('loading');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const playlist = useMemo<Playlist>(
    () => playlists.find((candidate) => candidate.id === activePlaylistId) ?? playlists[0] ?? structuredClone(demoPlaylist),
    [activePlaylistId, playlists],
  );

  const setPlaylist = useCallback((updater: Playlist | ((current: Playlist) => Playlist)) => {
    setPlaylists((current) => current.map((service) => {
      if (service.id !== activePlaylistIdRef.current) return service;
      return typeof updater === 'function' ? updater(service) : updater;
    }));
  }, []);

  useEffect(() => {
    activePlaylistIdRef.current = activePlaylistId;
  }, [activePlaylistId]);

  const selectedItem = useMemo(
    () => playlist?.items.find((item) => item.id === selectedItemId) ?? playlist?.items[0],
    [playlist, selectedItemId],
  );
  const selectedSong = selectedItem?.type === 'song'
    ? songs.find((song) => song.id === selectedItem.resourceId)
    : undefined;
  const selectedPresentation = selectedSong
    ? presentations.find((presentation) => presentation.id === selectedSong.presentationId)
    : presentations.find((presentation) => presentation.id === selectedItem?.resourceId);
  const selectedMedia = selectedItem?.type === 'media' ? mediaById(selectedItem.resourceId) : undefined;
  const allMediaAssets = useMemo(
    () => [...demoMediaAssets, ...resourceLibrary.assets],
    [resourceLibrary.assets],
  );
  const resourceAssetCountBySource = useMemo(
    () => resourceLibrary.assets.reduce<Record<string, number>>((counts, asset) => {
      if (asset.sourceId) counts[asset.sourceId] = (counts[asset.sourceId] ?? 0) + 1;
      return counts;
    }, {}),
    [resourceLibrary.assets],
  );
  const songTransport = useSongTransport(allMediaAssets);
  const timingTransport = useSongTransport(allMediaAssets);
  const activeSong = useMemo(
    () => songs.find((song) => song.id === songTransport.state.songId),
    [songs, songTransport.state.songId],
  );
  const lastAutoCueRef = useRef<{ songId: string | null; cueId: string | null }>({
    songId: null,
    cueId: null,
  });

  useEffect(() => {
    let cancelled = false;
    const seed: PresenterLibraryData = {
      schemaVersion: 1,
      presentations: structuredClone(demoPresentations),
      songs: structuredClone(demoSongs),
      playlists: [structuredClone(demoPlaylist)],
      customThemes: [],
      activePlaylistId: demoPlaylist.id,
    };

    if (!window.kidsPresenter?.getPresenterLibrary) {
      setLibraryReady(true);
      setLibraryStatus('saved');
      return () => { cancelled = true; };
    }

    window.kidsPresenter.getPresenterLibrary()
      .then(async (result) => {
        if (cancelled) return;
        const data = result.data ?? seed;
        const loadedPlaylists = data.playlists.length
          ? structuredClone(data.playlists)
          : [structuredClone(demoPlaylist)];
        const loadedActiveId = data.activePlaylistId &&
          loadedPlaylists.some((service) => service.id === data.activePlaylistId)
          ? data.activePlaylistId
          : loadedPlaylists[0].id;
        const loadedActive = loadedPlaylists.find((service) => service.id === loadedActiveId) ?? loadedPlaylists[0];

        setPresentations(structuredClone(data.presentations));
        setCustomThemes(structuredClone(data.customThemes ?? []));
        setSongs(structuredClone(data.songs));
        setPlaylists(loadedPlaylists);
        setActivePlaylistId(loadedActiveId);
        activePlaylistIdRef.current = loadedActiveId;
        setSelectedItemId(loadedActive.items[0]?.id ?? '');
        setLibraryStatus(result.recoveredFromBackup ? 'recovered' : 'saved');
        setLibraryReady(true);
        if (!result.data) await window.kidsPresenter?.savePresenterLibrary(seed);
      })
      .catch(() => {
        if (cancelled) return;
        setLibraryReady(true);
        setLibraryStatus('error');
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!libraryReady || !window.kidsPresenter?.savePresenterLibrary) return;
    setLibraryStatus('saving');
    const timer = window.setTimeout(() => {
      const data: PresenterLibraryData = {
        schemaVersion: 1,
        presentations,
        songs,
        playlists,
        customThemes,
        activePlaylistId,
      };
      window.kidsPresenter?.savePresenterLibrary(data)
        .then(() => setLibraryStatus('saved'))
        .catch(() => setLibraryStatus('error'));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [activePlaylistId, customThemes, libraryReady, playlists, presentations, songs]);

  useEffect(() => {
    if (!selectedPresentation) {
      setSelectedSlideId(null);
      setSelectedArrangementEntryId(null);
      return;
    }

    if (selectedSong) {
      const first = arrangedSlides(selectedSong, selectedPresentation)[0];
      setSelectedSlideId(first?.slide.id ?? null);
      setSelectedArrangementEntryId(first?.arrangementEntryId ?? null);
      return;
    }

    const firstSlide = allSlides(selectedPresentation)[0] ?? null;
    setSelectedSlideId(firstSlide?.id ?? null);
    setSelectedArrangementEntryId(null);
  }, [selectedPresentation, selectedSong]);

  useEffect(() => {
    if (!output.slide) return;
    const livePresentation = presentations.find((presentation) =>
      presentation.id === output.slide?.presentationId,
    );
    const liveSlide = livePresentation
      ? allSlides(livePresentation).find((slide) => slide.id === output.slide?.slideId)
      : undefined;
    if (!livePresentation || !liveSlide) return;

    setOutput((current) => ({
      ...current,
      slide: current.slide ? {
        ...current.slide,
        format: resolveSlideFormat(livePresentation, liveSlide, customThemes),
        layout: resolveSlideLayout(livePresentation, liveSlide, customThemes),
      } : null,
    }));
  }, [
    customThemes,
    presentations,
    output.slide?.presentationId,
    output.slide?.slideId,
  ]);

  useEffect(() => {
    const presenterOutput: PresenterOutputState = { audience: output, stage: stageOutput };
    window.kidsPresenter?.sendPresenterOutput(presenterOutput);
  }, [output, stageOutput]);

  useEffect(() => {
    let unsubscribe = () => {};
    if (window.kidsPresenter) {
      Promise.all([
        window.kidsPresenter.getScreenVisible('audience'),
        window.kidsPresenter.getScreenVisible('stage'),
      ])
        .then(([audience, stage]) => setScreenVisibility({ audience, stage }))
        .catch(() => undefined);

      const unsubscribeVisibility = window.kidsPresenter.onScreenVisibility((kind, visible) => {
        setScreenVisibility((current) => ({ ...current, [kind]: visible }));
      });
      window.kidsPresenter.getNetworkStageInfo().then(setNetworkStage).catch(() => undefined);
      const unsubscribeNetwork = window.kidsPresenter.onNetworkStageInfo(setNetworkStage);
      window.kidsPresenter.getResourceLibrary().then(setResourceLibrary).catch(() => undefined);
      const unsubscribeResources = window.kidsPresenter.onResourceLibraryUpdated(setResourceLibrary);
      unsubscribe = () => {
        unsubscribeVisibility();
        unsubscribeNetwork();
        unsubscribeResources();
      };
    }
    return unsubscribe;
  }, []);

  const setScreenVisible = useCallback(async (kind: ScreenKind, visible: boolean) => {
    if (window.kidsPresenter) {
      const actual = await window.kidsPresenter.setScreenVisible(kind, visible);
      setScreenVisibility((current) => ({ ...current, [kind]: actual }));
    } else {
      setScreenVisibility((current) => ({ ...current, [kind]: visible }));
    }
  }, []);

  const triggerSlide = useCallback((
    presentation: Presentation,
    slide: Slide,
    arrangementEntryId?: string,
  ) => {
    const song = songs.find((candidate) => candidate.presentationId === presentation.id);
    const arranged = song ? arrangedSlides(song, presentation) : [];
    const sourceSlides = allSlides(presentation);
    const currentIndex = song
      ? arranged.findIndex((candidate) =>
          candidate.slide.id === slide.id &&
          (!arrangementEntryId || candidate.arrangementEntryId === arrangementEntryId),
        )
      : sourceSlides.findIndex((candidate) => candidate.id === slide.id);
    const currentOccurrence = song && currentIndex >= 0 ? arranged[currentIndex] : undefined;
    const nextOccurrence = song && currentIndex >= 0 ? arranged[currentIndex + 1] : undefined;
    const nextSlide = song
      ? nextOccurrence?.slide ?? null
      : currentIndex >= 0
        ? sourceSlides[currentIndex + 1] ?? null
        : null;
    const presentationBackgroundId = resolveBackgroundAssetId(presentation, slide);
    const backgroundId = slide.backgroundAssetId === null
      ? undefined
      : presentationBackgroundId ??
        (song?.playbackMode !== 'lyrics-video' ? song?.backgroundAssetId : undefined);
    const background = backgroundId
      ? allMediaAssets.find((asset) => asset.id === backgroundId)
      : undefined;
    const format = resolveSlideFormat(presentation, slide, customThemes);
    const layout = resolveSlideLayout(presentation, slide, customThemes);

    setOutput((current) => ({
      ...current,
      slide: {
        presentationId: presentation.id,
        presentationTitle: presentation.title,
        slideId: slide.id,
        arrangementEntryId: currentOccurrence?.arrangementEntryId,
        text: slide.text,
        format,
        layout,
      },
      media: background ? liveMediaFromAsset(background, 'background') : current.media,
      black: false,
      logo: false,
    }));

    setStageOutput({
      presentationId: presentation.id,
      presentationTitle: presentation.title,
      currentSlideId: slide.id,
      currentArrangementEntryId: currentOccurrence?.arrangementEntryId ?? null,
      currentText: slide.text,
      nextSlideId: nextSlide?.id ?? null,
      nextArrangementEntryId: nextOccurrence?.arrangementEntryId ?? null,
      nextText: nextSlide?.text ?? null,
      notes: slide.notes ?? null,
    });
  }, [allMediaAssets, customThemes, songs]);

  const triggerMedia = useCallback((asset: MediaAsset) => {
    const playbackRole = asset.kind === 'video' ? 'video' : 'background';
    setOutput((current) => ({
      ...current,
      media: liveMediaFromAsset(asset, playbackRole),
      black: false,
      logo: false,
    }));
  }, []);

  const triggerLyricsVideo = useCallback((asset: MediaAsset) => {
    setOutput((current) => ({
      ...current,
      slide: null,
      media: liveMediaFromAsset(asset, 'video'),
      black: false,
      logo: false,
    }));
  }, []);

  const playSong = useCallback(async (song: Song) => {
    timingTransport.stop();
    const started = await songTransport.play(song);
    if (!started) return;

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
  }, [allMediaAssets, songTransport.play, timingTransport.stop]);

  const pauseSong = useCallback(() => songTransport.pause(), [songTransport.pause]);
  const resumeSong = useCallback(() => {
    timingTransport.stop();
    void songTransport.resume();
  }, [songTransport.resume, timingTransport.stop]);
  const seekSong = useCallback((positionMs: number) => {
    void songTransport.seek(positionMs);
  }, [songTransport.seek]);

  const playTimingSong = useCallback(async (song: Song) => {
    if (songTransport.state.status === 'playing') {
      window.alert('Stop or pause the live Song transport before starting a timing preview.');
      return false;
    }
    return timingTransport.restart(song);
  }, [songTransport.state.status, timingTransport.restart]);

  const stopSong = useCallback(() => {
    songTransport.stop();
    setOutput((current) => ({ ...current, audio: null }));
  }, [songTransport.stop]);

  const updatePresentation = useCallback((updatedPresentation: Presentation) => {
    const previousPresentation = presentations.find((presentation) =>
      presentation.id === updatedPresentation.id,
    );
    const linkedSongBefore = songs.find((song) => song.presentationId === updatedPresentation.id);
    const structureSignature = (presentation?: Presentation) =>
      presentation?.groups
        .map((group) => `${group.id}:${group.slides.map((slide) => slide.id).join(',')}`)
        .join('|') ?? '';
    const lyricStructureChanged =
      Boolean(previousPresentation) &&
      structureSignature(previousPresentation) !== structureSignature(updatedPresentation);

    if (
      lyricStructureChanged &&
      linkedSongBefore?.lyricCues.length &&
      !window.confirm(
        'Changing the lyric section/slide order changes the Song sequence, so the saved Auto Lyrics timing map must be cleared. Continue?',
      )
    ) {
      return;
    }

    setPresentations((current) => current.map((presentation) =>
      presentation.id === updatedPresentation.id ? updatedPresentation : presentation,
    ));

    setSongs((current) => current.map((song) => {
      if (song.presentationId !== updatedPresentation.id) return song;
      const sanitized = sanitizeSongForPresentation(song, updatedPresentation);
      return lyricStructureChanged ? { ...sanitized, lyricCues: [] } : sanitized;
    }));

    setPlaylists((current) => current.map((service) => ({
      ...service,
      items: service.items.map((item) =>
        item.type !== 'song' && item.resourceId === updatedPresentation.id
          ? { ...item, title: updatedPresentation.title }
          : item,
      ),
    })));

    const linkedSong = linkedSongBefore;
    const liveSlide = output.slide?.presentationId === updatedPresentation.id
      ? allSlides(updatedPresentation).find((slide) => slide.id === output.slide?.slideId)
      : undefined;
    if (liveSlide) {
      const liveBackgroundId = resolveBackgroundAssetId(updatedPresentation, liveSlide);
      const linkedLiveSong = songs.find((song) => song.presentationId === updatedPresentation.id);
      const effectiveBackgroundId = liveSlide.backgroundAssetId === null
        ? undefined
        : liveBackgroundId ??
          (linkedLiveSong?.playbackMode !== 'lyrics-video' ? linkedLiveSong?.backgroundAssetId : undefined);
      const liveBackground = effectiveBackgroundId
        ? allMediaAssets.find((asset) => asset.id === effectiveBackgroundId)
        : undefined;

      setOutput((current) => ({
        ...current,
        slide: current.slide ? {
          ...current.slide,
          presentationTitle: updatedPresentation.title,
          text: liveSlide.text,
          format: resolveSlideFormat(updatedPresentation, liveSlide, customThemes),
          layout: resolveSlideLayout(updatedPresentation, liveSlide, customThemes),
        } : null,
        media: liveBackground
          ? liveMediaFromAsset(liveBackground, 'background')
          : current.media?.playbackRole === 'background'
            ? null
            : current.media,
      }));
    }

    setStageOutput((current) => {
      if (current.presentationId !== updatedPresentation.id) return current;

      const safeSong = linkedSong
        ? sanitizeSongForPresentation(linkedSong, updatedPresentation)
        : undefined;
      const sequence = safeSong ? arrangedSlides(safeSong, updatedPresentation) : [];
      const sourceSlides = allSlides(updatedPresentation);
      const currentIndex = safeSong
        ? sequence.findIndex((item) =>
            item.slide.id === current.currentSlideId &&
            (!current.currentArrangementEntryId ||
              item.arrangementEntryId === current.currentArrangementEntryId),
          )
        : sourceSlides.findIndex((slide) => slide.id === current.currentSlideId);
      const currentSlide = safeSong
        ? sequence[currentIndex]?.slide
        : sourceSlides[currentIndex];
      const nextOccurrence = safeSong ? sequence[currentIndex + 1] : undefined;
      const nextSlide = safeSong
        ? nextOccurrence?.slide
        : sourceSlides[currentIndex + 1];

      return {
        ...current,
        presentationTitle: updatedPresentation.title,
        currentText: currentSlide?.text ?? current.currentText,
        nextSlideId: nextSlide?.id ?? null,
        nextArrangementEntryId: nextOccurrence?.arrangementEntryId ?? null,
        nextText: nextSlide?.text ?? null,
        notes: currentSlide?.notes ?? null,
      };
    });
  }, [allMediaAssets, customThemes, output.slide, presentations, songs]);

  const createCustomTheme = useCallback((theme: PresentationTheme) => {
    setCustomThemes((current) => [...current, theme]);
  }, []);

  const updateCustomTheme = useCallback((updatedTheme: PresentationTheme) => {
    const nextThemes = customThemes.map((theme) =>
      theme.id === updatedTheme.id ? updatedTheme : theme,
    );
    setCustomThemes(nextThemes);

    const livePresentation = output.slide
      ? presentations.find((presentation) => presentation.id === output.slide?.presentationId)
      : undefined;
    const liveSlide = livePresentation && output.slide
      ? allSlides(livePresentation).find((slide) => slide.id === output.slide?.slideId)
      : undefined;
    if (livePresentation?.themeId === updatedTheme.id && liveSlide) {
      setOutput((current) => ({
        ...current,
        slide: current.slide ? {
          ...current.slide,
          format: resolveSlideFormat(livePresentation, liveSlide, nextThemes),
          layout: resolveSlideLayout(livePresentation, liveSlide, nextThemes),
        } : null,
      }));
    }
  }, [customThemes, output.slide, presentations]);

  const deleteCustomTheme = useCallback((themeId: string) => {
    const theme = customThemes.find((candidate) => candidate.id === themeId);
    if (!theme) return;

    const nextThemes = customThemes.filter((candidate) => candidate.id !== themeId);
    const nextPresentations = presentations.map((presentation) => {
      if (presentation.themeId !== themeId) return presentation;
      return {
        ...presentation,
        themeId: 'default',
        format: { ...resolveSlideFormat(presentation, undefined, customThemes) },
        layout: { ...resolveSlideLayout(presentation, undefined, customThemes) },
      };
    });

    setCustomThemes(nextThemes);
    setPresentations(nextPresentations);

    const livePresentation = output.slide
      ? nextPresentations.find((presentation) => presentation.id === output.slide?.presentationId)
      : undefined;
    const liveSlide = livePresentation && output.slide
      ? allSlides(livePresentation).find((slide) => slide.id === output.slide?.slideId)
      : undefined;
    if (livePresentation && liveSlide) {
      setOutput((current) => ({
        ...current,
        slide: current.slide ? {
          ...current.slide,
          format: resolveSlideFormat(livePresentation, liveSlide, nextThemes),
          layout: resolveSlideLayout(livePresentation, liveSlide, nextThemes),
        } : null,
      }));
    }
  }, [customThemes, output.slide, presentations]);

  const updateSong = useCallback((updatedSong: Song) => {
    const previous = songs.find((song) => song.id === updatedSong.id);
    if (songTransport.state.songId === updatedSong.id && previous) {
      for (const stem of updatedSong.audio.stems) {
        const oldStem = previous.audio.stems.find((candidate) => candidate.id === stem.id);
        if (oldStem && oldStem.enabled !== stem.enabled) {
          songTransport.setStemEnabled(stem.id, stem.enabled);
        }
      }
    }

    setSongs((current) => current.map((song) => song.id === updatedSong.id ? updatedSong : song));

    if (updatedSong.presentationId && previous?.title !== updatedSong.title) {
      setPresentations((current) => current.map((presentation) =>
        presentation.id === updatedSong.presentationId
          ? { ...presentation, title: updatedSong.title }
          : presentation,
      ));
    }

    setPlaylists((current) => current.map((service) => ({
      ...service,
      items: service.items.map((item) =>
        item.type === 'song' && item.resourceId === updatedSong.id
          ? { ...item, title: updatedSong.title }
          : item,
      ),
    })));

    setOutput((current) => ({
      ...current,
      audio: current.audio?.id === updatedSong.id ? { ...current.audio, title: updatedSong.title } : current.audio,
    }));

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
    presentations,
    selectedArrangementEntryId,
    selectedSlideId,
    selectedSong?.id,
    songs,
    songTransport.setStemEnabled,
    songTransport.state.songId,
  ]);

  const appendAndSelectServiceItem = useCallback((item: Playlist['items'][number]) => {
    setPlaylist((current) => ({ ...current, items: [...current.items, item] }));
    setSelectedItemId(item.id);
  }, []);

  const createPresentation = useCallback(() => {
    const created = createBlankPresentation();
    setPresentations((current) => [...current, created.presentation]);
    appendAndSelectServiceItem(created.item);
  }, [appendAndSelectServiceItem]);

  const createSong = useCallback(() => {
    const created = createBlankSong();
    setPresentations((current) => [...current, created.presentation]);
    setSongs((current) => [...current, created.song]);
    appendAndSelectServiceItem(created.item);
  }, [appendAndSelectServiceItem]);

  const addPresentationToService = useCallback((presentationId: string) => {
    const presentation = presentations.find((candidate) => candidate.id === presentationId);
    if (!presentation) return;
    appendAndSelectServiceItem(playlistItemForPresentation(presentation));
  }, [appendAndSelectServiceItem, presentations]);

  const addSongToService = useCallback((songId: string) => {
    const song = songs.find((candidate) => candidate.id === songId);
    if (!song) return;
    appendAndSelectServiceItem(playlistItemForSong(song));
  }, [appendAndSelectServiceItem, songs]);

  const duplicateSelected = useCallback(() => {
    if (!selectedItem) return;

    if (selectedItem.type === 'song') {
      const song = songs.find((candidate) => candidate.id === selectedItem.resourceId);
      const presentation = song?.presentationId
        ? presentations.find((candidate) => candidate.id === song.presentationId)
        : undefined;
      if (!song || !presentation) return;

      const duplicated = duplicateSongResource(song, presentation);
      setPresentations((current) => [...current, duplicated.presentation]);
      setSongs((current) => [...current, duplicated.song]);
      setPlaylist((current) => {
        const selectedIndex = current.items.findIndex((item) => item.id === selectedItem.id);
        const nextItems = [...current.items];
        nextItems.splice(selectedIndex >= 0 ? selectedIndex + 1 : nextItems.length, 0, duplicated.item);
        return { ...current, items: nextItems };
      });
      setSelectedItemId(duplicated.item.id);
      return;
    }

    if (['presentation', 'bible', 'timer'].includes(selectedItem.type)) {
      const presentation = presentations.find((candidate) => candidate.id === selectedItem.resourceId);
      if (!presentation) return;

      const duplicated = duplicatePresentationResource(presentation);
      setPresentations((current) => [...current, duplicated.presentation]);
      setPlaylist((current) => {
        const selectedIndex = current.items.findIndex((item) => item.id === selectedItem.id);
        const nextItems = [...current.items];
        nextItems.splice(selectedIndex >= 0 ? selectedIndex + 1 : nextItems.length, 0, duplicated.item);
        return { ...current, items: nextItems };
      });
      setSelectedItemId(duplicated.item.id);
    }
  }, [presentations, selectedItem, songs]);

  const removeServiceItem = useCallback((itemId: string) => {
    const index = playlist.items.findIndex((item) => item.id === itemId);
    if (index < 0) return;
    const nextItems = playlist.items.filter((item) => item.id !== itemId);

    setPlaylist((current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId) }));
    if (selectedItemId === itemId) {
      const replacement = nextItems[Math.min(index, nextItems.length - 1)];
      setSelectedItemId(replacement?.id ?? '');
    }
  }, [playlist.items, selectedItemId, setPlaylist]);

  const moveServiceItem = useCallback((itemId: string, direction: -1 | 1) => {
    setPlaylist((current) => {
      const from = current.items.findIndex((item) => item.id === itemId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.items.length) return current;
      const nextItems = [...current.items];
      const [item] = nextItems.splice(from, 1);
      nextItems.splice(to, 0, item);
      return { ...current, items: nextItems };
    });
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedItem) return;

    if (selectedItem.type === 'song') {
      const song = songs.find((candidate) => candidate.id === selectedItem.resourceId);
      if (!song) return;
      if (!window.confirm(`Delete “${song.title}” from the library? This removes every service reference to it but does not delete media/audio files.`)) return;

      if (songTransport.state.songId === song.id) stopSong();
      const linkedPresentationId = song.presentationId;
      setSongs((current) => current.filter((candidate) => candidate.id !== song.id));
      if (linkedPresentationId) {
        setPresentations((current) => current.filter((candidate) => candidate.id !== linkedPresentationId));
      }

      const remainingItems = playlist.items.filter((item) => !(item.type === 'song' && item.resourceId === song.id));
      setPlaylists((current) => current.map((service) => ({
        ...service,
        items: service.items.filter((item) => !(item.type === 'song' && item.resourceId === song.id)),
      })));
      if (selectedItem.type === 'song' && selectedItem.resourceId === song.id) {
        setSelectedItemId(remainingItems[0]?.id ?? '');
      }

      if (linkedPresentationId && output.slide?.presentationId === linkedPresentationId) {
        setOutput((current) => ({ ...current, slide: null }));
        setStageOutput({ ...EMPTY_STAGE_OUTPUT_STATE });
      }
      if (song.lyricsVideoAssetId && output.media?.id === song.lyricsVideoAssetId) {
        setOutput((current) => ({ ...current, media: null }));
      }
      return;
    }

    if (['presentation', 'bible', 'timer'].includes(selectedItem.type)) {
      const presentation = presentations.find((candidate) => candidate.id === selectedItem.resourceId);
      if (!presentation) return;
      if (!window.confirm(`Delete “${presentation.title}” from the library? This removes every service reference to it.`)) return;

      setPresentations((current) => current.filter((candidate) => candidate.id !== presentation.id));
      const remainingItems = playlist.items.filter((item) => item.resourceId !== presentation.id);
      setPlaylists((current) => current.map((service) => ({
        ...service,
        items: service.items.filter((item) => item.resourceId !== presentation.id),
      })));
      if (selectedItem.resourceId === presentation.id) {
        setSelectedItemId(remainingItems[0]?.id ?? '');
      }

      if (output.slide?.presentationId === presentation.id) {
        setOutput((current) => ({ ...current, slide: null }));
        setStageOutput({ ...EMPTY_STAGE_OUTPUT_STATE });
      }
    }
  }, [
    output.media?.id,
    output.slide?.presentationId,
    playlist.items,
    presentations,
    selectedItem,
    selectedItemId,
    songTransport.state.songId,
    songs,
    stopSong,
  ]);

  const selectService = useCallback((playlistId: string) => {
    const next = playlists.find((service) => service.id === playlistId);
    if (!next || next.id === activePlaylistIdRef.current) return;
    activePlaylistIdRef.current = next.id;
    setActivePlaylistId(next.id);
    setSelectedItemId(next.items[0]?.id ?? '');
    setSelectedSlideId(null);
    setSelectedArrangementEntryId(null);
  }, [playlists]);

  const createService = useCallback(() => {
    const proposed = window.prompt('Name this service', 'New Service');
    if (proposed === null) return;
    const next = createBlankService(proposed.trim() || 'New Service');
    setPlaylists((current) => [...current, next]);
    activePlaylistIdRef.current = next.id;
    setActivePlaylistId(next.id);
    setSelectedItemId('');
    setSelectedSlideId(null);
    setSelectedArrangementEntryId(null);
  }, []);

  const duplicateActiveService = useCallback(() => {
    const next = duplicateService(playlist);
    setPlaylists((current) => [...current, next]);
    activePlaylistIdRef.current = next.id;
    setActivePlaylistId(next.id);
    setSelectedItemId(next.items[0]?.id ?? '');
    setSelectedSlideId(null);
    setSelectedArrangementEntryId(null);
  }, [playlist]);

  const deleteActiveService = useCallback(() => {
    if (playlists.length <= 1) return;
    if (!window.confirm(`Delete service “${playlist.title}”? Library Songs, Presentations and media are not deleted.`)) return;

    const index = playlists.findIndex((service) => service.id === playlist.id);
    const remaining = playlists.filter((service) => service.id !== playlist.id);
    const next = remaining[Math.min(Math.max(index, 0), remaining.length - 1)] ?? remaining[0];
    setPlaylists(remaining);
    activePlaylistIdRef.current = next.id;
    setActivePlaylistId(next.id);
    setSelectedItemId(next.items[0]?.id ?? '');
    setSelectedSlideId(null);
    setSelectedArrangementEntryId(null);
  }, [playlist, playlists]);

  const updateActiveService = useCallback((updates: Partial<Pick<Playlist, 'title' | 'serviceDate' | 'description'>>) => {
    setPlaylist((current) => ({ ...current, ...updates }));
  }, [setPlaylist]);

  const clearAll = useCallback(() => {
    songTransport.stop();
    setOutput({ ...EMPTY_OUTPUT_STATE });
  }, [songTransport.stop]);
  const clearSlide = useCallback(() => setOutput((current) => ({ ...current, slide: null })), []);
  const clearMedia = useCallback(() => setOutput((current) => ({ ...current, media: null })), []);
  const clearProps = useCallback(() => setOutput((current) => ({ ...current, prop: null })), []);
  const clearAudio = useCallback(() => stopSong(), [stopSong]);
  const clearMessage = useCallback(
    () => setOutput((current) => ({ ...current, message: null, announcement: null })),
    [],
  );
  const clearToLogo = useCallback(() => {
    songTransport.stop();
    setOutput({ ...EMPTY_OUTPUT_STATE, logo: true });
  }, [songTransport.stop]);
  const toggleBlack = useCallback(
    () => setOutput((current) => ({ ...current, black: !current.black })),
    [],
  );

  useEffect(() => {
    const transport = songTransport.state;
    if (!transport.songId || transport.status !== 'playing') return;

    const song = songs.find((candidate) => candidate.id === transport.songId);
    if (!song || song.lyricControlMode !== 'auto' || !song.presentationId) return;

    if (lastAutoCueRef.current.songId !== song.id) {
      lastAutoCueRef.current = { songId: song.id, cueId: null };
    }

    const cue = [...song.lyricCues]
      .sort((a, b) => a.timeMs - b.timeMs)
      .filter((candidate) => candidate.timeMs <= transport.positionMs + 50)
      .at(-1);
    if (!cue || cue.id === lastAutoCueRef.current.cueId) return;

    const presentation = presentations.find((candidate) => candidate.id === song.presentationId);
    const sequence = presentation ? arrangedSlides(song, presentation) : [];
    const occurrence = sequence.find((candidate) =>
      candidate.slide.id === cue.slideId &&
      (!cue.arrangementEntryId || candidate.arrangementEntryId === cue.arrangementEntryId),
    );
    if (!presentation || !occurrence) return;

    lastAutoCueRef.current = { songId: song.id, cueId: cue.id };
    setSelectedSlideId(occurrence.slide.id);
    setSelectedArrangementEntryId(occurrence.arrangementEntryId);
    triggerSlide(presentation, occurrence.slide, occurrence.arrangementEntryId);
  }, [
    songTransport.state.positionMs,
    songTransport.state.songId,
    songTransport.state.status,
    presentations,
    songs,
    triggerSlide,
  ]);

  useEffect(() => {
    if (songTransport.state.status !== 'ended' && songTransport.state.status !== 'error') return;
    const songId = songTransport.state.songId;
    setOutput((current) =>
      current.audio?.id === songId ? { ...current, audio: null } : current,
    );
  }, [songTransport.state.songId, songTransport.state.status]);

  const navigate = useCallback(
    (direction: -1 | 1) => {
      const presentation = selectedPresentation;
      if (!presentation) return;

      if (selectedSong) {
        const sequence = arrangedSlides(selectedSong, presentation);
        if (!sequence.length) return;
        const liveIndex = output.slide?.presentationId === presentation.id
          ? sequence.findIndex((item) =>
              item.slide.id === output.slide?.slideId &&
              (!output.slide?.arrangementEntryId ||
                item.arrangementEntryId === output.slide.arrangementEntryId),
            )
          : -1;
        const nextIndex = liveIndex < 0
          ? direction > 0 ? 0 : sequence.length - 1
          : Math.max(0, Math.min(sequence.length - 1, liveIndex + direction));
        const next = sequence[nextIndex];

        setSelectedSlideId(next.slide.id);
        setSelectedArrangementEntryId(next.arrangementEntryId);
        triggerSlide(presentation, next.slide, next.arrangementEntryId);
        return;
      }

      const slides = allSlides(presentation);
      if (!slides.length) return;
      const liveIndex = output.slide?.presentationId === presentation.id
        ? slides.findIndex((slide) => slide.id === output.slide?.slideId)
        : -1;
      const nextIndex = liveIndex < 0
        ? direction > 0 ? 0 : slides.length - 1
        : Math.max(0, Math.min(slides.length - 1, liveIndex + direction));

      setSelectedSlideId(slides[nextIndex].id);
      setSelectedArrangementEntryId(null);
      triggerSlide(presentation, slides[nextIndex]);
    },
    [output.slide, selectedPresentation, selectedSong, triggerSlide],
  );

  const openSearch = useCallback(() => {
    setSearchQuery('');
    setSearchOpen(true);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = navigator.platform.toLowerCase().includes('mac') ? event.metaKey : event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        openSearch();
        return;
      }
      if (searchOpen && event.key === 'Escape') {
        setSearchOpen(false);
        return;
      }
      if (searchOpen) return;

      const target = event.target as HTMLElement | null;
      const isEditingControl = Boolean(
        target &&
        (
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.closest('[data-presenter-editor="true"]')
        )
      );
      if (isEditingControl && !/^F(?:1|2|3|4|5|6|12)$/.test(event.key)) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigate(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigate(-1);
      } else if (event.key === 'F1') {
        event.preventDefault();
        clearAll();
      } else if (event.key === 'F2') {
        event.preventDefault();
        clearSlide();
      } else if (event.key === 'F3') {
        event.preventDefault();
        clearMedia();
      } else if (event.key === 'F4') {
        event.preventDefault();
        clearProps();
      } else if (event.key === 'F5') {
        event.preventDefault();
        clearAudio();
      } else if (event.key === 'F6') {
        event.preventDefault();
        clearMessage();
      } else if (event.key === 'F12') {
        event.preventDefault();
        clearToLogo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clearAll, clearAudio, clearMedia, clearMessage, clearProps, clearSlide, clearToLogo, navigate, openSearch, searchOpen]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return presentations.filter((presentation) => presentation.title.toLowerCase().includes(query));
  }, [presentations, searchQuery]);

  const selectPresentationFromSearch = (presentationId: string) => {
    const directItem = playlist.items.find((candidate) => candidate.resourceId === presentationId);
    const matchingSong = songs.find((song) => song.presentationId === presentationId);
    const songItem = matchingSong
      ? playlist.items.find((candidate) => candidate.type === 'song' && candidate.resourceId === matchingSong.id)
      : undefined;
    const item = directItem ?? songItem;
    if (item) {
      setSelectedItemId(item.id);
    } else if (matchingSong) {
      appendAndSelectServiceItem(playlistItemForSong(matchingSong));
    } else {
      const presentation = presentations.find((candidate) => candidate.id === presentationId);
      if (presentation) appendAndSelectServiceItem(playlistItemForPresentation(presentation));
    }
    setSearchOpen(false);
  };

  return (
    <div className="operatorApp">
      <OperatorToolbar
        onOpenSearch={openSearch}
        onShowMedia={() => setActiveMediaTab('Media')}
        onToggleScreen={(kind) => void setScreenVisible(kind, !screenVisibility[kind])}
        screenVisibility={screenVisibility}
      />

      <main className="operatorMain">
        <LibraryPanel
          playlist={playlist}
          playlists={playlists}
          activePlaylistId={activePlaylistId}
          presentations={presentations}
          songs={songs}
          onCreatePresentation={createPresentation}
          onCreateSong={createSong}
          onAddPresentationToService={addPresentationToService}
          onAddSongToService={addSongToService}
          onDuplicateSelected={duplicateSelected}
          onDeleteSelected={deleteSelected}
          onMoveServiceItem={moveServiceItem}
          onRemoveServiceItem={removeServiceItem}
          onSelectService={selectService}
          onCreateService={createService}
          onDuplicateService={duplicateActiveService}
          onDeleteService={deleteActiveService}
          onUpdateService={updateActiveService}
          onAddResourceFolder={() => {
            void window.kidsPresenter?.addResourceFolder().then(setResourceLibrary);
          }}
          onRemoveResourceFolder={(sourceId) => {
            void window.kidsPresenter?.removeResourceFolder(sourceId).then(setResourceLibrary);
          }}
          onSelectItem={setSelectedItemId}
          output={output}
          resourceAssetCountBySource={resourceAssetCountBySource}
          resourceSources={resourceLibrary.sources}
          selectedItemId={selectedItemId}
        />
        {selectedItem ? (
          <SlideWorkspace
            availableAssets={allMediaAssets}
            customThemes={customThemes}
            media={selectedMedia}
            onChangePresentation={updatePresentation}
            onCreateTheme={createCustomTheme}
            onUpdateTheme={updateCustomTheme}
            onDeleteTheme={deleteCustomTheme}
            onChangeSong={updateSong}
            onSelectSlide={(slideId, arrangementEntryId) => {
              setSelectedSlideId(slideId);
              setSelectedArrangementEntryId(arrangementEntryId ?? null);
            }}
            onTriggerLyricsVideo={triggerLyricsVideo}
            onTriggerMedia={triggerMedia}
            onTriggerSlide={triggerSlide}
            output={output}
            presentation={selectedPresentation}
            selectedItem={selectedItem}
            selectedSlideId={selectedSlideId}
            selectedArrangementEntryId={selectedArrangementEntryId}
            song={selectedSong}
            songTransport={songTransport.state}
            timingTransport={timingTransport.state}
            getTimingPositionMs={timingTransport.getPositionMs}
            onPauseSong={pauseSong}
            onPlaySong={(song) => void playSong(song)}
            onResumeSong={resumeSong}
            onSeekSong={seekSong}
            onStopSong={stopSong}
            onPlayTimingSong={playTimingSong}
            onPauseTimingSong={timingTransport.pause}
            onResumeTimingSong={timingTransport.resume}
            onStopTimingSong={timingTransport.stop}
            onSeekTimingSong={timingTransport.seek}
          />
        ) : (
          <section className="slideWorkspace emptyServiceWorkspace">
            <div>
              <Icon name="playlist" />
              <strong>{playlist.title}</strong>
              <span>This service has no items yet.</span>
              <p>Add a Song or Presentation from the Library, or create a new one.</p>
            </div>
          </section>
        )}
        <LivePanel
          networkStage={networkStage}
          onClearAll={clearAll}
          onClearAudio={clearAudio}
          onClearMedia={clearMedia}
          onClearMessage={clearMessage}
          onClearProps={clearProps}
          onClearSlide={clearSlide}
          onClearToLogo={clearToLogo}
          onNavigate={navigate}
          onToggleBlack={toggleBlack}
          output={output}
          screenVisibility={screenVisibility}
        />
      </main>

      <MediaBin
        activeSong={activeSong}
        activeTab={activeMediaTab}
        assets={allMediaAssets}
        networkStage={networkStage}
        onPauseSong={pauseSong}
        onPlaySong={(song) => void playSong(song)}
        onResumeSong={resumeSong}
        onSeekSong={seekSong}
        onStopSong={stopSong}
        onToggleStem={(stemId, enabled) => {
          if (!activeSong) return;
          updateSong({
            ...activeSong,
            audio: {
              ...activeSong.audio,
              stems: activeSong.audio.stems.map((stem) =>
                stem.id === stemId ? { ...stem, enabled } : stem,
              ),
            },
          });
        }}
        onRescanResources={() => {
          void window.kidsPresenter?.rescanResourceLibrary().then(setResourceLibrary);
        }}
        onTriggerMedia={triggerMedia}
        output={output}
        songTransport={songTransport.state}
        resourceSources={resourceLibrary.sources}
        setActiveTab={setActiveMediaTab}
        stageOutput={stageOutput}
      />

      <footer className="operatorStatusBar">
        <span>KidsChurch Presenter <b>v{APP_VERSION}</b> · {libraryStatus === 'saving' ? 'Saving…' : libraryStatus === 'error' ? 'Save error' : libraryStatus === 'recovered' ? 'Recovered backup' : 'Saved'}</span>
        <span>{songTransport.state.songTitle
          ? `${songTransport.state.songTitle} · ${songTransport.state.status.toUpperCase()}`
          : playlist.title}</span>
        <span><i className={screenVisibility.audience ? 'isOn' : ''}/>Audience <i className={screenVisibility.stage ? 'isOn' : ''}/>Stage</span>
      </footer>

      <div
        className={`searchOverlay ${searchOpen ? 'isOpen' : ''}`}
        onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
          if (event.currentTarget === event.target) setSearchOpen(false);
        }}
      >
        <div className="searchDialog" role="dialog" aria-label="Search library">
          <div className="searchField">
            <Icon name="search" />
            <input
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
              placeholder="Search library…"
              ref={searchInputRef}
              value={searchQuery}
            />
            <kbd>ESC</kbd>
          </div>
          <div className="searchResults">
            {searchResults.map((presentation) => (
              <button key={presentation.id} onClick={() => selectPresentationFromSearch(presentation.id)} type="button">
                <Icon name={presentation.category === 'scripture' ? 'bible' : presentation.category === 'timer' ? 'timer' : 'presentation'} />
                <span>{presentation.title}</span>
                <small>{presentation.category}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
