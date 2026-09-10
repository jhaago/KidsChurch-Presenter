import type { Presentation, Slide, SlideTextFormat } from './types';

export interface PresentationThemePreset {
  id: string;
  name: string;
  description: string;
  format: SlideTextFormat;
}

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

export function themeById(themeId?: string) {
  return PRESENTATION_THEMES.find((theme) => theme.id === themeId) ?? PRESENTATION_THEMES[0];
}

export function resolveSlideFormat(presentation: Presentation, slide?: Slide): SlideTextFormat {
  return {
    ...DEFAULT_SLIDE_FORMAT,
    ...themeById(presentation.themeId).format,
    ...presentation.format,
    ...slide?.format,
  };
}

export function withTheme(presentation: Presentation, themeId: string): Presentation {
  return {
    ...presentation,
    themeId,
    format: undefined,
  };
}


export function resolveBackgroundAssetId(presentation: Presentation, slide?: Slide) {
  if (slide?.backgroundAssetId === null) return undefined;
  return slide?.backgroundAssetId ?? presentation.backgroundAssetId;
}
