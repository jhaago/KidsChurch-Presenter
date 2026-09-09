import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { mediaById, presentationById, presentations, sundayKidsPlaylist } from '../data/demo';
import {
  EMPTY_OUTPUT_STATE,
  EMPTY_STAGE_OUTPUT_STATE,
  type MediaAsset,
  type NetworkStageInfo,
  type OutputState,
  type PresenterOutputState,
  type ScreenKind,
  type Slide,
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedItem = useMemo(
    () => sundayKidsPlaylist.items.find((item) => item.id === selectedItemId) ?? sundayKidsPlaylist.items[0],
    [selectedItemId],
  );
  const selectedPresentation = presentationById(selectedItem.resourceId);
  const selectedMedia = mediaById(selectedItem.resourceId);

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
      unsubscribe = () => {
        unsubscribeVisibility();
        unsubscribeNetwork();
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

    setOutput((current) => ({
      ...current,
      slide: {
        presentationId: presentation.id,
        presentationTitle: presentation.title,
        slideId: slide.id,
        text: slide.text,
      },
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
  }, []);

  const triggerMedia = useCallback((asset: MediaAsset) => {
    setOutput((current) => ({
      ...current,
      media: { id: asset.id, title: asset.title, kind: asset.kind },
      black: false,
      logo: false,
    }));
  }, []);

  const clearAll = useCallback(() => setOutput({ ...EMPTY_OUTPUT_STATE }), []);
  const clearSlide = useCallback(() => setOutput((current) => ({ ...current, slide: null })), []);
  const clearMedia = useCallback(() => setOutput((current) => ({ ...current, media: null })), []);
  const clearProps = useCallback(() => setOutput((current) => ({ ...current, prop: null })), []);
  const clearAudio = useCallback(() => setOutput((current) => ({ ...current, audio: null })), []);
  const clearMessage = useCallback(
    () => setOutput((current) => ({ ...current, message: null, announcement: null })),
    [],
  );
  const clearToLogo = useCallback(() => setOutput({ ...EMPTY_OUTPUT_STATE, logo: true }), []);
  const toggleBlack = useCallback(
    () => setOutput((current) => ({ ...current, black: !current.black })),
    [],
  );

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
  }, [searchQuery]);

  const selectPresentationFromSearch = (presentationId: string) => {
    const item = sundayKidsPlaylist.items.find((candidate) => candidate.resourceId === presentationId);
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
        <LibraryPanel onSelectItem={setSelectedItemId} output={output} selectedItemId={selectedItemId} />
        <SlideWorkspace
          media={selectedMedia}
          onSelectSlide={setSelectedSlideId}
          onTriggerMedia={triggerMedia}
          onTriggerSlide={triggerSlide}
          output={output}
          presentation={selectedPresentation}
          selectedItem={selectedItem}
          selectedSlideId={selectedSlideId}
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
        activeTab={activeMediaTab}
        networkStage={networkStage}
        onTriggerMedia={triggerMedia}
        output={output}
        setActiveTab={setActiveMediaTab}
        stageOutput={stageOutput}
      />

      <footer className="operatorStatusBar">
        <span>KidsChurch Presenter <b>v{APP_VERSION}</b></span>
        <span>Sunday Kids</span>
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
