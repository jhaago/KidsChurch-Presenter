import assert from 'node:assert/strict';
import { genericSlidesFromText, songStructureFromLyrics } from '../src/domain/quickCreate.ts';

const song = songStructureFromLyrics(`
[Verse 1]
Line one
Line two
Line three

[Chorus]
Shared one
Shared two

[Chorus]
Shared one
Shared two
`, 2);

assert.deepEqual(song.groups.map((group) => group.name), ['Verse 1', 'Chorus']);
assert.equal(song.groups[0].slides.length, 2);
assert.equal(song.arrangement.length, 3);
assert.equal(song.arrangement[1].groupId, song.arrangement[2].groupId);

const slides = genericSlidesFromText('First slide\n\nSecond slide', 4);
assert.equal(slides.length, 2);
assert.equal(slides[0].text, 'First slide');
assert.equal(slides[1].text, 'Second slide');
