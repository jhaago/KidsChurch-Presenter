import { useEffect, useRef, useState } from 'react';
import { preloadAudioCue, triggerAudioCue } from '../audio/audioCueEvents';
import type { MediaAsset, PresentationCue, SlideGroup } from '../domain/types';
import { Icon } from './ui/Icon';

interface PresentationCueDeckProps {
  group: SlideGroup;
  assets: MediaAsset[];
  onTriggerMedia: (asset: MediaAsset) => void;
}

function actionSummary(cue: PresentationCue) {
  const labels: string[] = [];
  if (cue.actions.some((action) => action.type === 'media')) labels.push('MEDIA');
  if (cue.actions.some((action) => action.type === 'audio')) labels.push('AUDIO');
  return labels.join(' + ') || 'NO ACTIONS';
}

function preloadCueAudio(cue: PresentationCue) {
  const audioAction = cue.actions.find((action) => action.type === 'audio');
  if (audioAction) preloadAudioCue(audioAction.assetId);
}

export function PresentationCueDeck({ group, assets, onTriggerMedia }: PresentationCueDeckProps) {
  const [lastTriggeredId, setLastTriggeredId] = useState<string | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const cues = group.cues ?? [];

  useEffect(() => {
    const audioIds = new Set(
      cues.flatMap((cue) => cue.actions)
        .filter((action) => action.type === 'audio')
        .map((action) => action.assetId),
    );
    audioIds.forEach((assetId) => preloadAudioCue(assetId));
  }, [cues]);

  useEffect(() => () => {
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
  }, []);

  if (!cues.length) return null;

  const triggerCue = (cue: PresentationCue) => {
    const audioAction = cue.actions.find((action) => action.type === 'audio');
    const mediaAction = cue.actions.find((action) => action.type === 'media');

    // Start the audio request first. Referenced cue audio is pre-decoded when this
    // scene is shown, so audio scheduling and the media-layer state update land
    // together rather than waiting on first-use decoding.
    if (audioAction) triggerAudioCue(audioAction.assetId);

    if (mediaAction) {
      const media = assets.find((asset) => asset.id === mediaAction.assetId && asset.kind !== 'audio');
      if (media) onTriggerMedia(media);
    }

    setLastTriggeredId(cue.id);
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setLastTriggeredId(null), 650);
  };

  return (
    <div className="presentationCueDeck" aria-label={`${group.name} cues`}>
      <div className="presentationCueDeckLabel">
        <Icon name="interactive" />
        <span>CUES</span>
      </div>
      <div className="presentationCueButtons">
        {cues.map((cue, index) => (
          <button
            className={`presentationCueButton cueColor-${cue.color ?? 'blue'} ${lastTriggeredId === cue.id ? 'isTriggered' : ''}`}
            key={cue.id}
            onClick={() => triggerCue(cue)}
            onPointerEnter={() => preloadCueAudio(cue)}
            onFocus={() => preloadCueAudio(cue)}
            type="button"
            disabled={!cue.actions.length}
            title={cue.actions.length ? `Trigger ${actionSummary(cue).toLowerCase()}` : 'This cue has no actions'}
          >
            <span className="cueNumber">C{index + 1}</span>
            <strong>{cue.title || `Cue ${index + 1}`}</strong>
            <small>{actionSummary(cue)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
