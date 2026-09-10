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
        themeId: 'clean',
        format: { fontSizeVw: 5.2, textColor: '#ffeeaa' },
        layout: { xPercent: 10, yPercent: 15, widthPercent: 80, heightPercent: 60 },
        backgroundAssetId: 'bg-main',
        groups: [
          {
            id: 'g1',
            name: 'Group',
            type: 'generic',
            slides: [{
              id: 's1',
              text: 'Hello',
              format: { textAlign: 'left', uppercase: true },
              layout: { xPercent: 18, yPercent: 20, widthPercent: 64, heightPercent: 30 },
              elements: [
                {
                  id: 'el-text-1',
                  type: 'text',
                  name: 'Reference',
                  groupId: 'group-lower-third',
                  text: 'John 3:16',
                  layout: { xPercent: 68, yPercent: 82, widthPercent: 26, heightPercent: 10 },
                  format: { fontSizeVw: 2.8, textAlign: 'right' },
                  opacity: 0.9,
                },
                {
                  id: 'el-image-1',
                  type: 'image',
                  name: 'Logo',
                  assetId: 'image-logo',
                  layout: { xPercent: 4, yPercent: 5, widthPercent: 15, heightPercent: 15 },
                  fit: 'contain',
                  opacity: 0.8,
                },
                {
                  id: 'el-shape-1',
                  type: 'shape',
                  name: 'Lower Third Bar',
                  groupId: 'group-lower-third',
                  shape: 'rectangle',
                  layout: { xPercent: 8, yPercent: 76, widthPercent: 84, heightPercent: 14 },
                  fillColor: '#224466',
                  borderColor: '#ffffff',
                  borderWidth: 2,
                  opacity: 0.7,
                },
              ],
              layerOrder: ['el-image-1', 'el-shape-1', '__primary__', 'el-text-1'],
              primaryGroupId: 'group-primary-logo',
              backgroundAssetId: null,
            }],
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
    customThemes: [
      {
        id: 'theme-user-1',
        name: 'Kids Song',
        description: 'Reusable test theme',
        format: {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSizeVw: 5.8,
          fontWeight: 700,
          lineHeight: 1.1,
          textAlign: 'center',
          verticalAlign: 'middle',
          textColor: '#ffffff',
          shadow: true,
          uppercase: true,
          marginPercent: 9,
        },
        layout: { xPercent: 8, yPercent: 55, widthPercent: 84, heightPercent: 30 },
        templateElements: [
          {
            id: 'theme-shape-1',
            type: 'shape',
            name: 'Theme Lower Bar',
            shape: 'rectangle',
            layout: { xPercent: 5, yPercent: 82, widthPercent: 90, heightPercent: 12 },
            fillColor: '#113355',
            borderColor: '#ffffff',
            borderWidth: 0,
            opacity: 0.65,
          },
          {
            id: 'theme-text-1',
            type: 'text',
            name: 'Theme Label',
            text: 'KIDS CHURCH',
            groupId: 'theme-group-1',
            layout: { xPercent: 6, yPercent: 84, widthPercent: 30, heightPercent: 8 },
            format: { fontSizeVw: 2.4, textAlign: 'left' },
            opacity: 1,
          },
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
  assert.equal(loaded.data.presentations[0].themeId, 'clean');
  assert.equal(loaded.data.presentations[0].format.fontSizeVw, 5.2);
  assert.equal(loaded.data.presentations[0].backgroundAssetId, 'bg-main');
  assert.equal(loaded.data.presentations[0].layout.widthPercent, 80);
  assert.equal(loaded.data.presentations[0].groups[0].slides[0].format.textAlign, 'left');
  assert.equal(loaded.data.presentations[0].groups[0].slides[0].layout.xPercent, 18);
  assert.equal(loaded.data.presentations[0].groups[0].slides[0].backgroundAssetId, null);
  assert.equal(loaded.data.presentations[0].groups[0].slides[0].elements.length, 3);
  assert.equal(loaded.data.presentations[0].groups[0].slides[0].elements[0].text, 'John 3:16');
  assert.equal(loaded.data.presentations[0].groups[0].slides[0].elements[1].assetId, 'image-logo');
  assert.equal(loaded.data.presentations[0].groups[0].slides[0].elements[2].shape, 'rectangle');
  assert.equal(loaded.data.presentations[0].groups[0].slides[0].elements[2].borderWidth, 2);
  assert.equal(loaded.data.presentations[0].groups[0].slides[0].elements[0].groupId, 'group-lower-third');
  assert.equal(loaded.data.presentations[0].groups[0].slides[0].elements[2].groupId, 'group-lower-third');
  assert.equal(loaded.data.presentations[0].groups[0].slides[0].primaryGroupId, 'group-primary-logo');
  assert.deepEqual(
    loaded.data.presentations[0].groups[0].slides[0].layerOrder,
    ['el-image-1', 'el-shape-1', '__primary__', 'el-text-1'],
  );
  assert.equal(loaded.data.customThemes.length, 1);
  assert.equal(loaded.data.customThemes[0].name, 'Kids Song');
  assert.equal(loaded.data.customThemes[0].layout.yPercent, 55);
  assert.equal(loaded.data.customThemes[0].templateElements.length, 2);
  assert.equal(loaded.data.customThemes[0].templateElements[0].shape, 'rectangle');
  assert.equal(loaded.data.customThemes[0].templateElements[1].groupId, 'theme-group-1');
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
