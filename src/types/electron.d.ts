import type { OutputState } from '../domain/types';

export {};

declare global {
  interface Window {
    kidsPresenter?: {
      isElectron: boolean;
      setAudienceVisible: (visible: boolean) => Promise<boolean>;
      getAudienceVisible: () => Promise<boolean>;
      sendOutputState: (state: OutputState) => void;
      onOutputState: (callback: (state: OutputState) => void) => () => void;
      onAudienceVisibility: (callback: (visible: boolean) => void) => () => void;
    };
  }
}
