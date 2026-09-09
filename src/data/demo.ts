import type { MediaAsset, Playlist, Presentation } from '../domain/types';

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

export const sundayKidsPlaylist: Playlist = {
  id: 'sunday-kids',
  title: 'Sunday Kids',
  items: [
    { id: 'pi-welcome', title: 'Welcome', type: 'presentation', resourceId: 'welcome' },
    { id: 'pi-countdown', title: '5 Minute Countdown', type: 'timer', resourceId: 'countdown' },
    { id: 'pi-song', title: 'Light of Hope', type: 'presentation', resourceId: 'light-of-hope' },
    { id: 'pi-video', title: 'Kids Church Intro Video', type: 'media', resourceId: 'intro-video' },
    { id: 'pi-bible', title: 'Bible — Mark 10:13–16', type: 'bible', resourceId: 'bible-mark' },
    { id: 'pi-message', title: 'Message Slides', type: 'presentation', resourceId: 'message' },
    { id: 'pi-wheel', title: 'Spin the Wheel', type: 'interactive' },
    { id: 'pi-bingo', title: 'Donuts Bingo', type: 'web-tool' },
    { id: 'pi-memory', title: 'Memory Verse', type: 'presentation', resourceId: 'memory' },
    { id: 'pi-closing', title: 'Closing Song', type: 'presentation', resourceId: 'closing' },
    { id: 'pi-announcements', title: 'Announcements', type: 'presentation', resourceId: 'announcements' },
  ],
};

export const presentationById = (id?: string) => presentations.find((presentation) => presentation.id === id);
export const mediaById = (id?: string) => mediaAssets.find((asset) => asset.id === id);
