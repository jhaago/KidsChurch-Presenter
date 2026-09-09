export type PlaylistItemType =
  | 'presentation'
  | 'media'
  | 'bible'
  | 'timer'
  | 'interactive'
  | 'web-tool';

export type SlideGroupType = 'verse' | 'chorus' | 'bridge' | 'scripture' | 'generic';

export interface Slide {
  id: string;
  text: string;
  notes?: string;
}

export interface SlideGroup {
  id: string;
  name: string;
  type: SlideGroupType;
  slides: Slide[];
}

export interface Presentation {
  id: string;
  title: string;
  category: 'song' | 'slides' | 'scripture' | 'timer';
  groups: SlideGroup[];
}

export interface PlaylistItem {
  id: string;
  title: string;
  type: PlaylistItemType;
  resourceId?: string;
}

export interface Playlist {
  id: string;
  title: string;
  items: PlaylistItem[];
}

export interface MediaAsset {
  id: string;
  title: string;
  kind: 'still' | 'motion' | 'video' | 'audio';
  managedPath?: string;
  source?: 'local' | 'download-provider' | 'generated';
}

export interface LiveSlideState {
  presentationId: string;
  presentationTitle: string;
  slideId: string;
  text: string;
}

export interface LiveMediaState {
  id: string;
  title: string;
  kind: MediaAsset['kind'];
}

export interface OutputState {
  slide: LiveSlideState | null;
  media: LiveMediaState | null;
  prop: { id: string; title: string } | null;
  message: { id: string; text: string } | null;
  announcement: { id: string; title: string } | null;
  audio: { id: string; title: string } | null;
  liveVideo: { id: string; title: string } | null;
  logo: boolean;
  black: boolean;
}

export const EMPTY_OUTPUT_STATE: OutputState = {
  slide: null,
  media: null,
  prop: null,
  message: null,
  announcement: null,
  audio: null,
  liveVideo: null,
  logo: false,
  black: false,
};
