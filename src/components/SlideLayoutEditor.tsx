import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  PRIMARY_SLIDE_ELEMENT_ID,
  createImageElement,
  createTextElement,
  duplicateSlideElement,
  normalizedLayerOrder,
  resolveSlideElements,
} from '../domain/slideElements';
import {
  resolveSlideFormat,
  resolveSlideLayout,
} from '../domain/themes';
import type {
  LiveSlideElement,
  MediaAsset,
  Presentation,
  PresentationTheme,
  Slide,
  SlideBoxLayout,
  SlideElement,
  SlideTextFormat,
} from '../domain/types';
import { Icon } from './ui/Icon';

interface SlideLayoutEditorProps {
  presentation: Presentation;
  selectedSlideId: string | null;
  availableAssets: MediaAsset[];
  defaultBackgroundAssetId?: string;
  customThemes: PresentationTheme[];
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
  elementId: string;
  handle: ResizeHandle;
  startClientX: number;
  startClientY: number;
  startLayout: SlideBoxLayout;
  startPresentation: Presentation;
}

const fontOptions = [
  'Arial, Helvetica, sans-serif',
  'Arial Black, Arial, Helvetica, sans-serif',
  'Segoe UI, Arial, Helvetica, sans-serif',
  'Verdana, Arial, Helvetica, sans-serif',
  'Trebuchet MS, Arial, Helvetica, sans-serif',
  'Georgia, Times New Roman, serif',
];

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

function clampOpacity(value: number) {
  return Math.min(1, Math.max(0.05, value));
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

function updateExtraElement(
  slide: Slide,
  elementId: string,
  updater: (element: SlideElement) => SlideElement,
): Slide {
  return {
    ...slide,
    elements: (slide.elements ?? []).map((element) =>
      element.id === elementId ? updater(element) : element,
    ),
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

function nextLayerOrder(slide: Slide, elementId: string, direction: -1 | 1) {
  const order = normalizedLayerOrder(slide);
  const index = order.indexOf(elementId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return order;
  const next = [...order];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

function resolvedElementName(element: LiveSlideElement) {
  return element.id === PRIMARY_SLIDE_ELEMENT_ID ? 'Primary Text' : element.name;
}

export function SlideLayoutEditor({
  presentation,
  selectedSlideId,
  availableAssets,
  defaultBackgroundAssetId,
  customThemes,
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
  const [selectedElementId, setSelectedElementId] = useState(PRIMARY_SLIDE_ELEMENT_ID);

  const slides = useMemo(() => flattenSlides(presentation), [presentation]);
  const selected = slides.find((item) => item.slide.id === selectedSlideId) ?? slides[0];

  useEffect(() => {
    pastRef.current = [];
    futureRef.current = [];
    lastMergeRef.current = null;
    dragRef.current = null;
    setSelectedElementId(PRIMARY_SLIDE_ELEMENT_ID);
    setHistoryRevision((value) => value + 1);
  }, [presentation.id]);

  useEffect(() => {
    if (!selectedSlideId && slides[0]) onSelectSlide(slides[0].slide.id);
  }, [onSelectSlide, selectedSlideId, slides]);

  useEffect(() => {
    setSelectedElementId(PRIMARY_SLIDE_ELEMENT_ID);
  }, [selected?.slide.id]);

  if (!selected) {
    return (
      <section className="slideLayoutEditor">
        <div className="layoutEmpty">No slides are available to lay out.</div>
      </section>
    );
  }

  const resolvedElements = resolveSlideElements(
    presentation,
    selected.slide,
    customThemes,
    availableAssets,
  );
  const selectedElement =
    resolvedElements.find((element) => element.id === selectedElementId) ??
    resolvedElements.find((element) => element.id === PRIMARY_SLIDE_ELEMENT_ID) ??
    resolvedElements[0];
  const selectedRawElement =
    selectedElement?.id === PRIMARY_SLIDE_ELEMENT_ID
      ? undefined
      : selected.slide.elements?.find((element) => element.id === selectedElement?.id);

  const backgroundId = selected.slide.backgroundAssetId === null
    ? undefined
    : selected.slide.backgroundAssetId ??
      presentation.backgroundAssetId ??
      defaultBackgroundAssetId;
  const background = backgroundId
    ? availableAssets.find((asset) => asset.id === backgroundId)
    : undefined;
  const stillAssets = availableAssets.filter((asset) => asset.kind === 'still');
  const hasSlideOverride = Boolean(selected.slide.layout);
  const hasPresentationLayout = Boolean(presentation.layout);
  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  const isPrimary = selectedElement?.id === PRIMARY_SLIDE_ELEMENT_ID;
  const layout = selectedElement?.layout ?? resolveSlideLayout(presentation, selected.slide, customThemes);
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

  const setElementLayout = (
    elementId: string,
    nextLayout: SlideBoxLayout,
    mergeKey?: string,
  ) => {
    const roundedLayout = {
      xPercent: rounded(nextLayout.xPercent),
      yPercent: rounded(nextLayout.yPercent),
      widthPercent: rounded(nextLayout.widthPercent),
      heightPercent: rounded(nextLayout.heightPercent),
    };

    commit(
      updateSlide(presentation, selected.slide.id, (slide) => {
        if (elementId === PRIMARY_SLIDE_ELEMENT_ID) {
          return { ...slide, layout: roundedLayout };
        }
        return updateExtraElement(slide, elementId, (element) => ({
          ...element,
          layout: roundedLayout,
        }));
      }),
      mergeKey,
    );
  };

  const setLayoutWithoutHistory = (
    base: Presentation,
    elementId: string,
    nextLayout: SlideBoxLayout,
  ) => {
    const roundedLayout = {
      xPercent: rounded(nextLayout.xPercent),
      yPercent: rounded(nextLayout.yPercent),
      widthPercent: rounded(nextLayout.widthPercent),
      heightPercent: rounded(nextLayout.heightPercent),
    };
    onChange(updateSlide(base, selected.slide.id, (slide) => {
      if (elementId === PRIMARY_SLIDE_ELEMENT_ID) {
        return { ...slide, layout: roundedLayout };
      }
      return updateExtraElement(slide, elementId, (element) => ({
        ...element,
        layout: roundedLayout,
      }));
    }));
  };

  const beginGesture = (
    event: ReactPointerEvent<HTMLElement>,
    element: LiveSlideElement,
    handle: ResizeHandle,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedElementId(element.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      elementId: element.id,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLayout: element.layout,
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
      if (drag.handle.includes('w')) left = clamp(start.xPercent + dx, 0, right - 5);
      if (drag.handle.includes('e')) right = clamp(right + dx, left + 5, 100);
      if (drag.handle.includes('n')) top = clamp(start.yPercent + dy, 0, bottom - 5);
      if (drag.handle.includes('s')) bottom = clamp(bottom + dy, top + 5, 100);
    }

    setLayoutWithoutHistory(drag.startPresentation, drag.elementId, {
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
    if (!selectedElement) return;
    setElementLayout(selectedElement.id, {
      ...selectedElement.layout,
      xPercent: clamp(
        selectedElement.layout.xPercent + dx,
        0,
        100 - selectedElement.layout.widthPercent,
      ),
      yPercent: clamp(
        selectedElement.layout.yPercent + dy,
        0,
        100 - selectedElement.layout.heightPercent,
      ),
    }, `layout-nudge:${selectedElement.id}`);
  };

  const setGeometryField = (key: keyof SlideBoxLayout, value: number) => {
    if (!selectedElement || !Number.isFinite(value)) return;
    const next = { ...selectedElement.layout, [key]: value };

    next.widthPercent = clamp(next.widthPercent, 5, 100 - next.xPercent);
    next.heightPercent = clamp(next.heightPercent, 5, 100 - next.yPercent);
    next.xPercent = clamp(next.xPercent, 0, 100 - next.widthPercent);
    next.yPercent = clamp(next.yPercent, 0, 100 - next.heightPercent);

    setElementLayout(selectedElement.id, next, `geometry:${selectedElement.id}:${key}`);
  };

  const addText = () => {
    const element = createTextElement();
    commit(updateSlide(presentation, selected.slide.id, (slide) => ({
      ...slide,
      elements: [...(slide.elements ?? []), element],
      layerOrder: [...normalizedLayerOrder(slide), element.id],
    })));
    setSelectedElementId(element.id);
  };

  const addImage = () => {
    const asset = stillAssets[0];
    if (!asset) {
      window.alert('Add a still-image resource folder before inserting an image element.');
      return;
    }
    const element = createImageElement(asset.id, asset.title);
    commit(updateSlide(presentation, selected.slide.id, (slide) => ({
      ...slide,
      elements: [...(slide.elements ?? []), element],
      layerOrder: [...normalizedLayerOrder(slide), element.id],
    })));
    setSelectedElementId(element.id);
  };

  const duplicateSelectedElement = () => {
    if (!selectedElement) return;
    let element: SlideElement;
    if (isPrimary) {
      const format = resolveSlideFormat(presentation, selected.slide, customThemes);
      element = {
        ...createTextElement('Primary Text Copy'),
        text: selected.slide.text,
        layout: { ...selectedElement.layout },
        format: { ...format },
      };
    } else if (selectedRawElement) {
      element = duplicateSlideElement(selectedRawElement);
    } else {
      return;
    }

    commit(updateSlide(presentation, selected.slide.id, (slide) => ({
      ...slide,
      elements: [...(slide.elements ?? []), element],
      layerOrder: [...normalizedLayerOrder(slide), element.id],
    })));
    setSelectedElementId(element.id);
  };

  const deleteSelectedElement = () => {
    if (!selectedElement || isPrimary) return;
    commit(updateSlide(presentation, selected.slide.id, (slide) => ({
      ...slide,
      elements: (slide.elements ?? []).filter((element) => element.id !== selectedElement.id),
      layerOrder: normalizedLayerOrder(slide).filter((id) => id !== selectedElement.id),
    })));
    setSelectedElementId(PRIMARY_SLIDE_ELEMENT_ID);
  };

  const moveLayer = (direction: -1 | 1) => {
    if (!selectedElement) return;
    commit(updateSlide(presentation, selected.slide.id, (slide) => ({
      ...slide,
      layerOrder: nextLayerOrder(slide, selectedElement.id, direction),
    })));
  };

  const resetPrimarySlide = () => {
    if (!isPrimary) return;
    commit(updateSlide(presentation, selected.slide.id, (slide) => ({
      ...slide,
      layout: undefined,
    })));
  };

  const applyPrimaryToPresentation = () => {
    if (!isPrimary) return;
    const nextLayout = { ...layout };
    commit({
      ...updateSlide(presentation, selected.slide.id, (slide) => ({ ...slide, layout: undefined })),
      layout: nextLayout,
    });
  };

  const resetPresentation = () => {
    if (!isPrimary) return;
    commit({ ...presentation, layout: undefined });
  };

  const centerHorizontal = () => {
    if (!selectedElement) return;
    setElementLayout(selectedElement.id, {
      ...selectedElement.layout,
      xPercent: (100 - selectedElement.layout.widthPercent) / 2,
    });
  };

  const centerVertical = () => {
    if (!selectedElement) return;
    setElementLayout(selectedElement.id, {
      ...selectedElement.layout,
      yPercent: (100 - selectedElement.layout.heightPercent) / 2,
    });
  };

  const updateSelectedName = (name: string) => {
    if (!selectedElement || isPrimary) return;
    commit(
      updateSlide(presentation, selected.slide.id, (slide) =>
        updateExtraElement(slide, selectedElement.id, (element) => ({
          ...element,
          name,
        })),
      ),
      `element-name:${selectedElement.id}`,
    );
  };

  const updateSelectedText = (text: string) => {
    if (!selectedElement || selectedElement.type !== 'text') return;
    if (isPrimary) {
      commit(
        updateSlide(presentation, selected.slide.id, (slide) => ({ ...slide, text })),
        'primary-text',
      );
      return;
    }
    commit(
      updateSlide(presentation, selected.slide.id, (slide) =>
        updateExtraElement(slide, selectedElement.id, (element) =>
          element.type === 'text' ? { ...element, text } : element,
        ),
      ),
      `element-text:${selectedElement.id}`,
    );
  };

  const updateTextFormat = <K extends keyof SlideTextFormat>(
    key: K,
    value: SlideTextFormat[K],
  ) => {
    if (!selectedElement || selectedElement.type !== 'text') return;
    if (isPrimary) {
      commit(
        updateSlide(presentation, selected.slide.id, (slide) => ({
          ...slide,
          format: { ...slide.format, [key]: value },
        })),
        `primary-format:${String(key)}`,
      );
      return;
    }

    commit(
      updateSlide(presentation, selected.slide.id, (slide) =>
        updateExtraElement(slide, selectedElement.id, (element) =>
          element.type === 'text'
            ? { ...element, format: { ...element.format, [key]: value } }
            : element,
        ),
      ),
      `element-format:${selectedElement.id}:${String(key)}`,
    );
  };

  const resetSelectedTextFormat = () => {
    if (!selectedElement || selectedElement.type !== 'text') return;
    if (isPrimary) {
      commit(updateSlide(presentation, selected.slide.id, (slide) => ({
        ...slide,
        format: undefined,
      })));
      return;
    }
    commit(updateSlide(presentation, selected.slide.id, (slide) =>
      updateExtraElement(slide, selectedElement.id, (element) =>
        element.type === 'text' ? { ...element, format: undefined } : element,
      ),
    ));
  };

  const updateImageAsset = (assetId: string) => {
    if (!selectedElement || selectedElement.type !== 'image') return;
    const asset = stillAssets.find((candidate) => candidate.id === assetId);
    commit(updateSlide(presentation, selected.slide.id, (slide) =>
      updateExtraElement(slide, selectedElement.id, (element) =>
        element.type === 'image'
          ? { ...element, assetId, name: asset?.title ?? element.name }
          : element,
      ),
    ));
  };

  const updateImageFit = (fit: 'contain' | 'cover') => {
    if (!selectedElement || selectedElement.type !== 'image') return;
    commit(updateSlide(presentation, selected.slide.id, (slide) =>
      updateExtraElement(slide, selectedElement.id, (element) =>
        element.type === 'image' ? { ...element, fit } : element,
      ),
    ));
  };

  const updateOpacity = (opacity: number) => {
    if (!selectedElement || isPrimary) return;
    commit(
      updateSlide(presentation, selected.slide.id, (slide) =>
        updateExtraElement(slide, selectedElement.id, (element) => ({
          ...element,
          opacity: clampOpacity(opacity),
        })),
      ),
      `element-opacity:${selectedElement.id}`,
    );
  };

  const layerOrder = normalizedLayerOrder(selected.slide);
  const currentLayerIndex = selectedElement ? layerOrder.indexOf(selectedElement.id) : -1;

  return (
    <section className="slideLayoutEditor multiElementEditor" data-presenter-editor="true">
      <header className="layoutEditorHeader">
        <div>
          <Icon name="grid" />
          <div>
            <strong>SLIDE ELEMENTS</strong>
            <span>16:9 canvas · multiple text and image elements · drag, resize and reorder</span>
          </div>
        </div>
        <div className="layoutHeaderActions">
          <button type="button" disabled={!canUndo} onClick={undo}>↶ Undo</button>
          <button type="button" disabled={!canRedo} onClick={redo}>↷ Redo</button>
          <button className="layoutAddElement" type="button" onClick={addText}>＋ Text</button>
          <button className="layoutAddElement" type="button" onClick={addImage}>＋ Image</button>
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
                {(item.slide.elements?.length ?? 0) > 0 ? (
                  <em>{(item.slide.elements?.length ?? 0) + 1} EL</em>
                ) : item.slide.layout ? <em>BOX</em> : null}
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
                } else if (event.key === 'Delete' || event.key === 'Backspace') {
                  if (!isPrimary) {
                    event.preventDefault();
                    deleteSelectedElement();
                  }
                } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
                  event.preventDefault();
                  duplicateSelectedElement();
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

              {resolvedElements.map((element, elementIndex) => {
                const selectedNow = selectedElement?.id === element.id;
                const elementStyle = {
                  left: `${element.layout.xPercent}%`,
                  top: `${element.layout.yPercent}%`,
                  width: `${element.layout.widthPercent}%`,
                  height: `${element.layout.heightPercent}%`,
                  zIndex: elementIndex + 3,
                  opacity: element.opacity,
                };

                return (
                  <div
                    className={`layoutElementFrame ${selectedNow ? 'isSelected' : ''} type-${element.type}`}
                    key={element.id}
                    style={elementStyle}
                    onPointerDown={(event) => beginGesture(event, element, 'move')}
                  >
                    {element.type === 'text' ? (
                      <div
                        className="layoutElementText"
                        style={{
                          alignItems: alignItems(element.format.textAlign),
                          justifyContent: justifyContent(element.format.verticalAlign),
                          color: element.format.textColor,
                          fontFamily: element.format.fontFamily,
                          fontWeight: element.format.fontWeight,
                          fontSize: `${element.format.fontSizeVw}cqw`,
                          lineHeight: element.format.lineHeight,
                          textAlign: element.format.textAlign,
                          textShadow: element.format.shadow ? '0 2px 8px rgba(0,0,0,.9)' : 'none',
                          textTransform: element.format.uppercase ? 'uppercase' : 'none',
                        }}
                      >
                        <div>
                          {element.text.split('\n').map((line, index) => (
                            <span key={`${element.id}:${index}`}>{line || ' '}</span>
                          ))}
                        </div>
                      </div>
                    ) : element.fileUrl ? (
                      <img
                        className="layoutElementImage"
                        src={element.fileUrl}
                        alt=""
                        draggable={false}
                        style={{ objectFit: element.fit }}
                      />
                    ) : (
                      <div className="layoutElementImageMissing">Choose Image</div>
                    )}

                    {selectedNow ? (
                      <>
                        <i className="layoutHandle handle-nw" onPointerDown={(event) => beginGesture(event, element, 'nw')} />
                        <i className="layoutHandle handle-ne" onPointerDown={(event) => beginGesture(event, element, 'ne')} />
                        <i className="layoutHandle handle-sw" onPointerDown={(event) => beginGesture(event, element, 'sw')} />
                        <i className="layoutHandle handle-se" onPointerDown={(event) => beginGesture(event, element, 'se')} />
                        <span className="layoutBoxTag">
                          {element.type === 'text' ? 'TEXT' : 'IMAGE'} · {resolvedElementName(element)}
                        </span>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="layoutCanvasHint">
            Drag = move · corners = resize · Arrow = 0.5% · Shift+Arrow = 2% · Ctrl/Cmd+D = duplicate
          </div>
        </main>

        <aside className="layoutInspector multiElementInspector">
          <header>
            <strong>LAYERS</strong>
            <span>{resolvedElements.length} element{resolvedElements.length === 1 ? '' : 's'} on this slide</span>
          </header>

          <div className="layoutLayerList">
            {[...resolvedElements].reverse().map((element) => (
              <button
                className={selectedElement?.id === element.id ? 'isSelected' : ''}
                key={element.id}
                type="button"
                onClick={() => setSelectedElementId(element.id)}
              >
                <span>{element.type === 'text' ? 'T' : 'IMG'}</span>
                <div>
                  <strong>{resolvedElementName(element)}</strong>
                  <small>{element.type === 'text' ? element.text.replace(/\n/g, ' / ') : element.name}</small>
                </div>
                {element.id === PRIMARY_SLIDE_ELEMENT_ID ? <em>PRIMARY</em> : null}
              </button>
            ))}
          </div>

          {selectedElement ? (
            <>
              <section className="elementInspectorSection elementIdentity">
                <strong>SELECTED ELEMENT</strong>
                {isPrimary ? (
                  <div className="primaryElementName">Primary Text</div>
                ) : (
                  <input
                    aria-label="Element name"
                    value={selectedRawElement?.name ?? selectedElement.name}
                    onChange={(event) => updateSelectedName(event.target.value)}
                  />
                )}
                <div className="elementActionRow">
                  <button
                    type="button"
                    disabled={currentLayerIndex >= layerOrder.length - 1}
                    onClick={() => moveLayer(1)}
                  >
                    Forward
                  </button>
                  <button
                    type="button"
                    disabled={currentLayerIndex <= 0}
                    onClick={() => moveLayer(-1)}
                  >
                    Back
                  </button>
                  <button type="button" onClick={duplicateSelectedElement}>Duplicate</button>
                  <button
                    className="danger"
                    type="button"
                    disabled={isPrimary}
                    onClick={deleteSelectedElement}
                  >
                    Delete
                  </button>
                </div>
              </section>

              <section className="elementInspectorSection">
                <strong>GEOMETRY</strong>
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
              </section>

              {selectedElement.type === 'text' ? (
                <section className="elementInspectorSection">
                  <strong>TEXT</strong>
                  <textarea
                    className="elementTextEditor"
                    value={selectedElement.text}
                    onChange={(event) => updateSelectedText(event.target.value)}
                  />
                  <div className="elementTextControls">
                    <label className="wide">
                      <span>FONT</span>
                      <select
                        value={selectedElement.format.fontFamily}
                        onChange={(event) => updateTextFormat('fontFamily', event.target.value)}
                      >
                        {fontOptions.map((font) => (
                          <option value={font} key={font}>{font.split(',')[0]}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>SIZE</span>
                      <input
                        type="number"
                        min={1.5}
                        max={12}
                        step={0.1}
                        value={selectedElement.format.fontSizeVw}
                        onChange={(event) => updateTextFormat('fontSizeVw', Number(event.target.value))}
                      />
                    </label>
                    <label>
                      <span>WEIGHT</span>
                      <select
                        value={selectedElement.format.fontWeight}
                        onChange={(event) => updateTextFormat('fontWeight', Number(event.target.value))}
                      >
                        <option value={400}>Regular</option>
                        <option value={600}>Semi Bold</option>
                        <option value={700}>Bold</option>
                        <option value={800}>Extra Bold</option>
                      </select>
                    </label>
                    <label>
                      <span>LINE HEIGHT</span>
                      <input
                        type="number"
                        min={0.8}
                        max={2}
                        step={0.02}
                        value={selectedElement.format.lineHeight}
                        onChange={(event) => updateTextFormat('lineHeight', Number(event.target.value))}
                      />
                    </label>
                    <label>
                      <span>ALIGN</span>
                      <select
                        value={selectedElement.format.textAlign}
                        onChange={(event) => updateTextFormat('textAlign', event.target.value as SlideTextFormat['textAlign'])}
                      >
                        <option value="left">Left</option>
                        <option value="center">Centre</option>
                        <option value="right">Right</option>
                      </select>
                    </label>
                    <label>
                      <span>VERTICAL</span>
                      <select
                        value={selectedElement.format.verticalAlign}
                        onChange={(event) => updateTextFormat('verticalAlign', event.target.value as SlideTextFormat['verticalAlign'])}
                      >
                        <option value="top">Top</option>
                        <option value="middle">Middle</option>
                        <option value="bottom">Bottom</option>
                      </select>
                    </label>
                    <label>
                      <span>COLOUR</span>
                      <input
                        type="color"
                        value={selectedElement.format.textColor}
                        onChange={(event) => updateTextFormat('textColor', event.target.value)}
                      />
                    </label>
                    <label className="elementCheck">
                      <span>SHADOW</span>
                      <input
                        type="checkbox"
                        checked={selectedElement.format.shadow}
                        onChange={(event) => updateTextFormat('shadow', event.target.checked)}
                      />
                    </label>
                    <label className="elementCheck">
                      <span>UPPERCASE</span>
                      <input
                        type="checkbox"
                        checked={selectedElement.format.uppercase}
                        onChange={(event) => updateTextFormat('uppercase', event.target.checked)}
                      />
                    </label>
                  </div>
                  <button className="elementResetButton" type="button" onClick={resetSelectedTextFormat}>
                    Reset Text Style to Inherited
                  </button>
                </section>
              ) : (
                <section className="elementInspectorSection">
                  <strong>IMAGE</strong>
                  <label className="elementField">
                    <span>RESOURCE</span>
                    <select
                      value={selectedElement.assetId ?? ''}
                      onChange={(event) => updateImageAsset(event.target.value)}
                    >
                      {stillAssets.map((asset) => (
                        <option value={asset.id} key={asset.id}>{asset.title}</option>
                      ))}
                    </select>
                  </label>
                  <label className="elementField">
                    <span>FIT</span>
                    <select
                      value={selectedElement.fit}
                      onChange={(event) => updateImageFit(event.target.value as 'contain' | 'cover')}
                    >
                      <option value="contain">Contain</option>
                      <option value="cover">Cover / Crop</option>
                    </select>
                  </label>
                </section>
              )}

              {!isPrimary ? (
                <section className="elementInspectorSection">
                  <strong>ELEMENT OPACITY</strong>
                  <input
                    className="elementOpacityRange"
                    type="range"
                    min={5}
                    max={100}
                    step={1}
                    value={Math.round(selectedElement.opacity * 100)}
                    onChange={(event) => updateOpacity(Number(event.target.value) / 100)}
                  />
                  <span className="elementOpacityValue">{Math.round(selectedElement.opacity * 100)}%</span>
                </section>
              ) : null}

              {isPrimary ? (
                <section className="layoutInheritance elementInspectorSection">
                  <strong>PRIMARY TEXT INHERITANCE</strong>
                  <p>
                    Primary Text carries the Song/slide wording used by Stage and Auto Lyrics. Its box can inherit from the Presentation/Theme or override it on this slide.
                  </p>
                  <button type="button" onClick={applyPrimaryToPresentation}>
                    Apply This Box to Presentation
                  </button>
                  <button type="button" disabled={!hasSlideOverride} onClick={resetPrimarySlide}>
                    Reset Slide to Presentation
                  </button>
                  <button type="button" disabled={!hasPresentationLayout} onClick={resetPresentation}>
                    Reset Presentation Layout
                  </button>
                </section>
              ) : null}
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
