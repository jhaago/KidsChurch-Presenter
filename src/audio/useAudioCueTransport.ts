import { useCallback, useEffect, useRef, useState } from 'react';
import { getMediaPlaybackSettings } from '../domain/mediaPlayback';
import type { MediaAsset } from '../domain/types';
import {
  AUDIO_CUE_CLEAR_EVENT,
  publishAudioCueState,
} from './audioCueEvents';

export type AudioCueStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'ended'
  | 'error';

export interface AudioCueTransportSnapshot {
  assetId: string | null;
  assetTitle: string | null;
  status: AudioCueStatus;
  positionMs: number;
  durationMs: number;
  trimStartMs: number;
  trimEndMs: number | null;
  loop: boolean;
  error: string | null;
}

const INITIAL_STATE: AudioCueTransportSnapshot = {
  assetId: null,
  assetTitle: null,
  status: 'idle',
  positionMs: 0,
  durationMs: 0,
  trimStartMs: 0,
  trimEndMs: null,
  loop: false,
  error: null,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useAudioCueTransport() {
  const [state, setState] = useState<AudioCueTransportSnapshot>(INITIAL_STATE);
  const stateRef = useRef<AudioCueTransportSnapshot>(INITIAL_STATE);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bufferCacheRef = useRef(new Map<string, AudioBuffer>());
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeAssetRef = useRef<MediaAsset | null>(null);
  const startPositionMsRef = useRef(0);
  const scheduledStartTimeRef = useRef(0);
  const trimStartMsRef = useRef(0);
  const trimEndMsRef = useRef(0);
  const loopRef = useRef(false);

  const updateState = useCallback((patch: Partial<AudioCueTransportSnapshot>) => {
    setState((current) => {
      const next = { ...current, ...patch };
      stateRef.current = next;
      return next;
    });
  }, []);

  const ensureContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ latencyHint: 'interactive' });
    }
    const context = audioContextRef.current;
    if (context.state === 'suspended') await context.resume();
    return context;
  }, []);

  const stopSource = useCallback(() => {
    const source = sourceRef.current;
    sourceRef.current = null;
    if (!source) return;
    try {
      source.onended = null;
      source.stop();
    } catch {
      // It may already have ended.
    }
    try {
      source.disconnect();
    } catch {
      // Best effort during teardown.
    }
  }, []);

  const readAndDecode = useCallback(async (asset: MediaAsset) => {
    const cached = bufferCacheRef.current.get(asset.id);
    if (cached) return cached;
    if (!window.kidsPresenter?.readAudioAsset) {
      throw new Error('General audio playback requires the desktop application.');
    }
    const bytes = await window.kidsPresenter.readAudioAsset(asset.id);
    const context = await ensureContext();
    const buffer = await context.decodeAudioData(bytes.slice(0));
    bufferCacheRef.current.set(asset.id, buffer);
    return buffer;
  }, [ensureContext]);

  const currentPositionMs = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== 'playing') return current.positionMs;
    const context = audioContextRef.current;
    if (!context) return current.positionMs;

    const elapsedMs = Math.max(0, context.currentTime - scheduledStartTimeRef.current) * 1000;
    const start = trimStartMsRef.current;
    const end = trimEndMsRef.current;
    const base = startPositionMsRef.current;
    if (loopRef.current && end > start) {
      const span = end - start;
      return start + ((Math.max(0, base - start) + elapsedMs) % span);
    }
    return Math.min(end, base + elapsedMs);
  }, []);

  const scheduleFrom = useCallback(async (
    asset: MediaAsset,
    buffer: AudioBuffer,
    requestedPositionMs: number,
  ) => {
    const context = await ensureContext();
    stopSource();

    const sourceDurationMs = buffer.duration * 1000;
    const settings = getMediaPlaybackSettings(asset.id);
    const trimStartMs = clamp(settings.trimStartMs ?? 0, 0, Math.max(0, sourceDurationMs - 1));
    const requestedEnd = settings.trimEndMs ?? sourceDurationMs;
    const trimEndMs = clamp(requestedEnd, trimStartMs + 1, sourceDurationMs);
    const positionMs = clamp(requestedPositionMs, trimStartMs, trimEndMs);
    const loop = Boolean(settings.loop);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    if (loop) {
      source.loopStart = trimStartMs / 1000;
      source.loopEnd = trimEndMs / 1000;
    }
    source.connect(context.destination);

    const startAt = context.currentTime + 0.03;
    if (loop) {
      source.start(startAt, positionMs / 1000);
    } else {
      const remainingSeconds = Math.max(0.001, (trimEndMs - positionMs) / 1000);
      source.start(startAt, positionMs / 1000, remainingSeconds);
    }

    sourceRef.current = source;
    activeAssetRef.current = asset;
    startPositionMsRef.current = positionMs;
    scheduledStartTimeRef.current = startAt;
    trimStartMsRef.current = trimStartMs;
    trimEndMsRef.current = trimEndMs;
    loopRef.current = loop;

    updateState({
      assetId: asset.id,
      assetTitle: asset.title,
      status: 'playing',
      positionMs,
      durationMs: sourceDurationMs,
      trimStartMs,
      trimEndMs,
      loop,
      error: null,
    });
  }, [ensureContext, stopSource, updateState]);

  const play = useCallback(async (asset: MediaAsset) => {
    if (asset.kind !== 'audio') return false;

    try {
      const samePaused = stateRef.current.assetId === asset.id && stateRef.current.status === 'paused';
      updateState({
        assetId: asset.id,
        assetTitle: asset.title,
        status: 'loading',
        error: null,
      });
      const buffer = await readAndDecode(asset);
      const settings = getMediaPlaybackSettings(asset.id);
      const sourceDurationMs = buffer.duration * 1000;
      const trimStartMs = clamp(settings.trimStartMs ?? 0, 0, Math.max(0, sourceDurationMs - 1));
      const resumePosition = samePaused ? stateRef.current.positionMs : trimStartMs;
      await scheduleFrom(asset, buffer, resumePosition);
      return true;
    } catch (error) {
      stopSource();
      updateState({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }, [readAndDecode, scheduleFrom, stopSource, updateState]);

  const pause = useCallback(() => {
    if (stateRef.current.status !== 'playing') return;
    const positionMs = currentPositionMs();
    stopSource();
    updateState({ status: 'paused', positionMs });
  }, [currentPositionMs, stopSource, updateState]);

  const resume = useCallback(async () => {
    const asset = activeAssetRef.current;
    if (!asset || stateRef.current.status !== 'paused') return false;
    return play(asset);
  }, [play]);

  const stop = useCallback(() => {
    stopSource();
    updateState({
      status: stateRef.current.assetId ? 'stopped' : 'idle',
      positionMs: trimStartMsRef.current,
      error: null,
    });
  }, [stopSource, updateState]);

  const seek = useCallback(async (positionMs: number) => {
    const asset = activeAssetRef.current;
    const current = stateRef.current;
    if (!asset || !current.assetId) return;
    const end = current.trimEndMs ?? current.durationMs;
    const clamped = clamp(positionMs, current.trimStartMs, end);

    if (current.status !== 'playing') {
      updateState({ positionMs: clamped });
      return;
    }

    const buffer = bufferCacheRef.current.get(asset.id);
    if (!buffer) return;
    await scheduleFrom(asset, buffer, clamped);
  }, [scheduleFrom, updateState]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = stateRef.current;
      if (current.status !== 'playing') return;
      const positionMs = currentPositionMs();
      const end = current.trimEndMs ?? current.durationMs;
      if (!current.loop && end > 0 && positionMs >= end - 5) {
        stopSource();
        updateState({ status: 'ended', positionMs: end });
        return;
      }
      updateState({ positionMs });
    }, 100);
    return () => window.clearInterval(timer);
  }, [currentPositionMs, stopSource, updateState]);

  useEffect(() => {
    const clear = () => stop();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F1' || event.key === 'F5') stop();
    };
    window.addEventListener(AUDIO_CUE_CLEAR_EVENT, clear);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener(AUDIO_CUE_CLEAR_EVENT, clear);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [stop]);

  useEffect(() => {
    publishAudioCueState(
      state.status === 'loading' || state.status === 'playing' || state.status === 'paused',
    );
  }, [state.status]);

  useEffect(() => () => {
    publishAudioCueState(false);
    stopSource();
    const context = audioContextRef.current;
    if (context) void context.close();
  }, [stopSource]);

  return {
    state,
    play,
    pause,
    resume,
    stop,
    seek,
    getPositionMs: currentPositionMs,
  };
}
