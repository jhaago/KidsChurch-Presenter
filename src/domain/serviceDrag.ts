export const SERVICE_RESOURCE_MIME = 'application/x-kidschurch-presenter-resource';

export type ServiceResourceDrag = {
  type: 'song' | 'presentation' | 'media';
  resourceId: string;
  assetKind?: 'audio' | 'visual';
};

export function writeServiceResourceDrag(dataTransfer: DataTransfer, payload: ServiceResourceDrag) {
  dataTransfer.effectAllowed = 'copy';
  dataTransfer.setData(SERVICE_RESOURCE_MIME, JSON.stringify(payload));
  dataTransfer.setData('text/plain', payload.resourceId);
}

export function readServiceResourceDrag(dataTransfer: DataTransfer): ServiceResourceDrag | null {
  try {
    const raw = dataTransfer.getData(SERVICE_RESOURCE_MIME);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ServiceResourceDrag>;
    if (!parsed.resourceId || !['song', 'presentation', 'media'].includes(parsed.type ?? '')) return null;
    return parsed as ServiceResourceDrag;
  } catch {
    return null;
  }
}
