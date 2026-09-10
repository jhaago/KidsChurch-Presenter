export type PlaylistItemType =
  | 'presentation'
  | 'song'
  | 'media'
  | 'bible'
  | 'timer'
  | 'interactive'
  | 'web-tool';

export type SlideGroupType = 'verse' | 'chorus' | 'bridge' | 'scripture' | 'generic';

export type ScreenKind = 'audience' | 'stage';
export type ScreenTransport = 'local-display' | 'network';

export type SongPlaybackMode =
  | 'slides-track'
  | 'slides-stems'
  | 'lyrics-video'
  | 'slides-live';

export type LyricControlMode = 'manual' | 'assisted' | 'auto';

export type SongAudioMode = 'none' | 'single-track' | 'stems' | 'embedded-video';

export interface NetworkStageInfo {
  running: boolean;
  port: number | null;
  urls: string[];
  clientCount: number;
  error: string | null;
}

export interface ResourceSource {
  id: string;
  label: string;
  path: string;
  type: 'folder';
}

export interface ResourceLibrarySnapshot {
  sources: ResourceSource[];
  assets: MediaAsset[];
  lastError: string | null;
}

export interface ScreenAssignment {
  id: string;
  kind: ScreenKind;
  label: string;
  transport: ScreenTransport;
  enabled: boolean;
  displayId?: string | null;
}

export const DEFAULT_SCREEN_ASSIGNMENTS: Record<ScreenKind, ScreenAssignment> = {
  audience: {
    id: 'audience-main',
    kind: 'audience',
    label: 'Audience',
    transport: 'local-display',
    enabled: true,
    displayId: null,
  },
  stage: {
    id: 'stage-main',
    kind: 'stage',
    label: 'Stage',
    transport: 'local-display',
    enabled: true,
    displayId: null,
  },
};

export type TextAlignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';

export interface SlideBoxLayout {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
}

export interface SlideTextFormat {
  fontFamily: string;
  fontSizeVw: number;
  fontWeight: number;
  lineHeight: number;
  textAlign: TextAlignment;
  verticalAlign: VerticalAlignment;
  textColor: string;
  shadow: boolean;
  uppercase: boolean;
  marginPercent: number;
}

export interface PresentationTheme {
  id: string;
  name: string;
  description?: string;
  format: SlideTextFormat;
  layout?: SlideBoxLayout;
  templateElements?: SlideElement[];
}

export type SlideImageFit = 'contain' | 'cover';
export type SlideShapeKind = 'rectangle' | 'ellipse';

export interface SlideTextElement {
  id: string;
  type: 'text';
  name: string;
  groupId?: string;
  text: string;
  layout: SlideBoxLayout;
  format?: Partial<SlideTextFormat>;
  opacity?: number;
}

export interface SlideImageElement {
  id: string;
  type: 'image';
  name: string;
  groupId?: string;
  assetId?: string;
  layout: SlideBoxLayout;
  fit: SlideImageFit;
  opacity?: number;
}

export interface SlideShapeElement {
  id: string;
  type: 'shape';
  name: string;
  groupId?: string;
  shape: SlideShapeKind;
  layout: SlideBoxLayout;
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  opacity?: number;
}

export type SlideElement = SlideTextElement | SlideImageElement | SlideShapeElement;

export interface Slide {
  id: string;
  text: string;
  notes?: string;
  format?: Partial<SlideTextFormat>;
  layout?: Partial<SlideBoxLayout>;
  elements?: SlideElement[];
  layerOrder?: string[];
  primaryGroupId?: string;
  backgroundAssetId?: string | null;
}

export type PresentationCueColor = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate';

export interface PresentationCueAction {
  id: string;
  type: 'media' | 'audio';
  assetId: string;
}

export interface PresentationCue {
  id: string;
  title: string;
  color?: PresentationCueColor;
  actions: PresentationCueAction[];
}

export interface SlideGroup {
  id: string;
  name: string;
  type: SlideGroupType;
  slides: Slide[];
  cues?: PresentationCue[];
}

export interface Presentation {
  id: string;
  title: string;
  category: 'song' | 'slides' | 'scripture' | 'timer';
  groups: SlideGroup[];
  themeId?: string;
  format?: Partial<SlideTextFormat>;
  layout?: Partial<SlideBoxLayout>;
  backgroundAssetId?: string;
}

export interface SongLyricCue {
  id: string;
  timeMs: number;
  slideId: string;
  arrangementEntryId?: string;
  label?: string;
}

export interface SongArrangementEntry {
  id: string;
  groupId: string;
}

export interface SongStem {
  id: string;
  name: string;
  role: 'drums' | 'bass' | 'piano' | 'keys' | 'acoustic' | 'electric' | 'bgv' | 'click' | 'other';
  assetId?: string;
  enabled: boolean;
  gainDb: number;
}

export interface SongAudioSession {
  mode: SongAudioMode;
  masterGainDb: number;
  singleTrackAssetId?: string;
  stems: SongStem[];
  trimStartMs?: number;
  trimEndMs?: number;
}

export interface Song {
  id: string;
  title: string;
  presentationId?: string;
  playbackMode: SongPlaybackMode;
  lyricControlMode: LyricControlMode;
  backgroundAssetId?: string;
  lyricsVideoAssetId?: string;
  audio: SongAudioSession;
  arrangement?: SongArrangementEntry[];
  lyricCues: SongLyricCue[];
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
  serviceDate?: string;
  description?: string;
}

export interface PresenterLibraryData {
  schemaVersion: 1;
  presentations: Presentation[];
  songs: Song[];
  playlists: Playlist[];
  customThemes?: PresentationTheme[];
  activePlaylistId?: string;
  savedAt?: string;
}

export interface PresenterLibraryStatus {
  loaded: boolean;
  path?: string;
  error?: string | null;
}

export interface MediaAsset {
  id: string;
  title: string;
  kind: 'still' | 'motion' | 'video' | 'audio';
  managedPath?: string;
  fileUrl?: string;
  source?: 'local' | 'library-folder' | 'download-provider' | 'generated';
  sourceId?: string;
  sourceLabel?: string;
  relativePath?: string;
  extension?: string;
}

export type SlideElementSource = 'primary' | 'slide' | 'theme';

export interface LiveTextSlideElement {
  id: string;
  type: 'text';
  name: string;
  source: SlideElementSource;
  sourceElementId?: string;
  groupId?: string;
  text: string;
  layout: SlideBoxLayout;
  format: SlideTextFormat;
  opacity: number;
}

export interface LiveImageSlideElement {
  id: string;
  type: 'image';
  name: string;
  source: SlideElementSource;
  sourceElementId?: string;
  groupId?: string;
  assetId?: string;
  fileUrl?: string;
  layout: SlideBoxLayout;
  fit: SlideImageFit;
  opacity: number;
}

export interface LiveShapeSlideElement {
  id: string;
  type: 'shape';
  name: string;
  source: SlideElementSource;
  sourceElementId?: string;
  groupId?: string;
  shape: SlideShapeKind;
  layout: SlideBoxLayout;
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  opacity: number;
}

export type LiveSlideElement = LiveTextSlideElement | LiveImageSlideElement | LiveShapeSlideElement;

export interface LiveSlideState {
  presentationId: string;
  presentationTitle: string;
  slideId: string;
  arrangementEntryId?: string;
  text: string;
  format?: SlideTextFormat;
  layout?: SlideBoxLayout;
  elements?: LiveSlideElement[];
}

export interface LiveMediaState {
  id: string;
  title: string;
  kind: MediaAsset['kind'];
  fileUrl?: string;
  sourceId?: string;
  sourceLabel?: string;
  muted?: boolean;
  loop?: boolean;
  playbackRole?: 'background' | 'video';
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

export interface StageOutputState {
  presentationId: string | null;
  presentationTitle: string | null;
  currentSlideId: string | null;
  currentArrangementEntryId?: string | null;
  currentText: string | null;
  nextSlideId: string | null;
  nextArrangementEntryId?: string | null;
  nextText: string | null;
  notes: string | null;
}

export const EMPTY_STAGE_OUTPUT_STATE: StageOutputState = {
  presentationId: null,
  presentationTitle: null,
  currentSlideId: null,
  currentArrangementEntryId: null,
  currentText: null,
  nextSlideId: null,
  nextArrangementEntryId: null,
  nextText: null,
  notes: null,
};

export interface PresenterOutputState {
  audience: OutputState;
  stage: StageOutputState;
}

export const EMPTY_PRESENTER_OUTPUT_STATE: PresenterOutputState = {
  audience: { ...EMPTY_OUTPUT_STATE },
  stage: { ...EMPTY_STAGE_OUTPUT_STATE },
};
