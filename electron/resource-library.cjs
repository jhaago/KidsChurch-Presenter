const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const STILL_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);
const MOTION_EXTENSIONS = new Set(['.mp4', '.webm', '.m4v', '.mov']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']);

function stableId(prefix, value) {
  return prefix + '-' + crypto.createHash('sha1').update(value).digest('hex').slice(0, 16);
}

function mediaKind(extension) {
  if (STILL_EXTENSIONS.has(extension)) return 'still';
  if (MOTION_EXTENSIONS.has(extension)) return 'motion';
  if (AUDIO_EXTENSIONS.has(extension)) return 'audio';
  return null;
}

function friendlyTitle(filePath) {
  return path.basename(filePath, path.extname(filePath)).replaceAll('_', ' ').replaceAll('-', ' ');
}

async function scanFolder(source) {
  const assets = [];
  const queue = [{ directory: source.path, depth: 0 }];
  const maxDepth = 8;

  while (queue.length) {
    const { directory, depth } = queue.shift();
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        if (depth < maxDepth) queue.push({ directory: fullPath, depth: depth + 1 });
        continue;
      }

      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      const kind = mediaKind(extension);
      if (!kind) continue;

      assets.push({
        id: stableId('library-media', fullPath.toLowerCase()),
        title: friendlyTitle(fullPath),
        kind,
        managedPath: fullPath,
        fileUrl: pathToFileURL(fullPath).toString(),
        source: 'library-folder',
        sourceId: source.id,
        sourceLabel: source.label,
        relativePath: path.relative(source.path, fullPath),
        extension,
      });
    }
  }

  return assets;
}

class ResourceLibrary {
  constructor(userDataPath) {
    this.configPath = path.join(userDataPath, 'resource-library.json');
    this.sources = [];
    this.assets = [];
    this.lastError = null;
  }

  async load() {
    try {
      const raw = await fs.readFile(this.configPath, 'utf8');
      const parsed = JSON.parse(raw);
      this.sources = Array.isArray(parsed.sources) ? parsed.sources : [];
    } catch (error) {
      if (error?.code !== 'ENOENT') this.lastError = error?.message || String(error);
      this.sources = [];
    }

    await this.rescan();
    return this.snapshot();
  }

  async save() {
    await fs.mkdir(path.dirname(this.configPath), { recursive: true });
    await fs.writeFile(
      this.configPath,
      JSON.stringify({ version: 1, sources: this.sources }, null, 2),
      'utf8',
    );
  }

  async addFolder(folderPath) {
    const normalized = path.resolve(folderPath);
    const existing = this.sources.find(
      (source) => source.path.toLowerCase() === normalized.toLowerCase(),
    );
    if (existing) return this.snapshot();

    const label = path.basename(normalized) || normalized;
    this.sources.push({
      id: stableId('resource-source', normalized.toLowerCase()),
      label,
      path: normalized,
      type: 'folder',
    });

    await this.save();
    await this.rescan();
    return this.snapshot();
  }

  async removeFolder(sourceId) {
    this.sources = this.sources.filter((source) => source.id !== sourceId);
    await this.save();
    await this.rescan();
    return this.snapshot();
  }

  async rescan() {
    this.lastError = null;
    const results = await Promise.all(this.sources.map((source) => scanFolder(source)));
    this.assets = results.flat();
    return this.snapshot();
  }

  assetById(assetId) {
    const asset = this.assets.find((candidate) => candidate.id === assetId);
    return asset ? { ...asset } : null;
  }

  snapshot() {
    return {
      sources: this.sources.map((source) => ({ ...source })),
      assets: this.assets.map((asset) => ({ ...asset })),
      lastError: this.lastError,
    };
  }
}

module.exports = { ResourceLibrary };
