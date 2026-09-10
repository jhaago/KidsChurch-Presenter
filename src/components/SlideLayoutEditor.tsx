import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  resolveSlideFormat,
  resolveSlideLayout,
} from '../domain/themes';
import type {
  MediaAsset,
  Presentation,
  Slide,
  SlideBoxLayout,
} from '../domain/types';
import { Icon } from './ui/Icon';

interface SlideLayoutEditorProps {
  presentation: Presentation;
  selectedSlideId: string | null;
  availableAssets: MediaAsset[];
  defaultBackgroundAssetId?: string;
  onChange: (presentation: Presentation) => void;
  onSelectSlide: (slideId: string) => void;
}

interface SourceSlide {
  slide: Slide;
  groupId: string;
  groupName: string;
  index: number;
}

type ResizeHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se';

interface DragState {
  pointerId: number;
  handle: ResizeHandle;
  startClientX: number;
  startClientY: number;
  startLayout: SlideBoxLayout;
  startPresentation: Presentation;
}

function flattenSlides(presentation: Presentation): SourceSlide[] {
  let index = 0;
  return presentation.groups.flatMap((group) =>
    group.slides.map((slide) => ({
      slide,
      groupId: group.id,
      groupName: group.name,
      index: ++index,
    })),
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

function updateSlide(
  presentation: Presentation,
  slideId: string,
  updater: (slide: Slide) => Slide,
) {
  return {
    ...presentation,
    groups: presentation.groups.map((group) => ({
      ...group,
      slides: group.slides.map((slide) => slide.id === slideId ? updater(slide) : slide),
    })),
  };
}

function alignItems(textAlign: 'left' | 'center' | 'right') {
  if (textAlign === 'left') return 'flex-start';
  if (textAlign === 'right') return 'flex-end';
  return 'center';
}

function justifyContent(verticalAlign: 'top' | 'middle' | 'bottom') {
  if (verticalAlign === 'top') return 'flex-start';
  if (verticalAlign === 'bottom') return 'flex-end';
  return 'center';
}

export function SlideLayoutEditor({
  presentation,
  selectedSlideId,
  availableAssets,
  defaultBackgroundAssetId,
  onChange,
  onSelectSlide,
}: SlideLayoutEditorProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pastRef = useRef<Presentation[]>([]);
  const futureRef = useRef<Presentation[]>([]);
  const lastMergeRef = useRef<{ key: string; at: number } | null>(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [showSafeArea, setShowSafeArea] = useState(true);

  const slides = useMemo(() => flattenSlides(presentation), [presentation]);
  const selected = slides.find((item) => item.slide.id === selectedSlideId) ?? slides[0];

  useEffect(() => {
    pastRef.current = [];
    futureRef.current = [];
    lastMergeRef.current = null;
    dragRef.current = null;
    setHistoryRevision((value) => value + 1);
  }, [presentation.id]);

  useEffect(() => {
    if (!selectedSlideId && slides[0]) onSelectSlide(slides[0].slide.id);
  }, [onSelectSlide, selectedSlideId, slides]);

  if (!selected) {
    return (
      <section className="slideLayoutEditor">
        <div className="layoutEmpty">No slides are available to lay out.</div>
      </section>
    );
  }

  const format = resolveSlideFormat(presentation, selected.slide);
  const layout = resolveSlideLayout(presentation, selected.slide);
  const backgroundId = selected.slide.backgroundAssetId === null
    ? undefined
    : selected.slide.backgroundAssetId ??
      presentation.backgroundAssetId ??
      defaultBackgroundAssetId;
  const background = backgroundId
    ? availableAssets.find((asset) => asset.id === backgroundId)
    : undefined;
  const hasSlideOverride = Boolean(selected.slide.layout);
  const hasPresentationLayout = Boolean(presentation.layout);
  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  void historyRevision;

  const commit = (next: Presentation, mergeKey?: string) => {
    const now = Date.now();
    const last = lastMergeRef.current;
    const merge = Boolean(mergeKey) && last?.key === mergeKey && Boolean(last && now - last.at < 500);

    if (!merge) {
      pastRef.current.push(structuredClone(presentation));
      if (pastRef.current.length > 60) pastRef.current.shift();
    }

    futureRef.current = [];
    lastMergeRef.current = mergeKey ? { key: mergeKey, at: now } : null;
    setHistoryRevision((value) => value + 1);
    onChange(next);
  };

  const undo = () => {
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current.push(structuredClone(presentation));
    lastMergeRef.current = null;
    setHistoryRevision((value) => value + 1);
    onChange(previous);
  };

  const redo = () => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(structuredClone(presentation));
    lastMergeRef.current = null;
    setHistoryRevision((value) => value + 1);
    onChange(next);
  };

  const setSlideLayout = (nextLayout: SlideBoxLayout, mergeKey?: string) => {
    commit(
      updateSlide(presentation, selected.slide.id, (slide) => ({
        ...slide,
        layout: {
          xPercent: rounded(nextLayout.xPercent),
          yPercent: rounded(nextLayout.yPercent),
          widthPercent: rounded(nextLayout.widthPercent),
          heightPercent: rounded(nextLayout.heightPercent),
        },
      })),
      mergeKey,
    );
  };

  const setLayoutWithoutHistory = (base: Presentation, nextLayout: SlideBoxLayout) => {
    onChange(updateSlide(base, selected.slide.id, (slide) => ({
      ...slide,
      layout: {
        xPercent: rounded(nextLayout.xPercent),
        yPercent: rounded(nextLayout.yPercent),
        widthPercent: rounded(nextLayout.widthPercent),
        heightPercent: rounded(nextLayout.heightPercent),
      },
    })));
  };

  const beginGesture = (event: ReactPointerEvent<HTMLElement>, handle: ResizeHandle) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLayout: layout,
      startPresentation: structuredClone(presentation),
    };
    lastMergeRef.current = null;
    canvasRef.current?.focus();
  };

  const moveGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !canvas) return;

    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const dx = ((event.clientX - drag.startClientX) / bounds.width) * 100;
    const dy = ((event.clientY - drag.startClientY) / bounds.height) * 100;
    const start = drag.startLayout;
    let left = start.xPercent;
    let top = start.yPercent;
    let right = start.xPercent + start.widthPercent;
    let bottom = start.yPercent + start.heightPercent;

    if (drag.handle === 'move') {
      left = clamp(start.xPercent + dx, 0, 100 - start.widthPercent);
      top = clamp(start.yPercent + dy, 0, 100 - start.heightPercent);
      right = left + start.widthPercent;
      bottom = top + start.heightPercent;
    } else {
      if (drag.handle.includes('w')) left = clamp(start.xPercent + dx, 0, right - 10);
      if (drag.handle.includes('e')) right = clamp(right + dx, left + 10, 100);
      if (drag.handle.includes('n')) top = clamp(start.yPercent + dy, 0, bottom - 8);
      if (drag.handle.includes('s')) bottom = clamp(bottom + dy, top + 8, 100);
    }

    setLayoutWithoutHistory(drag.startPresentation, {
      xPercent: left,
      yPercent: top,
      widthPercent: right - left,
      heightPercent: bottom - top,
    });
  };

  const endGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    pastRef.current.push(drag.startPresentation);
    if (pastRef.current.length > 60) pastRef.current.shift();
    futureRef.current = [];
    setHistoryRevision((value) => value + 1);
  };

  const nudge = (dx: number, dy: number) => {
    setSlideLayout({
      ...layout,
      xPercent: clamp(layout.xPercent + dx, 0, 100 - layout.widthPercent),
      yPercent: clamp(layout.yPercent + dy, 0, 100 - layout.heightPercent),
    }, 'layout-nudge');
  };

  const setGeometryField = (key: keyof SlideBoxLayout, value: number) => {
    if (!Number.isFinite(value)) return;
    const next = { ...layout, [key]: value };

    next.widthPercent = clamp(next.widthPercent, 10, 100 - next.xPercent);
    next.heightPercent = clamp(next.heightPercent, 8, 100 - next.yPercent);
    next.xPercent = clamp(next.xPercent, 0, 100 - next.widthPercent);
    next.yPercent = clamp(next.yPercent, 0, 100 - next.heightPercent);

    setSlideLayout(next, `geometry:${key}`);
  };

  const resetSlide = () => {
    commit(updateSlide(presentation, selected.slide.id, (slide) => ({
      ...slide,
      layout: undefined,
    })));
  };

  const applyToPresentation = () => {
    const nextLayout = { ...layout };
    commit({
      ...updateSlide(presentation, selected.slide.id, (slide) => ({ ...slide, layout: undefined })),
      layout: nextLayout,
    });
  };

  const resetPresentation = () => {
    commit({ ...presentation, layout: undefined });
  };

  const centerHorizontal = () => setSlideLayout({
    ...layout,
    xPercent: (100 - layout.widthPercent) / 2,
  });

  const centerVertical = () => setSlideLayout({
    ...layout,
    yPercent: (100 - layout.heightPercent) / 2,
  });

  return (
    <section className="slideLayoutEditor" data-presenter-editor="true">
      <header className="layoutEditorHeader">
        <div>
          <Icon name="grid" />
          <div>
            <strong>SLIDE LAYOUT</strong>
            <span>16:9 visual canvas · drag the text box · resize from the corners</span>
          </div>
        </div>
        <div className="layoutHeaderActions">
          <button type="button" disabled={!canUndo} onClick={undo}>↶ Undo</button>
          <button type="button" disabled={!canRedo} onClick={redo}>↷ Redo</button>
          <label>
            <input
              type="checkbox"
              checked={showSafeArea}
              onChange={(event) => setShowSafeArea(event.target.checked)}
            />
            Safe Area
          </label>
        </div>
      </header>

      <div className="layoutEditorBody">
        <aside className="layoutSlideList">
          <header>SLIDES</header>
          <div>
            {slides.map((item) => (
              <button
                className={item.slide.id === selected.slide.id ? 'isSelected' : ''}
                key={item.slide.id}
                type="button"
                onClick={() => onSelectSlide(item.slide.id)}
              >
                <span>{item.index}</span>
                <div>
                  <strong>{item.groupName}</strong>
                  <small>{item.slide.text.replace(/\n/g, ' / ')}</small>
                </div>
                {item.slide.layout ? <em>BOX</em> : null}
              </button>
            ))}
          </div>
        </aside>

        <main className="layoutCanvasArea">
          <div className="layoutCanvasStage">
            <div
              className="layoutCanvas"
              ref={canvasRef}
              tabIndex={0}
              onPointerMove={moveGesture}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
              onKeyDown={(event) => {
                if (event.key.startsWith('Arrow')) {
                  event.preventDefault();
                  event.stopPropagation();
                  const step = event.shiftKey ? 2 : 0.5;
                  if (event.key === 'ArrowLeft') nudge(-step, 0);
                  if (event.key === 'ArrowRight') nudge(step, 0);
                  if (event.key === 'ArrowUp') nudge(0, -step);
                  if (event.key === 'ArrowDown') nudge(0, step);
                } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
                  event.preventDefault();
                  if (event.shiftKey) redo();
                  else undo();
                } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
                  event.preventDefault();
                  redo();
                }
              }}
            >
              {background?.fileUrl && background.kind === 'still' ? (
                <img className="layoutCanvasBackground" src={background.fileUrl} alt="" />
              ) : background?.fileUrl && background.kind === 'motion' ? (
                <video className="layoutCanvasBackground" src={background.fileUrl} muted loop autoPlay playsInline />
              ) : (
                <div className="layoutCanvasFallback" />
              )}

              {showSafeArea ? <div className="layoutSafeArea" aria-hidden="true" /> : null}

              <div
                className="layoutTextBox"
                style={{
                  left: `${layout.xPercent}%`,
                  top: `${layout.yPercent}%`,
                  width: `${layout.widthPercent}%`,
                  height: `${layout.heightPercent}%`,
                  alignItems: alignItems(format.textAlign),
                  justifyContent: justifyContent(format.verticalAlign),
                  color: format.textColor,
                  fontFamily: format.fontFamily,
                  fontWeight: format.fontWeight,
                  fontSize: `${format.fontSizeVw}cqw`,
                  lineHeight: format.lineHeight,
                  textAlign: format.textAlign,
                  textShadow: format.shadow ? '0 2px 8px rgba(0,0,0,.9)' : 'none',
                  textTransform: format.uppercase ? 'uppercase' : 'none',
                }}
                onPointerDown={(event) => beginGesture(event, 'move')}
              >
                <div className="layoutTextContent">
                  {selected.slide.text.split('\n').map((line, index) => (
                    <span key={`${selected.slide.id}:${index}`}>{line || ' '}</span>
                  ))}
                </div>
                <i className="layoutHandle handle-nw" onPointerDown={(event) => beginGesture(event, 'nw')} />
                <i className="layoutHandle handle-ne" onPointerDown={(event) => beginGesture(event, 'ne')} />
                <i className="layoutHandle handle-sw" onPointerDown={(event) => beginGesture(event, 'sw')} />
                <i className="layoutHandle handle-se" onPointerDown={(event) => beginGesture(event, 'se')} />
                <span className="layoutBoxTag">TEXT</span>
              </div>
            </div>
          </div>
          <div className="layoutCanvasHint">
            Drag = move · corner handles = resize · Arrow keys = 0.5% nudge · Shift+Arrow = 2%
          </div>
        </main>

        <aside className="layoutInspector">
          <header>
            <strong>TEXT BOX</strong>
            <span>{hasSlideOverride ? 'Slide Override' : hasPresentationLayout ? 'Presentation Layout' : 'Theme / Margin Default'}</span>
          </header>

          <div className="layoutGeometry">
            {([
              ['xPercent', 'X'],
              ['yPercent', 'Y'],
              ['widthPercent', 'W'],
              ['heightPercent', 'H'],
            ] as const).map(([key, label]) => (
              <label key={key}>
                <span>{label} %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={layout[key]}
                  onChange={(event) => setGeometryField(key, Number(event.target.value))}
                />
              </label>
            ))}
          </div>

          <div className="layoutQuickActions">
            <button type="button" onClick={centerHorizontal}>Centre Horizontally</button>
            <button type="button" onClick={centerVertical}>Centre Vertically</button>
          </div>

          <section className="layoutInheritance">
            <strong>LAYOUT INHERITANCE</strong>
            <p>
              A slide normally inherits the presentation box. Moving/resizing creates a slide-specific override.
            </p>
            <button type="button" onClick={applyToPresentation}>
              Apply This Box to Presentation
            </button>
            <button type="button" disabled={!hasSlideOverride} onClick={resetSlide}>
              Reset Slide to Presentation
            </button>
            <button type="button" disabled={!hasPresentationLayout} onClick={resetPresentation}>
              Reset Presentation Layout
            </button>
          </section>

          <section className="layoutSelectedInfo">
            <strong>{selected.groupName} · Slide {selected.index}</strong>
            <span>{selected.slide.text.replace(/\n/g, ' / ')}</span>
            <small>
              Text styling remains in Edit. This canvas controls the position and size of the text box.
            </small>
          </section>
        </aside>
      </div>
    </section>
  );
}
