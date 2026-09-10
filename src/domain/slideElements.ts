import { resolveSlideFormat, resolveSlideLayout } from './themes';
import type {
  LiveSlideElement,
  MediaAsset,
  Presentation,
  PresentationTheme,
  Slide,
  SlideBoxLayout,
  SlideElement,
  SlideTextFormat,
} from './types';

export const PRIMARY_SLIDE_ELEMENT_ID = '__primary__';

export function clampElementLayout(layout: SlideBoxLayout): SlideBoxLayout {
  const widthPercent = Math.min(100, Math.max(5, layout.widthPercent));
  const heightPercent = Math.min(100, Math.max(5, layout.heightPercent));
  const xPercent = Math.min(Math.max(0, layout.xPercent), Math.max(0, 100 - widthPercent));
  const yPercent = Math.min(Math.max(0, layout.yPercent), Math.max(0, 100 - heightPercent));
  return {
    xPercent,
    yPercent,
    widthPercent: Math.min(widthPercent, 100 - xPercent),
    heightPercent: Math.min(heightPercent, 100 - yPercent),
  };
}

export function normalizedLayerOrder(slide: Slide) {
  const elementIds = slide.elements?.map((element) => element.id) ?? [];
  const valid = new Set([PRIMARY_SLIDE_ELEMENT_ID, ...elementIds]);
  const requested = slide.layerOrder?.filter((id, index, order) =>
    valid.has(id) && order.indexOf(id) === index,
  ) ?? [];
  const missing = [PRIMARY_SLIDE_ELEMENT_ID, ...elementIds].filter((id) => !requested.includes(id));
  return [...requested, ...missing];
}

export function resolveSupplementalTextFormat(
  presentation: Presentation,
  element: Extract<SlideElement, { type: 'text' }>,
  customThemes: PresentationTheme[] = [],
): SlideTextFormat {
  return {
    ...resolveSlideFormat(presentation, undefined, customThemes),
    ...element.format,
  };
}

export function resolveSlideElements(
  presentation: Presentation,
  slide: Slide,
  customThemes: PresentationTheme[] = [],
  assets: MediaAsset[] = [],
): LiveSlideElement[] {
  const primary: LiveSlideElement = {
    id: PRIMARY_SLIDE_ELEMENT_ID,
    type: 'text',
    name: 'Primary Text',
    text: slide.text,
    layout: resolveSlideLayout(presentation, slide, customThemes),
    format: resolveSlideFormat(presentation, slide, customThemes),
    opacity: 1,
  };

  const extras: LiveSlideElement[] = (slide.elements ?? []).map((element) => {
    if (element.type === 'text') {
      return {
        id: element.id,
        type: 'text',
        name: element.name,
        text: element.text,
        layout: clampElementLayout(element.layout),
        format: resolveSupplementalTextFormat(presentation, element, customThemes),
        opacity: element.opacity ?? 1,
      };
    }

    if (element.type === 'image') {
      const asset = element.assetId
        ? assets.find((candidate) => candidate.id === element.assetId)
        : undefined;
      return {
        id: element.id,
        type: 'image',
        name: element.name,
        assetId: element.assetId,
        fileUrl: asset?.fileUrl,
        layout: clampElementLayout(element.layout),
        fit: element.fit,
        opacity: element.opacity ?? 1,
      };
    }

    return {
      id: element.id,
      type: 'shape',
      name: element.name,
      shape: element.shape,
      layout: clampElementLayout(element.layout),
      fillColor: element.fillColor,
      borderColor: element.borderColor,
      borderWidth: element.borderWidth,
      opacity: element.opacity ?? 1,
    };
  });

  const byId = new Map<string, LiveSlideElement>([
    [PRIMARY_SLIDE_ELEMENT_ID, primary],
    ...extras.map((element) => [element.id, element] as const),
  ]);

  return normalizedLayerOrder(slide)
    .map((id) => byId.get(id))
    .filter((element): element is LiveSlideElement => Boolean(element));
}

export function createTextElement(name = 'Text Box'): Extract<SlideElement, { type: 'text' }> {
  return {
    id: `element-${crypto.randomUUID()}`,
    type: 'text',
    name,
    text: 'NEW TEXT',
    layout: {
      xPercent: 20,
      yPercent: 20,
      widthPercent: 60,
      heightPercent: 24,
    },
    opacity: 1,
  };
}

export function createImageElement(
  assetId?: string,
  name = 'Image',
): Extract<SlideElement, { type: 'image' }> {
  return {
    id: `element-${crypto.randomUUID()}`,
    type: 'image',
    name,
    assetId,
    layout: {
      xPercent: 30,
      yPercent: 22,
      widthPercent: 40,
      heightPercent: 40,
    },
    fit: 'contain',
    opacity: 1,
  };
}

export function createShapeElement(
  shape: 'rectangle' | 'ellipse' = 'rectangle',
  name = shape === 'ellipse' ? 'Ellipse' : 'Rectangle',
): Extract<SlideElement, { type: 'shape' }> {
  return {
    id: `element-${crypto.randomUUID()}`,
    type: 'shape',
    name,
    shape,
    layout: {
      xPercent: 30,
      yPercent: 30,
      widthPercent: 40,
      heightPercent: 24,
    },
    fillColor: '#24445b',
    borderColor: '#ffffff',
    borderWidth: 0,
    opacity: 0.75,
  };
}

export function duplicateSlideElement(element: SlideElement): SlideElement {
  return {
    ...structuredClone(element),
    id: `element-${crypto.randomUUID()}`,
    name: `${element.name} Copy`,
    layout: clampElementLayout({
      ...element.layout,
      xPercent: element.layout.xPercent + 2,
      yPercent: element.layout.yPercent + 2,
    }),
  };
}
