const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { PresenterLibraryStore } = require('../electron/presenter-library.cjs');

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kids-presenter-library-'));
  const store = new PresenterLibraryStore(root);

  let loaded = await store.load();
  assert.equal(loaded.data, null);

  const data = {
    schemaVersion: 1,
    presentations: [
      {
        id: 'p1',
        title: 'Editable Slides',
        category: 'slides',
        groups: [
          {
            id: 'g1',
            name: 'Group',
            type: 'generic',
            slides: [{ id: 's1', text: 'Hello' }],
          },
        ],
      },
    ],
    songs: [],
    playlists: [
      {
        id: 'service',
        title: 'Sunday Kids',
        items: [{ id: 'item', title: 'Editable Slides', type: 'presentation', resourceId: 'p1' }],
      },
    ],
  };

  await store.save(data);
  loaded = await store.load();
  assert.equal(loaded.data.presentations[0].title, 'Editable Slides');
  assert.equal(loaded.data.presentations[0].groups[0].slides[0].text, 'Hello');

  const changed = structuredClone(data);
  changed.presentations[0].groups[0].slides[0].text = 'Changed and saved';
  await store.save(changed);

  loaded = await store.load();
  assert.equal(loaded.data.presentations[0].groups[0].slides[0].text, 'Changed and saved');

  const backup = JSON.parse(await fs.readFile(path.join(root, 'presenter-library.backup.json'), 'utf8'));
  assert.equal(backup.presentations[0].groups[0].slides[0].text, 'Hello');

  await fs.writeFile(path.join(root, 'presenter-library.json'), '{broken json', 'utf8');
  loaded = await store.load();
  assert.equal(loaded.recoveredFromBackup, true);
  assert.equal(loaded.data.presentations[0].groups[0].slides[0].text, 'Hello');

  await fs.rm(root, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
