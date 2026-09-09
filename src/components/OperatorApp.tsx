import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { mediaAssets, mediaById, presentationById, presentations, sundayKidsPlaylist } from '../data/demo';
import { AudienceOutput } from './AudienceOutput';
import {
  EMPTY_OUTPUT_STATE,
  EMPTY_STAGE_OUTPUT_STATE,
  type MediaAsset,
  type NetworkStageInfo,
  type OutputState,
  type PresenterOutputState,
  type PlaylistItem,
  type ScreenKind,
  type StageOutputState,
  type Presentation,
  type Slide,
} from '../domain/types';

const kindIcon: Record<PlaylistItem['type'], string> = {
  presentation: '▧',
  media: '▶',
  bible: '▤',
  timer: '◷',
  interactive: '◆',
  'web-tool': '⌘',
};

function allSlides(presentation: Presentation) {
  return presentation.groups.flatMap((group) => group.slides);
}

function outputLabel(output: OutputState) {
  if (output.black) return 'Black';
  if (output.logo) return 'Logo';
  if (output.slide) return output.slide.presentationTitle;
  if (output.media) return output.media.title;
  return 'Cleared';
}

export function OperatorApp() {
  const [selectedItemId, setSelectedItemId] = useState('pi-song');
  const [output, setOutput] = useState<OutputState>({ ...EMPTY_OUTPUT_STATE });
  const [stageOutput, setStageOutput] = useState<StageOutputState>({ ...EMPTY_STAGE_OUTPUT_STATE });
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
    const presenterOutput: PresenterOutputState = { audience: output, stage: stageOutput };
    window.kidsPresenter?.sendPresenterOutput(presenterOutput);
  }, [output, stageOutput]);

  useEffect(() => {
    let unsubscribe: () => void = () => {};
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
  const clearMessage = useCallback(() => setOutput((current) => ({ ...current, message: null })), []);
  const clearToLogo = useCallback(() => setOutput({ ...EMPTY_OUTPUT_STATE, logo: true }), []);
  const toggleBlack = useCallback(
    () => setOutput((current) => ({ ...current, black: !current.black, logo: current.black ? current.logo : false })),
    [],
  );

  const navigate = useCallback(
    (direction: -1 | 1) => {
      const presentation = selectedPresentation;
      if (!presentation) return;
      const slides = allSlides(presentation);
      if (!slides.length) return;

      const liveIndex =
        output.slide?.presentationId === presentation.id
          ? slides.findIndex((slide) => slide.id === output.slide?.slideId)
          : -1;

      const nextIndex =
        liveIndex < 0
          ? direction > 0
            ? 0
            : slides.length - 1
          : Math.max(0, Math.min(slides.length - 1, liveIndex + direction));

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
    <div className="app">
      <header className="toolbar">
        <div>
          <button className="tool" onClick={openSearch} title="Search (Cmd/Ctrl+F)">
            <span className="glyph">⌕</span>
            Search
          </button>
          <span className="divider" />
          {['Text', 'Theme', 'Show', 'Edit', 'Reflow', 'Bible'].map((name) => (
            <button className={`tool ${name === 'Show' ? 'active' : ''}`} key={name} type="button">
              <span className="glyph">{name.slice(0, 1)}</span>
              {name}
            </button>
          ))}
        </div>
        <div>
          <button className="tool" type="button">
            <span className="glyph">M</span>
            Media
          </button>
          <button className="tool" type="button">
            <span className="glyph">L</span>
            Looks
          </button>
          <button
            className={`screen screenButton ${screenVisibility.audience ? 'screenOn' : ''}`}
            type="button"
            onClick={() => setScreenVisible('audience', !screenVisibility.audience)}
          >
            <span className={`dot ${screenVisibility.audience ? 'on' : ''}`} />
            Audience
          </button>
          <button
            className={`screen screenButton ${screenVisibility.stage ? 'screenOn' : ''}`}
            type="button"
            onClick={() => setScreenVisible('stage', !screenVisibility.stage)}
          >
            <span className={`dot ${screenVisibility.stage ? 'on' : ''}`} />
            Stage
          </button>
        </div>
      </header>

      <main className="main">
        <aside className="sidebar">
          <div className="sideTop">
            <div className="titleRow">
              <span className="panelTitle">LIBRARY / PLAYLIST</span>
              <button className="tiny" type="button">＋</button>
            </div>
            <div className="sect">LIBRARIES</div>
            <button className="tree sel" type="button">
              <span>▼</span><span>Kids Songs</span><span className="count">1</span>
            </button>
            <button className="tree" type="button">
              <span>▼</span><span>Presentations</span><span className="count">7</span>
            </button>
            <div className="sect">PLAYLISTS</div>
            <button className="tree sel" type="button">
              <span>▼</span><span>Sunday Kids</span><span className="count">{sundayKidsPlaylist.items.length}</span>
            </button>
            <button className="tree" type="button">
              <span>▸</span><span>Christmas</span><span className="count">0</span>
            </button>
          </div>

          <div className="playlist">
            <div className="playlistHead">
              <div className="panelTitle">SUNDAY KIDS</div>
              <div className="sub">Demo service • typed playlist items</div>
            </div>
            <div className="playlistItems">
              {sundayKidsPlaylist.items.map((item, index) => (
                <button
                  className={`item ${selectedItemId === item.id ? 'sel' : ''}`}
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItemId(item.id)}
                >
                  <span className="idx">{index + 1}</span>
                  <span className="kind">{kindIcon[item.type]}</span>
                  <span className="name">{item.title}</span>
                  <span>{selectedItemId === item.id ? '‸' : ''}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="work">
          <div className="presHead">
            <div>
              <h1>{selectedItem.title}</h1>
              <span className="presKind">{selectedItem.type.toUpperCase()}</span>
            </div>
            <span className="view">Slide View</span>
          </div>

          {selectedPresentation ? (
            <div className="groups">
              {selectedPresentation.groups.map((group) => (
                <section className="group" key={group.id}>
                  <div className={`groupLabel ${group.type}`}>{group.name}</div>
                  <div className="grid">
                    {group.slides.map((slide, index) => {
                      const live =
                        output.slide?.presentationId === selectedPresentation.id && output.slide.slideId === slide.id;
                      return (
                        <button
                          className={`slide ${live ? 'live' : ''}`}
                          key={slide.id}
                          type="button"
                          onClick={() => triggerSlide(selectedPresentation, slide)}
                        >
                          <span className="num">{index + 1}</span>
                          {live ? <span className="badge">LIVE</span> : null}
                          <span className="canvas">
                            <span className="slideText">
                              {slide.text.split('\n').map((line, lineIndex) => (
                                <span key={`${slide.id}-${lineIndex}`}>{line}</span>
                              ))}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : selectedMedia ? (
            <div className="groups toolWorkspace">
              <div className="futureCard">
                <div className="futureEyebrow">MEDIA PLAYLIST ITEM</div>
                <h2>{selectedMedia.title}</h2>
                <p>Selecting an item only prepares it. Click the media tile below to send the media layer live.</p>
                <button className="mediaLaunch" type="button" onClick={() => triggerMedia(selectedMedia)}>
                  <span className="mediaThumb" />
                  <strong>Trigger Media</strong>
                </button>
              </div>
            </div>
          ) : (
            <div className="groups toolWorkspace">
              <div className="futureCard">
                <div className="futureEyebrow">
                  {selectedItem.type === 'web-tool' ? 'WEB TOOL' : 'INTERACTIVE TOOL'}
                </div>
                <h2>{selectedItem.title}</h2>
                <p>
                  This playlist type is already part of the domain model, but its runtime is intentionally not implemented
                  yet. Future tools will have separate operator controls and clean Audience output.
                </p>
                <div className="futureFlow">
                  <span>Prepare</span><b>→</b><span>Show</span><b>→</b><span>Reset</span><b>→</b><span>Complete</span>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="inspector">
          <section className="insSec">
            <div className="panelTitle">AUDIENCE PREVIEW</div>
            <AudienceOutput output={output} preview />
            <div className="meta">
              <span>{outputLabel(output)}</span>
              <span>{output.slide?.slideId ?? '—'}</span>
            </div>
            <div className="transport">
              <button type="button" onClick={() => navigate(-1)}>← Previous</button>
              <button type="button" onClick={() => navigate(1)}>Next →</button>
            </div>
          </section>

          <section className="insSec">
            <div className="panelTitle">CLEAR</div>
            <div className="clear">
              <button className="danger" type="button" onClick={clearAll}><kbd>F1</kbd> All</button>
              <button type="button" onClick={clearSlide}><kbd>F2</kbd> Slide</button>
              <button type="button" onClick={clearMedia}><kbd>F3</kbd> Media</button>
              <button type="button" onClick={clearProps}><kbd>F4</kbd> Props</button>
              <button type="button" onClick={clearAudio}><kbd>F5</kbd> Audio</button>
              <button type="button" onClick={clearMessage}><kbd>F6</kbd> Message</button>
              <button className={output.logo ? 'active' : ''} type="button" onClick={clearToLogo}><kbd>F12</kbd> Logo</button>
              <button className={output.black ? 'active' : ''} type="button" onClick={toggleBlack}>■ Black</button>
            </div>
          </section>

          <section className="insSec">
            <div className="panelTitle">NETWORK STAGE</div>
            <div className="networkStageBox">
              <div className="networkStageRow">
                <span>Status</span>
                <strong>{networkStage.running ? 'Ready' : 'Offline'}</strong>
              </div>
              <div className="networkStageRow">
                <span>Tablet clients</span>
                <strong>{networkStage.clientCount}</strong>
              </div>
              {networkStage.urls.length ? (
                <div className="networkStageLinks">
                  {networkStage.urls.map((url, index) => (
                    <div className="networkStageLink" key={url}>
                      <div className="networkStageUrl" title={url}>{url}</div>
                      <button
                        className="networkStageCopy"
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(url).catch(() => undefined)}
                      >
                        Copy {networkStage.urls.length > 1 ? 'Link ' + (index + 1) : 'Stage Link'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="networkStageHint">
                  {networkStage.error || 'Connect the laptop to a local network to expose a tablet Stage address.'}
                </div>
              )}
            </div>
          </section>

          <section className="insSec">
            <div className="panelTitle">OUTPUT LAYERS</div>
            <div className="layers">
              {[
                ['Slide', Boolean(output.slide)],
                ['Media', Boolean(output.media)],
                ['Props', Boolean(output.prop)],
                ['Messages', Boolean(output.message)],
                ['Announcements', Boolean(output.announcement)],
                ['Audio', Boolean(output.audio)],
                ['Live Video', Boolean(output.liveVideo)],
              ].map(([name, on]) => (
                <div className="layer" key={String(name)}>
                  <span>{String(name)}</span>
                  <span className={`led ${on ? 'on' : ''}`} />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>

      <section className="media">
        <div className="mediaHead">
          <div className="tabs">
            <button className="tab active" type="button">Media</button>
            <button className="tab" type="button">Audio</button>
            <button className="tab" type="button">Stage</button>
            <button className="tab" type="button">Timers</button>
            <button className="tab" type="button">Messages</button>
          </div>
          <span className="mediaHint">Future: local files + downloader provider</span>
        </div>
        <div className="mediaContent">
          <div className="mediaSide">
            <div className="sourceTitle">MEDIA BIN</div>
            <button className="source sel" type="button">All Media</button>
            <button className="source" type="button">Backgrounds</button>
            <button className="source" type="button">Kids Church</button>
          </div>
          <div className="mediaItems">
            {mediaAssets.map((asset) => (
              <button
                className={`mediaItem ${output.media?.id === asset.id ? 'live' : ''}`}
                key={asset.id}
                type="button"
                onClick={() => triggerMedia(asset)}
              >
                <div className="mediaThumb" />
                <span>{asset.title}</span>
                <small>{asset.kind}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="status">
        <span>KidsChurch Presenter v0.2.1 alpha</span>
        <span>Sunday Kids • Multi-output Foundation</span>
        <span>
          <i className={`dot ${screenVisibility.audience ? 'on' : ''}`} /> Audience
          &nbsp;&nbsp;
          <i className={`dot ${screenVisibility.stage ? 'on' : ''}`} /> Stage
        </span>
      </footer>

      <div className={`overlay ${searchOpen ? 'open' : ''}`} onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
        if (event.currentTarget === event.target) setSearchOpen(false);
      }}>
        <div className="searchBox">
          <div className="searchInput">
            <span>⌕</span>
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
              placeholder="Search library…"
            />
          </div>
          <div className="results">
            {searchResults.map((presentation) => (
              <button key={presentation.id} type="button" onClick={() => selectPresentationFromSearch(presentation.id)}>
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
