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

function importedAsset(record, managedDirectory) {
  const managedPath = path.join(managedDirectory, record.fileName);
  return {
    id: record.id,
    title: record.title,
    kind: record.kind,
    managedPath,
    fileUrl: pathToFileURL(managedPath).toString(),
    source: 'local',
    sourceId: 'imported-media',
    sourceLabel: 'Imported Media',
    relativePath: record.fileName,
    extension: record.extension,
  };
}

async function availableDestination(directory, fileName) {
  const parsed = path.parse(fileName);
  let candidate = path.join(directory, fileName);
  let suffix = 2;
  while (true) {
    try {
      await fs.access(candidate);
      candidate = path.join(directory, `${parsed.name} ${suffix}${parsed.ext}`);
      suffix += 1;
    } catch {
      return candidate;
    }
  }
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
    this.managedDirectory = path.join(userDataPath, 'Imported Media');
    this.sources = [];
    this.imports = [];
    this.assets = [];
    this.lastError = null;
  }

  async load() {
    try {
      const raw = await fs.readFile(this.configPath, 'utf8');
      const parsed = JSON.parse(raw);
      this.sources = Array.isArray(parsed.sources) ? parsed.sources : [];
      this.imports = Array.isArray(parsed.imports) ? parsed.imports : [];
    } catch (error) {
      if (error?.code !== 'ENOENT') this.lastError = error?.message || String(error);
      this.sources = [];
      this.imports = [];
    }

    await this.rescan();
    return this.snapshot();
  }

  async save() {
    await fs.mkdir(path.dirname(this.configPath), { recursive: true });
    await fs.writeFile(
      this.configPath,
      JSON.stringify({ version: 2, sources: this.sources, imports: this.imports }, null, 2),
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

  async importFiles(filePaths) {
    await fs.mkdir(this.managedDirectory, { recursive: true });

    for (const filePath of filePaths) {
      const extension = path.extname(filePath).toLowerCase();
      const kind = mediaKind(extension);
      if (!kind) continue;

      const destination = await availableDestination(this.managedDirectory, path.basename(filePath));
      await fs.copyFile(filePath, destination);
      this.imports.push({
        id: stableId('imported-media', `${destination.toLowerCase()}:${Date.now()}:${crypto.randomUUID()}`),
        title: friendlyTitle(destination),
        kind,
        fileName: path.basename(destination),
        extension,
        addedAt: new Date().toISOString(),
      });
    }

    await this.save();
    await this.rescan();
    return this.snapshot();
  }

  async rescan() {
    this.lastError = null;
    const results = await Promise.all(this.sources.map((source) => scanFolder(source)));
    const imported = [];
    for (const record of this.imports) {
      const asset = importedAsset(record, this.managedDirectory);
      try {
        await fs.access(asset.managedPath);
        imported.push(asset);
      } catch {
        // Keep the import record so a temporarily unavailable file is not
        // silently forgotten; it simply stays out of the current snapshot.
      }
    }
    this.assets = [...imported, ...results.flat()];
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
