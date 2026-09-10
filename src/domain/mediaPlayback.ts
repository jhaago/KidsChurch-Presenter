export interface MediaPlaybackSettings {
  loop?: boolean;
  trimStartMs?: number;
  trimEndMs?: number;
}

const STORAGE_KEY = 'kidschurch-presenter.media-playback.v1';

type MediaPlaybackStore = Record<string, MediaPlaybackSettings>;

function safeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
}

export function normalizeMediaPlaybackSettings(settings: MediaPlaybackSettings): MediaPlaybackSettings {
  const trimStartMs = safeNumber(settings.trimStartMs);
  const trimEndMs = safeNumber(settings.trimEndMs);
  const normalized: MediaPlaybackSettings = {};

  if (typeof settings.loop === 'boolean') normalized.loop = settings.loop;
  if (trimStartMs && trimStartMs > 0) normalized.trimStartMs = trimStartMs;
  if (trimEndMs && trimEndMs > (trimStartMs ?? 0)) normalized.trimEndMs = trimEndMs;

  return normalized;
}

function readStore(): MediaPlaybackStore {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as MediaPlaybackStore;
  } catch {
    return {};
  }
}

function writeStore(store: MediaPlaybackStore) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Playback settings are a convenience feature. A storage failure should not
    // interrupt live presentation operation.
  }
}

export function getMediaPlaybackSettings(assetId: string): MediaPlaybackSettings {
  const candidate = readStore()[assetId];
  if (!candidate || typeof candidate !== 'object') return {};
  return normalizeMediaPlaybackSettings(candidate);
}

export function setMediaPlaybackSettings(assetId: string, settings: MediaPlaybackSettings) {
  const store = readStore();
  store[assetId] = normalizeMediaPlaybackSettings(settings);
  writeStore(store);
}

export function clearMediaPlaybackSettings(assetId: string) {
  const store = readStore();
  delete store[assetId];
  writeStore(store);
}
