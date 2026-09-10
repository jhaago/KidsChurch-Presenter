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
    songs: [
      {
        id: 'song1',
        title: 'Arrangement Test',
        presentationId: 'p1',
        playbackMode: 'slides-track',
        lyricControlMode: 'auto',
        audio: { mode: 'single-track', masterGainDb: 0, stems: [] },
        arrangement: [
          { id: 'arr-verse', groupId: 'g1' },
          { id: 'arr-repeat', groupId: 'g1' },
        ],
        lyricCues: [
          { id: 'cue-1', timeMs: 1000, slideId: 's1', arrangementEntryId: 'arr-verse' },
          { id: 'cue-2', timeMs: 5000, slideId: 's1', arrangementEntryId: 'arr-repeat' },
        ],
      },
    ],
    playlists: [
      {
        id: 'service',
        title: 'Sunday Kids',
        serviceDate: '2026-09-13',
        items: [{ id: 'item', title: 'Editable Slides', type: 'presentation', resourceId: 'p1' }],
      },
      {
        id: 'service-next',
        title: 'Sunday Kids Next Week',
        items: [],
      },
    ],
    activePlaylistId: 'service-next',
  };

  await store.save(data);
  loaded = await store.load();
  assert.equal(loaded.data.presentations[0].title, 'Editable Slides');
  assert.equal(loaded.data.presentations[0].groups[0].slides[0].text, 'Hello');
  assert.equal(loaded.data.playlists.length, 2);
  assert.equal(loaded.data.playlists[0].serviceDate, '2026-09-13');
  assert.equal(loaded.data.activePlaylistId, 'service-next');
  assert.equal(loaded.data.songs[0].arrangement.length, 2);
  assert.equal(loaded.data.songs[0].lyricCues[1].arrangementEntryId, 'arr-repeat');

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
