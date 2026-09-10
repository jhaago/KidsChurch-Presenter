import type { MediaAsset, Playlist, Presentation, Song } from '../domain/types';

export const presentations: Presentation[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    category: 'slides',
    groups: [
      {
        id: 'welcome-group',
        name: 'Welcome',
        type: 'generic',
        slides: [{ id: 'welcome-1', text: 'WELCOME\nKIDS CHURCH' }],
      },
    ],
  },
  {
    id: 'countdown',
    title: '5 Minute Countdown',
    category: 'timer',
    groups: [
      {
        id: 'countdown-group',
        name: 'Countdown',
        type: 'generic',
        slides: [{ id: 'countdown-1', text: 'KIDS CHURCH STARTS SOON\n05:00' }],
      },
    ],
  },
  {
    id: 'light-of-hope',
    title: 'Light of Hope',
    category: 'song',
    groups: [
      {
        id: 'loh-v1',
        name: 'Verse 1',
        type: 'verse',
        slides: [
          { id: 'loh-v1-1', text: 'When the morning opens wide\nWe will lift our eyes' },
          { id: 'loh-v1-2', text: 'Every step and every song\nYou are by our side' },
        ],
      },
      {
        id: 'loh-c1',
        name: 'Chorus',
        type: 'chorus',
        slides: [
          { id: 'loh-c1-1', text: 'Shine, light of hope\nBright for all to see' },
          { id: 'loh-c1-2', text: 'Lead us on in love and truth\nWhere You call, we’ll be' },
        ],
      },
      {
        id: 'loh-v2',
        name: 'Verse 2',
        type: 'verse',
        slides: [
          { id: 'loh-v2-1', text: 'When the road is hard to see\nWe will trust Your way' },
          { id: 'loh-v2-2', text: 'You are faithful through the night\nAnd into the day' },
        ],
      },
      {
        id: 'loh-b1',
        name: 'Bridge',
        type: 'bridge',
        slides: [
          { id: 'loh-b1-1', text: 'Here we stand, hearts awake\nReady for Your call' },
          { id: 'loh-b1-2', text: 'Love will lead us, grace will hold us\nYou are over all' },
        ],
      },
    ],
  },
  {
    id: 'bible-mark',
    title: 'Bible — Mark 10:13–16',
    category: 'scripture',
    groups: [
      {
        id: 'mark-10',
        name: 'Mark 10:13–16',
        type: 'scripture',
        slides: [
          { id: 'mk-13', text: 'MARK 10:13\nPeople were bringing little children to Jesus.' },
          { id: 'mk-14', text: 'MARK 10:14\nJesus said, “Let the little children come to me.”' },
          { id: 'mk-16', text: 'MARK 10:16\nHe took the children in his arms and blessed them.' },
        ],
      },
    ],
  },
  {
    id: 'message',
    title: 'Message Slides',
    category: 'slides',
    groups: [
      {
        id: 'message-group',
        name: 'Message',
        type: 'generic',
        slides: [{ id: 'message-1', text: 'TODAY\nJESUS WELCOMES CHILDREN' }],
      },
    ],
  },
  {
    id: 'memory',
    title: 'Memory Verse',
    category: 'slides',
    groups: [
      {
        id: 'memory-group',
        name: 'Memory Verse',
        type: 'generic',
        slides: [{ id: 'memory-1', text: 'MEMORY VERSE\nMARK 10:14' }],
      },
    ],
  },
  {
    id: 'closing',
    title: 'Closing Song',
    category: 'song',
    groups: [
      {
        id: 'closing-group',
        name: 'Closing',
        type: 'generic',
        slides: [{ id: 'closing-1', text: 'CLOSING SONG' }],
      },
    ],
  },
  {
    id: 'announcements',
    title: 'Announcements',
    category: 'slides',
    groups: [
      {
        id: 'announcements-group',
        name: 'Announcements',
        type: 'generic',
        slides: [{ id: 'ann-1', text: 'NEXT WEEK\nBRING A FRIEND' }],
      },
    ],
  },
];

export const mediaAssets: MediaAsset[] = [
  { id: 'media-1', title: 'Blue Motion', kind: 'motion', source: 'generated' },
  { id: 'media-2', title: 'Soft Particles', kind: 'motion', source: 'generated' },
  { id: 'media-3', title: 'Kids Church Logo', kind: 'still', source: 'generated' },
  { id: 'media-4', title: 'Warm Gradient', kind: 'still', source: 'generated' },
  { id: 'intro-video', title: 'Kids Church Intro Video', kind: 'video', source: 'local' },
];

export const songs: Song[] = [
  {
    id: 'song-light-of-hope',
    title: 'Light of Hope',
    presentationId: 'light-of-hope',
    playbackMode: 'slides-track',
    lyricControlMode: 'manual',
    backgroundAssetId: 'media-1',
    audio: {
      mode: 'single-track',
      masterGainDb: 0,
      stems: [
        { id: 'loh-drums', name: 'Drums', role: 'drums', enabled: true, gainDb: 0 },
        { id: 'loh-bass', name: 'Bass', role: 'bass', enabled: true, gainDb: 0 },
        { id: 'loh-piano', name: 'Piano', role: 'piano', enabled: true, gainDb: 0 },
        { id: 'loh-acoustic', name: 'Acoustic', role: 'acoustic', enabled: true, gainDb: 0 },
        { id: 'loh-bgv', name: 'Backing Vocals', role: 'bgv', enabled: true, gainDb: 0 },
      ],
    },
    arrangement: [
      { id: 'loh-arr-v1', groupId: 'loh-v1' },
      { id: 'loh-arr-c1-a', groupId: 'loh-c1' },
      { id: 'loh-arr-v2', groupId: 'loh-v2' },
      { id: 'loh-arr-c1-b', groupId: 'loh-c1' },
      { id: 'loh-arr-b1', groupId: 'loh-b1' },
      { id: 'loh-arr-c1-c', groupId: 'loh-c1' },
    ],
    lyricCues: [
      { id: 'loh-cue-1', timeMs: 0, slideId: 'loh-v1-1', arrangementEntryId: 'loh-arr-v1', label: 'Verse 1 · Slide 1' },
      { id: 'loh-cue-2', timeMs: 12000, slideId: 'loh-v1-2', arrangementEntryId: 'loh-arr-v1', label: 'Verse 1 · Slide 2' },
      { id: 'loh-cue-3', timeMs: 24000, slideId: 'loh-c1-1', arrangementEntryId: 'loh-arr-c1-a', label: 'Chorus · 1/3 · Slide 3' },
      { id: 'loh-cue-4', timeMs: 36000, slideId: 'loh-c1-2', arrangementEntryId: 'loh-arr-c1-a', label: 'Chorus · 1/3 · Slide 4' },
      { id: 'loh-cue-5', timeMs: 50000, slideId: 'loh-v2-1', arrangementEntryId: 'loh-arr-v2', label: 'Verse 2 · Slide 5' },
      { id: 'loh-cue-6', timeMs: 62000, slideId: 'loh-v2-2', arrangementEntryId: 'loh-arr-v2', label: 'Verse 2 · Slide 6' },
      { id: 'loh-cue-7', timeMs: 76000, slideId: 'loh-c1-1', arrangementEntryId: 'loh-arr-c1-b', label: 'Chorus · 2/3 · Slide 7' },
      { id: 'loh-cue-8', timeMs: 88000, slideId: 'loh-c1-2', arrangementEntryId: 'loh-arr-c1-b', label: 'Chorus · 2/3 · Slide 8' },
      { id: 'loh-cue-9', timeMs: 102000, slideId: 'loh-b1-1', arrangementEntryId: 'loh-arr-b1', label: 'Bridge · Slide 9' },
      { id: 'loh-cue-10', timeMs: 114000, slideId: 'loh-b1-2', arrangementEntryId: 'loh-arr-b1', label: 'Bridge · Slide 10' },
      { id: 'loh-cue-11', timeMs: 128000, slideId: 'loh-c1-1', arrangementEntryId: 'loh-arr-c1-c', label: 'Chorus · 3/3 · Slide 11' },
      { id: 'loh-cue-12', timeMs: 140000, slideId: 'loh-c1-2', arrangementEntryId: 'loh-arr-c1-c', label: 'Chorus · 3/3 · Slide 12' },
    ],
  },
  {
    id: 'song-closing',
    title: 'Closing Song',
    presentationId: 'closing',
    playbackMode: 'lyrics-video',
    lyricControlMode: 'manual',
    audio: {
      mode: 'embedded-video',
      masterGainDb: 0,
      stems: [],
    },
    lyricCues: [],
  },
];

export const sundayKidsPlaylist: Playlist = {
  id: 'sunday-kids',
  title: 'Sunday Kids',
  items: [
    { id: 'pi-welcome', title: 'Welcome', type: 'presentation', resourceId: 'welcome' },
    { id: 'pi-countdown', title: '5 Minute Countdown', type: 'timer', resourceId: 'countdown' },
    { id: 'pi-song', title: 'Light of Hope', type: 'song', resourceId: 'song-light-of-hope' },
    { id: 'pi-video', title: 'Kids Church Intro Video', type: 'media', resourceId: 'intro-video' },
    { id: 'pi-bible', title: 'Bible — Mark 10:13–16', type: 'bible', resourceId: 'bible-mark' },
    { id: 'pi-message', title: 'Message Slides', type: 'presentation', resourceId: 'message' },
    { id: 'pi-wheel', title: 'Spin the Wheel', type: 'interactive' },
    { id: 'pi-bingo', title: 'Donuts Bingo', type: 'web-tool' },
    { id: 'pi-memory', title: 'Memory Verse', type: 'presentation', resourceId: 'memory' },
    { id: 'pi-closing', title: 'Closing Song', type: 'song', resourceId: 'song-closing' },
    { id: 'pi-announcements', title: 'Announcements', type: 'presentation', resourceId: 'announcements' },
  ],
};

export const presentationById = (id?: string) => presentations.find((presentation) => presentation.id === id);
export const mediaById = (id?: string) => mediaAssets.find((asset) => asset.id === id);
export const songById = (id?: string) => songs.find((song) => song.id === id);
