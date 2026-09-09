const fs = require('node:fs/promises');
const path = require('node:path');

function isLibraryData(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    value.schemaVersion === 1 &&
    Array.isArray(value.presentations) &&
    Array.isArray(value.songs) &&
    Array.isArray(value.playlists),
  );
}

class PresenterLibraryStore {
  constructor(userDataPath) {
    this.filePath = path.join(userDataPath, 'presenter-library.json');
    this.backupPath = path.join(userDataPath, 'presenter-library.backup.json');
    this.tempPath = path.join(userDataPath, 'presenter-library.tmp.json');
    this.lastError = null;
  }

  async readJson(filePath) {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!isLibraryData(parsed)) {
      throw new Error('Unsupported or invalid presenter library data.');
    }
    return parsed;
  }

  async load() {
    this.lastError = null;
    try {
      const data = await this.readJson(this.filePath);
      return { data, recoveredFromBackup: false, error: null, path: this.filePath };
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return { data: null, recoveredFromBackup: false, error: null, path: this.filePath };
      }

      this.lastError = error instanceof Error ? error.message : String(error);

      try {
        const data = await this.readJson(this.backupPath);
        return {
          data,
          recoveredFromBackup: true,
          error: this.lastError,
          path: this.filePath,
        };
      } catch {
        return {
          data: null,
          recoveredFromBackup: false,
          error: this.lastError,
          path: this.filePath,
        };
      }
    }
  }

  async save(data) {
    if (!isLibraryData(data)) {
      throw new Error('Refusing to save invalid presenter library data.');
    }

    const directory = path.dirname(this.filePath);
    await fs.mkdir(directory, { recursive: true });

    const payload = JSON.stringify(
      {
        ...data,
        schemaVersion: 1,
        savedAt: new Date().toISOString(),
      },
      null,
      2,
    );

    try {
      await fs.copyFile(this.filePath, this.backupPath);
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        // A backup failure should not prevent the primary save.
        this.lastError = error instanceof Error ? error.message : String(error);
      }
    }

    await fs.writeFile(this.tempPath, payload, 'utf8');

    try {
      await fs.rename(this.tempPath, this.filePath);
    } catch {
      // Windows may reject replacing an existing destination in some cases.
      await fs.rm(this.filePath, { force: true });
      await fs.rename(this.tempPath, this.filePath);
    }

    this.lastError = null;
    return {
      saved: true,
      path: this.filePath,
      savedAt: JSON.parse(payload).savedAt,
    };
  }
}

module.exports = { PresenterLibraryStore, isLibraryData };
