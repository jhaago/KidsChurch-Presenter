import type {
  NetworkStageInfo,
  OutputState,
  ResourceLibrarySnapshot,
  PresenterOutputState,
  ScreenAssignment,
  ScreenKind,
  StageOutputState,
} from '../domain/types';

export {};

declare global {
  interface Window {
    kidsPresenter?: {
      isElectron: boolean;
      setScreenVisible: (kind: ScreenKind, visible: boolean) => Promise<boolean>;
      getScreenVisible: (kind: ScreenKind) => Promise<boolean>;
      getScreenAssignments: () => Promise<Record<ScreenKind, ScreenAssignment>>;
      getNetworkStageInfo: () => Promise<NetworkStageInfo>;
      getResourceLibrary: () => Promise<ResourceLibrarySnapshot>;
      addResourceFolder: () => Promise<ResourceLibrarySnapshot>;
      removeResourceFolder: (sourceId: string) => Promise<ResourceLibrarySnapshot>;
      rescanResourceLibrary: () => Promise<ResourceLibrarySnapshot>;
      readAudioAsset: (assetId: string) => Promise<ArrayBuffer>;
      sendPresenterOutput: (state: PresenterOutputState) => void;
      onScreenState(kind: 'audience', callback: (state: OutputState) => void): () => void;
      onScreenState(kind: 'stage', callback: (state: StageOutputState) => void): () => void;
      onScreenVisibility: (callback: (kind: ScreenKind, visible: boolean) => void) => () => void;
      onNetworkStageInfo: (callback: (info: NetworkStageInfo) => void) => () => void;
      onResourceLibraryUpdated: (callback: (snapshot: ResourceLibrarySnapshot) => void) => () => void;
    };
  }
}
