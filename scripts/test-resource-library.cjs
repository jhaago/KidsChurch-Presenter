const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { ResourceLibrary } = require('../electron/resource-library.cjs');

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kids-presenter-resources-'));
  const userData = path.join(root, 'user-data');
  const media = path.join(root, 'OneDrive', 'Kids Church Resources');
  await fs.mkdir(path.join(media, 'Backgrounds'), { recursive: true });
  await fs.writeFile(path.join(media, 'Backgrounds', 'Blue Motion.mp4'), '');
  await fs.writeFile(path.join(media, 'Welcome.png'), '');
  await fs.writeFile(path.join(media, 'notes.txt'), 'ignore me');

  const library = new ResourceLibrary(userData);
  await library.load();
  let snapshot = await library.addFolder(media);

  assert.equal(snapshot.sources.length, 1);
  assert.equal(snapshot.assets.length, 2);
  assert.ok(snapshot.assets.some((asset) => asset.kind === 'motion' && asset.title === 'Blue Motion'));
  assert.ok(snapshot.assets.some((asset) => asset.kind === 'still' && asset.title === 'Welcome'));
  assert.ok(snapshot.assets.every((asset) => asset.fileUrl.startsWith('file:')));
  const motion = snapshot.assets.find((asset) => asset.title === 'Blue Motion');
  assert.ok(motion);
  assert.equal(library.assetById(motion.id)?.managedPath, motion.managedPath);
  assert.equal(library.assetById('missing-asset'), null);

  const importSource = path.join(root, 'Import Me.wav');
  await fs.writeFile(importSource, 'audio');
  snapshot = await library.importFiles([importSource]);
  const imported = snapshot.assets.find((asset) => asset.title === 'Import Me');
  assert.ok(imported);
  assert.equal(imported.kind, 'audio');
  assert.equal(imported.sourceLabel, 'Imported Media');
  assert.notEqual(imported.managedPath, importSource);
  assert.equal(await fs.readFile(imported.managedPath, 'utf8'), 'audio');

  const reloaded = new ResourceLibrary(userData);
  snapshot = await reloaded.load();
  assert.equal(snapshot.sources.length, 1);
  assert.equal(snapshot.assets.length, 3);

  snapshot = await reloaded.removeFolder(snapshot.sources[0].id);
  assert.equal(snapshot.sources.length, 0);
  assert.equal(snapshot.assets.length, 1);

  await fs.rm(root, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
