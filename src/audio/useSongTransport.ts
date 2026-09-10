import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaAsset, Song } from '../domain/types';

export type SongTransportStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'ended'
  | 'error';

interface SongTransportState {
  songId: string | null;
  songTitle: string | null;
  status: SongTransportStatus;
  positionMs: number;
  durationMs: number;
  loadedTrackCount: number;
  stemEnabled: Record<string, boolean>;
  warning: string | null;
  error: string | null;
}

export interface SongTransportSnapshot extends SongTransportState {
  setStemEnabled: (stemId: string, enabled: boolean) => void;
}

interface TrackPlan {
  key: string;
  asset: MediaAsset;
  gainDb: number;
  enabled: boolean;
}

interface ActiveSource {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

const INITIAL_STATE: SongTransportState = {
  songId: null,
  songTitle: null,
  status: 'idle',
  positionMs: 0,
  durationMs: 0,
  loadedTrackCount: 0,
  stemEnabled: {},
  warning: null,
  error: null,
};

function dbToGain(db: number) {
  return 10 ** (db / 20);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function songTrim(song: Song, sourceDurationMs: number) {
  if (sourceDurationMs <= 1) return { startMs: 0, endMs: sourceDurationMs, durationMs: sourceDurationMs };
  const requestedStart = Number.isFinite(song.audio.trimStartMs) ? song.audio.trimStartMs ?? 0 : 0;
  const startMs = clamp(Math.max(0, requestedStart), 0, sourceDurationMs - 1);
  const requestedEnd = Number.isFinite(song.audio.trimEndMs) ? song.audio.trimEndMs ?? sourceDurationMs : sourceDurationMs;
  const endMs = clamp(requestedEnd, startMs + 1, sourceDurationMs);
  return { startMs, endMs, durationMs: endMs - startMs };
}

function buildTrackPlan(song: Song, assets: MediaAsset[]): TrackPlan[] {
  if (song.audio.mode === 'single-track') {
    if (!song.audio.singleTrackAssetId) {
      throw new Error('No backing track is assigned to this song.');
    }
    const asset = assets.find((candidate) => candidate.id === song.audio.singleTrackAssetId);
    if (!asset || asset.kind !== 'audio') {
      throw new Error('The assigned backing track is not available in the resource library.');
    }
    return [{ key: 'single-track', asset, gainDb: 0, enabled: true }];
  }

  if (song.audio.mode === 'stems') {
    const tracks = song.audio.stems
      .filter((stem) => stem.assetId)
      .map((stem) => {
        const asset = assets.find((candidate) => candidate.id === stem.assetId);
        if (!asset || asset.kind !== 'audio') {
          throw new Error(`The assigned ${stem.name} stem is not available in the resource library.`);
        }
        return {
          key: stem.id,
          asset,
          gainDb: stem.gainDb,
          enabled: stem.enabled,
        };
      });

    if (!tracks.length) {
      throw new Error('No stem files are assigned to this song.');
    }
    return tracks;
  }

  return [];
}

function runtimeStemState(plan: TrackPlan[]) {
  return Object.fromEntries(
    plan
      .filter((track) => track.key !== 'single-track')
      .map((track) => [track.key, track.enabled]),
  );
}

export function useSongTransport(assets: MediaAsset[]) {
  const [state, setState] = useState<SongTransportState>(INITIAL_STATE);
  const stateRef = useRef<SongTransportState>(INITIAL_STATE);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const bufferCacheRef = useRef(new Map<string, AudioBuffer>());
  const activeSourcesRef = useRef(new Map<string, ActiveSource>());
  const trackPlanRef = useRef<TrackPlan[]>([]);
  const activeSongRef = useRef<Song | null>(null);
  const startOffsetMsRef = useRef(0);
  const scheduledStartTimeRef = useRef(0);
  const sourceTrimStartMsRef = useRef(0);

  const updateState = useCallback((patch: Partial<SongTransportState>) => {
    setState((current) => {
      const next = { ...current, ...patch };
      stateRef.current = next;
      return next;
    });
  }, []);

  const ensureContext = useCallback(async () => {
    if (!audioContextRef.current) {
      const context = new AudioContext({ latencyHint: 'interactive' });
      const master = context.createGain();
      master.connect(context.destination);
      audioContextRef.current = context;
      masterGainRef.current = master;
    }
    const context = audioContextRef.current;
    if (context.state === 'suspended') await context.resume();
    return context;
  }, []);

  const stopSources = useCallback(() => {
    for (const { source, gain } of activeSourcesRef.current.values()) {
      try {
        source.onended = null;
        source.stop();
      } catch {
        // Source may already have ended.
      }
      try {
        source.disconnect();
        gain.disconnect();
      } catch {
        // Disconnect is best effort during teardown.
      }
    }
    activeSourcesRef.current.clear();
  }, []);

  const readAndDecode = useCallback(async (asset: MediaAsset) => {
    const cached = bufferCacheRef.current.get(asset.id);
    if (cached) return cached;

    if (!window.kidsPresenter?.readAudioAsset) {
      throw new Error('Local song audio playback requires the desktop application.');
    }

    const bytes = await window.kidsPresenter.readAudioAsset(asset.id);
    const context = await ensureContext();
    const buffer = await context.decodeAudioData(bytes.slice(0));
    bufferCacheRef.current.set(asset.id, buffer);
    return buffer;
  }, [ensureContext]);

  const scheduleFrom = useCallback(async (
    song: Song,
    positionMs: number,
    plan: TrackPlan[],
    buffers: Map<string, AudioBuffer>,
  ) => {
    const context = await ensureContext();
    stopSources();

    const master = masterGainRef.current;
    if (!master) throw new Error('Audio output is not ready.');
    master.gain.setValueAtTime(dbToGain(song.audio.masterGainDb), context.currentTime);

    const sourceDurations = [...buffers.values()].map((buffer) => buffer.duration * 1000);
    const sourceDurationMs = sourceDurations.length ? Math.max(...sourceDurations) : 0;
    const trim = songTrim(song, sourceDurationMs);
    const logicalPositionMs = clamp(positionMs, 0, trim.durationMs);
    const sourceOffsetMs = trim.startMs + logicalPositionMs;
    const logicalRemainingMs = Math.max(0, trim.durationMs - logicalPositionMs);
    const startAt = context.currentTime + 0.075;

    for (const track of plan) {
      const buffer = buffers.get(track.asset.id);
      if (!buffer || sourceOffsetMs >= buffer.duration * 1000 || logicalRemainingMs <= 0) continue;

      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(track.enabled ? dbToGain(track.gainDb) : 0, context.currentTime);
      source.connect(gain);
      gain.connect(master);

      const availableMs = Math.max(0, buffer.duration * 1000 - sourceOffsetMs);
      const playForMs = Math.min(logicalRemainingMs, availableMs);
      if (playForMs <= 0) continue;
      source.start(startAt, sourceOffsetMs / 1000, playForMs / 1000);
      activeSourcesRef.current.set(track.key, { source, gain });
    }

    sourceTrimStartMsRef.current = trim.startMs;
    startOffsetMsRef.current = logicalPositionMs;
    scheduledStartTimeRef.current = startAt;
  }, [ensureContext, stopSources]);

  const currentPositionMs = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== 'playing') return current.positionMs;
    const context = audioContextRef.current;
    if (!context) return current.positionMs;
    const elapsedMs = Math.max(0, context.currentTime - scheduledStartTimeRef.current) * 1000;
    return Math.min(current.durationMs, startOffsetMsRef.current + elapsedMs);
  }, []);

  const loadBuffersForPlan = useCallback(async (plan: TrackPlan[]) => {
    const entries = await Promise.all(
      plan.map(async (track) => [track.asset.id, await readAndDecode(track.asset)] as const),
    );
    return new Map<string, AudioBuffer>(entries);
  }, [readAndDecode]);

  const play = useCallback(async (song: Song) => {
    if (song.playbackMode === 'lyrics-video') {
      updateState({
        songId: song.id,
        songTitle: song.title,
        status: 'error',
        error: 'Lyrics Video uses the Audience video player rather than the song audio transport.',
      });
      return false;
    }

    if (stateRef.current.songId === song.id && stateRef.current.status === 'paused') {
      const plan = trackPlanRef.current;
      const buffers = new Map<string, AudioBuffer>();
      for (const track of plan) {
        const buffer = bufferCacheRef.current.get(track.asset.id);
        if (buffer) buffers.set(track.asset.id, buffer);
      }
      await scheduleFrom(song, stateRef.current.positionMs, plan, buffers);
      activeSongRef.current = song;
      updateState({ status: 'playing', error: null, stemEnabled: runtimeStemState(plan) });
      return true;
    }

    stopSources();
    activeSongRef.current = song;
    updateState({
      songId: song.id,
      songTitle: song.title,
      status: 'loading',
      positionMs: 0,
      durationMs: 0,
      loadedTrackCount: 0,
      stemEnabled: {},
      warning: null,
      error: null,
    });

    try {
      const plan = buildTrackPlan(song, assets);
      trackPlanRef.current = plan;

      if (!plan.length) {
        const lastCue = song.lyricCues.reduce((latest, cue) => Math.max(latest, cue.timeMs), 0);
        const durationMs = Math.max(lastCue + 10000, 300000);
        await ensureContext();
        sourceTrimStartMsRef.current = 0;
        startOffsetMsRef.current = 0;
        scheduledStartTimeRef.current = audioContextRef.current?.currentTime ?? 0;
        updateState({
          status: 'playing',
          durationMs,
          loadedTrackCount: 0,
          stemEnabled: {},
          warning: 'Clock-only transport: no backing audio is active.',
        });
        return true;
      }

      const buffers = await loadBuffersForPlan(plan);
      const sourceDurations = [...buffers.values()].map((buffer) => buffer.duration * 1000);
      const sourceDurationMs = Math.max(...sourceDurations);
      const shortest = Math.min(...sourceDurations);
      const trim = songTrim(song, sourceDurationMs);
      const warning = sourceDurationMs - shortest > 250
        ? 'Stem durations differ by more than 250 ms. Re-export stems from the same start and end points.'
        : null;

      await scheduleFrom(song, 0, plan, buffers);
      updateState({
        status: 'playing',
        positionMs: 0,
        durationMs: trim.durationMs,
        loadedTrackCount: plan.length,
        stemEnabled: runtimeStemState(plan),
        warning,
        error: null,
      });
      return true;
    } catch (error) {
      stopSources();
      updateState({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }, [assets, ensureContext, loadBuffersForPlan, scheduleFrom, stopSources, updateState]);

  const restart = useCallback(async (song: Song) => {
    stopSources();
    stateRef.current = {
      ...stateRef.current,
      status: 'stopped',
      positionMs: 0,
    };
    return play(song);
  }, [play, stopSources]);

  const pause = useCallback(() => {
    if (stateRef.current.status !== 'playing') return;
    const positionMs = currentPositionMs();
    stopSources();
    updateState({ status: 'paused', positionMs });
  }, [currentPositionMs, stopSources, updateState]);

  const resume = useCallback(async () => {
    const song = activeSongRef.current;
    if (!song || stateRef.current.status !== 'paused') return false;
    return play(song);
  }, [play]);

  const stop = useCallback(() => {
    stopSources();
    sourceTrimStartMsRef.current = 0;
    startOffsetMsRef.current = 0;
    scheduledStartTimeRef.current = 0;
    updateState({
      status: stateRef.current.songId ? 'stopped' : 'idle',
      positionMs: 0,
      error: null,
    });
  }, [stopSources, updateState]);

  const seek = useCallback(async (positionMs: number) => {
    const current = stateRef.current;
    const song = activeSongRef.current;
    if (!song || !current.songId) return;

    const clamped = Math.max(0, Math.min(current.durationMs, positionMs));
    if (current.status !== 'playing') {
      updateState({ positionMs: clamped });
      return;
    }

    const plan = trackPlanRef.current;
    const buffers = new Map<string, AudioBuffer>();
    for (const track of plan) {
      const buffer = bufferCacheRef.current.get(track.asset.id);
      if (buffer) buffers.set(track.asset.id, buffer);
    }
    await scheduleFrom(song, clamped, plan, buffers);
    updateState({ positionMs: clamped });
  }, [scheduleFrom, updateState]);

  const setStemEnabled = useCallback((stemId: string, enabled: boolean) => {
    const track = trackPlanRef.current.find((candidate) => candidate.key === stemId);
    if (!track) return;

    track.enabled = enabled;
    updateState({
      stemEnabled: {
        ...stateRef.current.stemEnabled,
        [stemId]: enabled,
      },
    });

    const context = audioContextRef.current;
    const node = activeSourcesRef.current.get(stemId);
    if (!context || !node) return;
    node.gain.gain.cancelScheduledValues(context.currentTime);
    node.gain.gain.setTargetAtTime(enabled ? dbToGain(track.gainDb) : 0, context.currentTime, 0.01);
  }, [updateState]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = stateRef.current;
      if (current.status !== 'playing') return;
      const positionMs = currentPositionMs();
      if (current.durationMs > 0 && positionMs >= current.durationMs) {
        stopSources();
        updateState({ status: 'ended', positionMs: current.durationMs });
        return;
      }
      updateState({ positionMs });
    }, 100);

    return () => window.clearInterval(timer);
  }, [currentPositionMs, stopSources, updateState]);

  useEffect(() => () => {
    stopSources();
    const context = audioContextRef.current;
    if (context) void context.close();
  }, [stopSources]);

  return {
    state: { ...state, setStemEnabled } satisfies SongTransportSnapshot,
    play,
    restart,
    pause,
    resume,
    stop,
    seek,
    getPositionMs: currentPositionMs,
    setStemEnabled,
  };
}
