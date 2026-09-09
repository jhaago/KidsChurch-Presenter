import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useSongTransport } from '../audio/useSongTransport';
import {
  createBlankPresentation,
  createBlankSong,
  duplicatePresentationResource,
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
  const [songs, setSongs] = useState<Song[]>(() => structuredClone(demoSongs));
  const [playlist, setPlaylist] = useState<Playlist>(() => structuredClone(demoPlaylist));
  const [libraryReady, setLibraryReady] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState<'loading' | 'saved' | 'saving' | 'error' | 'recovered'>('loading');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedItem = useMemo(
    () => playlist.items.find((item) => item.id === selectedItemId) ?? playlist.items[0],
    [playlist, selectedItemId],
  );
  const selectedSong = selectedItem.type === 'song'
    ? songs.find((song) => song.id === selectedItem.resourceId)
    : undefined;
  const selectedPresentation = selectedSong
    ? presentations.find((presentation) => presentation.id === selectedSong.presentationId)
    : presentations.find((presentation) => presentation.id === selectedItem.resourceId);
  const selectedMedia = selectedItem.type === 'media' ? mediaById(selectedItem.resourceId) : undefined;
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
        setPresentations(structuredClone(data.presentations));
        setSongs(structuredClone(data.songs));
        setPlaylist(structuredClone(data.playlists[0] ?? demoPlaylist));
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
        playlists: [playlist],
      };
      window.kidsPresenter?.savePresenterLibrary(data)
        .then(() => setLibraryStatus('saved'))
        .catch(() => setLibraryStatus('error'));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [libraryReady, playlist, presentations, songs]);

  useEffect(() => {
    const firstSlide = selectedPresentation ? allSlides(selectedPresentation)[0] : null;
    setSelectedSlideId(firstSlide?.id ?? null);
  }, [selectedPresentation]);

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

  const triggerSlide = useCallback((presentation: Presentation, slide: Slide) => {
    const slides = allSlides(presentation);
    const currentIndex = slides.findIndex((candidate) => candidate.id === slide.id);
    const nextSlide = currentIndex >= 0 ? slides[currentIndex + 1] ?? null : null;
    const song = songs.find((candidate) => candidate.presentationId === presentation.id);
    const background = song?.playbackMode !== 'lyrics-video' && song?.backgroundAssetId
      ? allMediaAssets.find((asset) => asset.id === song.backgroundAssetId)
      : undefined;

    setOutput((current) => ({
      ...current,
      slide: {
        presentationId: presentation.id,
        presentationTitle: presentation.title,
        slideId: slide.id,
        text: slide.text,
      },
      media: background ? liveMediaFromAsset(background, 'background') : current.media,
      black: false,
      logo: false,
    }));

    setStageOutput({
      presentationId: presentation.id,
      presentationTitle: presentation.title,
      currentSlideId: slide.id,
      currentText: slide.text,
      nextSlideId: nextSlide?.id ?? null,
      nextText: nextSlide?.text ?? null,
      notes: slide.notes ?? null,
    });
  }, [allMediaAssets, songs]);

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
  }, [allMediaAssets, songTransport.play]);

  const pauseSong = useCallback(() => songTransport.pause(), [songTransport.pause]);
  const resumeSong = useCallback(() => {
    void songTransport.resume();
  }, [songTransport.resume]);
  const seekSong = useCallback((positionMs: number) => {
    void songTransport.seek(positionMs);
  }, [songTransport.seek]);

  const stopSong = useCallback(() => {
    songTransport.stop();
    setOutput((current) => ({ ...current, audio: null }));
  }, [songTransport.stop]);

  const updatePresentation = useCallback((updatedPresentation: Presentation) => {
    setPresentations((current) => current.map((presentation) =>
      presentation.id === updatedPresentation.id ? updatedPresentation : presentation,
    ));
    setPlaylist((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.type !== 'song' && item.resourceId === updatedPresentation.id
          ? { ...item, title: updatedPresentation.title }
          : item,
      ),
    }));

    const liveSlide = output.slide?.presentationId === updatedPresentation.id
      ? allSlides(updatedPresentation).find((slide) => slide.id === output.slide?.slideId)
      : undefined;
    if (liveSlide) {
      setOutput((current) => ({
        ...current,
        slide: current.slide ? {
          ...current.slide,
          presentationTitle: updatedPresentation.title,
          text: liveSlide.text,
        } : null,
      }));
    }

    setStageOutput((current) => {
      if (current.presentationId !== updatedPresentation.id) return current;
      const slides = allSlides(updatedPresentation);
      const currentSlide = slides.find((slide) => slide.id === current.currentSlideId);
      const nextSlide = slides.find((slide) => slide.id === current.nextSlideId);
      return {
        ...current,
        presentationTitle: updatedPresentation.title,
        currentText: currentSlide?.text ?? current.currentText,
        nextText: nextSlide?.text ?? current.nextText,
        notes: currentSlide?.notes ?? null,
      };
    });
  }, [output.slide]);

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

    setPlaylist((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.type === 'song' && item.resourceId === updatedSong.id
          ? { ...item, title: updatedSong.title }
          : item,
      ),
    }));

    setOutput((current) => ({
      ...current,
      audio: current.audio?.id === updatedSong.id ? { ...current.audio, title: updatedSong.title } : current.audio,
    }));
  }, [songs, songTransport.setStemEnabled, songTransport.state.songId]);

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
    if (playlist.items.length <= 1) return;
    const index = playlist.items.findIndex((item) => item.id === itemId);
    if (index < 0) return;
    const nextItems = playlist.items.filter((item) => item.id !== itemId);

    setPlaylist((current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId) }));
    if (selectedItemId === itemId) {
      const replacement = nextItems[Math.min(index, nextItems.length - 1)];
      if (replacement) setSelectedItemId(replacement.id);
    }
  }, [playlist.items, selectedItemId]);

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
      const affectedItems = playlist.items.filter((item) => item.type === 'song' && item.resourceId === song.id);
      if (playlist.items.length - affectedItems.length < 1) {
        window.alert('Add another item to the service before deleting this Song.');
        return;
      }
      if (!window.confirm(`Delete “${song.title}” from the library? This removes every service reference to it but does not delete media/audio files.`)) return;

      if (songTransport.state.songId === song.id) stopSong();
      const linkedPresentationId = song.presentationId;
      setSongs((current) => current.filter((candidate) => candidate.id !== song.id));
      if (linkedPresentationId) {
        setPresentations((current) => current.filter((candidate) => candidate.id !== linkedPresentationId));
      }

      const remainingItems = playlist.items.filter((item) => !(item.type === 'song' && item.resourceId === song.id));
      setPlaylist((current) => ({
        ...current,
        items: current.items.filter((item) => !(item.type === 'song' && item.resourceId === song.id)),
      }));
      setSelectedItemId(remainingItems[0]?.id ?? selectedItemId);

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
      const affectedItems = playlist.items.filter((item) => item.resourceId === presentation.id);
      if (playlist.items.length - affectedItems.length < 1) {
        window.alert('Add another item to the service before deleting this Presentation.');
        return;
      }
      if (!window.confirm(`Delete “${presentation.title}” from the library? This removes every service reference to it.`)) return;

      setPresentations((current) => current.filter((candidate) => candidate.id !== presentation.id));
      const remainingItems = playlist.items.filter((item) => item.resourceId !== presentation.id);
      setPlaylist((current) => ({
        ...current,
        items: current.items.filter((item) => item.resourceId !== presentation.id),
      }));
      setSelectedItemId(remainingItems[0]?.id ?? selectedItemId);

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
    const slide = presentation
      ? allSlides(presentation).find((candidate) => candidate.id === cue.slideId)
      : undefined;
    if (!presentation || !slide) return;

    lastAutoCueRef.current = { songId: song.id, cueId: cue.id };
    setSelectedSlideId(slide.id);
    triggerSlide(presentation, slide);
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
      const slides = allSlides(presentation);
      if (!slides.length) return;

      const liveIndex = output.slide?.presentationId === presentation.id
        ? slides.findIndex((slide) => slide.id === output.slide?.slideId)
        : -1;
      const nextIndex = liveIndex < 0
        ? direction > 0 ? 0 : slides.length - 1
        : Math.max(0, Math.min(slides.length - 1, liveIndex + direction));

      setSelectedSlideId(slides[nextIndex].id);
      triggerSlide(presentation, slides[nextIndex]);
    },
    [output.slide, selectedPresentation, triggerSlide],
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
    if (item) setSelectedItemId(item.id);
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
        <SlideWorkspace
          availableAssets={allMediaAssets}
          media={selectedMedia}
          onChangePresentation={updatePresentation}
          onChangeSong={updateSong}
          onSelectSlide={setSelectedSlideId}
          onTriggerLyricsVideo={triggerLyricsVideo}
          onTriggerMedia={triggerMedia}
          onTriggerSlide={triggerSlide}
          output={output}
          presentation={selectedPresentation}
          selectedItem={selectedItem}
          selectedSlideId={selectedSlideId}
          song={selectedSong}
          songTransport={songTransport.state}
          onPauseSong={pauseSong}
          onPlaySong={(song) => void playSong(song)}
          onResumeSong={resumeSong}
          onSeekSong={seekSong}
          onStopSong={stopSong}
        />
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
          : 'Sunday Kids'}</span>
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
