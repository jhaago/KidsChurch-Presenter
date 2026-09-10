import type { Presentation, PresentationTheme, Slide, SlideBoxLayout, SlideTextFormat } from './types';

export interface PresentationThemePreset extends PresentationTheme {
  description: string;
}

export const DEFAULT_SLIDE_LAYOUT: SlideBoxLayout = {
  xPercent: 12,
  yPercent: 12,
  widthPercent: 76,
  heightPercent: 76,
};

export const DEFAULT_SLIDE_FORMAT: SlideTextFormat = {
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSizeVw: 5.4,
  fontWeight: 680,
  lineHeight: 1.16,
  textAlign: 'center',
  verticalAlign: 'middle',
  textColor: '#ffffff',
  shadow: true,
  uppercase: false,
  marginPercent: 12,
};

export const PRESENTATION_THEMES: PresentationThemePreset[] = [
  {
    id: 'default',
    name: 'Presenter Default',
    description: 'Balanced centred text with a strong readable shadow.',
    format: { ...DEFAULT_SLIDE_FORMAT },
  },
  {
    id: 'bold-kids',
    name: 'Bold Kids',
    description: 'Large, heavy centred text for songs and high-energy slides.',
    format: {
      ...DEFAULT_SLIDE_FORMAT,
      fontFamily: 'Arial Black, Arial, Helvetica, sans-serif',
      fontSizeVw: 6.1,
      fontWeight: 800,
      lineHeight: 1.08,
      marginPercent: 10,
    },
  },
  {
    id: 'clean',
    name: 'Clean',
    description: 'Slightly smaller clean text with more breathing room.',
    format: {
      ...DEFAULT_SLIDE_FORMAT,
      fontFamily: 'Segoe UI, Arial, Helvetica, sans-serif',
      fontSizeVw: 4.8,
      fontWeight: 600,
      lineHeight: 1.22,
      marginPercent: 14,
    },
  },
  {
    id: 'scripture',
    name: 'Scripture',
    description: 'Left-aligned, calmer typography for longer Bible passages.',
    format: {
      ...DEFAULT_SLIDE_FORMAT,
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSizeVw: 4.2,
      fontWeight: 600,
      lineHeight: 1.28,
      textAlign: 'left',
      verticalAlign: 'middle',
      marginPercent: 11,
    },
  },
  {
    id: 'lower-third',
    name: 'Lower Third',
    description: 'Bottom-positioned text for titles, memory verses and names.',
    format: {
      ...DEFAULT_SLIDE_FORMAT,
      fontFamily: 'Segoe UI, Arial, Helvetica, sans-serif',
      fontSizeVw: 4.4,
      fontWeight: 700,
      verticalAlign: 'bottom',
      marginPercent: 8,
    },
  },
];

export function allPresentationThemes(customThemes: PresentationTheme[] = []) {
  return [...PRESENTATION_THEMES, ...customThemes];
}

export function themeById(themeId?: string, customThemes: PresentationTheme[] = []) {
  return allPresentationThemes(customThemes).find((theme) => theme.id === themeId) ?? PRESENTATION_THEMES[0];
}

export function isBuiltInTheme(themeId?: string) {
  return PRESENTATION_THEMES.some((theme) => theme.id === themeId);
}

export function resolveSlideFormat(
  presentation: Presentation,
  slide?: Slide,
  customThemes: PresentationTheme[] = [],
): SlideTextFormat {
  return {
    ...DEFAULT_SLIDE_FORMAT,
    ...themeById(presentation.themeId, customThemes).format,
    ...presentation.format,
    ...slide?.format,
  };
}

export function withTheme(presentation: Presentation, themeId: string): Presentation {
  return {
    ...presentation,
    themeId,
    format: undefined,
    layout: undefined,
  };
}


export function resolveBackgroundAssetId(presentation: Presentation, slide?: Slide) {
  if (slide?.backgroundAssetId === null) return undefined;
  return slide?.backgroundAssetId ?? presentation.backgroundAssetId;
}


function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function resolveSlideLayout(
  presentation: Presentation,
  slide?: Slide,
  customThemes: PresentationTheme[] = [],
): SlideBoxLayout {
  const format = resolveSlideFormat(presentation, slide, customThemes);
  const theme = themeById(presentation.themeId, customThemes);
  const margin = clamp(format.marginPercent, 0, 40);
  const derived: SlideBoxLayout = {
    xPercent: margin,
    yPercent: margin,
    widthPercent: Math.max(10, 100 - margin * 2),
    heightPercent: Math.max(8, 100 - margin * 2),
  };

  const merged = {
    ...DEFAULT_SLIDE_LAYOUT,
    ...derived,
    ...theme.layout,
    ...presentation.layout,
    ...slide?.layout,
  };

  const widthPercent = clamp(merged.widthPercent, 10, 100);
  const heightPercent = clamp(merged.heightPercent, 8, 100);
  const xPercent = clamp(merged.xPercent, 0, Math.max(0, 100 - widthPercent));
  const yPercent = clamp(merged.yPercent, 0, Math.max(0, 100 - heightPercent));

  return {
    xPercent,
    yPercent,
    widthPercent: Math.min(widthPercent, 100 - xPercent),
    heightPercent: Math.min(heightPercent, 100 - yPercent),
  };
}
