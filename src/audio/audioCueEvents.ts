export const AUDIO_CUE_CLEAR_EVENT = 'kidschurch:clear-audio-cues';
export const AUDIO_CUE_STATE_EVENT = 'kidschurch:audio-cue-state';

export function clearAudioCues() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUDIO_CUE_CLEAR_EVENT));
}

export function publishAudioCueState(active: boolean) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUDIO_CUE_STATE_EVENT, { detail: { active } }));
}
