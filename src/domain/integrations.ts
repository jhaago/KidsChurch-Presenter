import type { MediaAsset } from './types';

export interface MediaImportRequest {
  source: string;
  preferredTitle?: string;
}

export interface ImportedMedia {
  title: string;
  localFilePath: string;
  kind: MediaAsset['kind'];
  sourceProviderId: string;
  sourceUrl?: string;
  durationSeconds?: number;
  thumbnailPath?: string;
}

/**
 * Future integration boundary for external acquisition tools such as the
 * separate video-downloader project. Implementations should be optional and
 * must never become a dependency of live presentation output.
 */
export interface ExternalMediaProvider {
  id: string;
  name: string;
  canHandle(source: string): boolean;
  acquire(request: MediaImportRequest): Promise<ImportedMedia>;
}
