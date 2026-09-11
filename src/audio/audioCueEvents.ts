export const AUDIO_CUE_CLEAR_EVENT = 'kidschurch:clear-audio-cues';
export const AUDIO_CUE_STATE_EVENT = 'kidschurch:audio-cue-state';
export const AUDIO_CUE_TRIGGER_EVENT = 'kidschurch:trigger-audio-cue';

export function clearAudioCues() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUDIO_CUE_CLEAR_EVENT));
}

export function triggerAudioCue(assetId: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUDIO_CUE_TRIGGER_EVENT, { detail: { assetId } }));
}

export function publishAudioCueState(active: boolean) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUDIO_CUE_STATE_EVENT, { detail: { active } }));
}
