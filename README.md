# KidsChurch Presenter

KidsChurch Presenter is a ProPresenter-familiar presentation application designed for Kids Church.

The first goal is **training compatibility**: a young operator should learn the same core mental model they will later encounter in ProPresenter — library, playlist, presentation, slide groups, live output, clear layers, media, Audience output, and eventually Stage output.

The second goal is to extend that workflow where Kids Church benefits from it, especially interactive tools, local web apps, games, timers, quizzes, and optional integrations such as a video-downloader/import service and CrowdLight.

## Current status

**v0.5.1-alpha.1 — Library + Service Management**

Implemented in source:

- Electron desktop application shell
- React + TypeScript operator renderer
- separate Operator, Audience and Stage windows
- separate Audience and Stage live state
- generic screen assignment model with `local-display` and `network` transports
- built-in LAN Stage web server for Android/tablet browsers
- read-only Server-Sent Events Stage updates with per-launch session token
- operator display of Stage URL and connected tablet count
- automatic local routing: Audience to the first external display and Stage to the second when available
- explicit Windows x64 installer target
- operator selection kept separate from live output
- ProPresenter-style independent output layers
- slide triggering and live-state indication
- next / previous navigation
- Clear All / Slide / Media / Props / Audio / Message / Logo / Black controls
- keyboard shortcuts for the current clear/navigation set
- Media Bin shell and media-layer triggering
- typed playlist items for presentations, media, Bible, timers, interactive tools and web tools
- demo Kids Church service
- placeholder first-class playlist entries for **Spin the Wheel** and **Donuts Bingo**
- an optional external-media-provider interface for future integration with the separate video downloader
- persistent local/OneDrive-synced resource folders
- recursive media scanning and per-folder Media Bin filters
- still-image and looping motion backgrounds behind live slide text
- direct playback from library folders without copying the source files
- first-class `song` playlist items
- song playback modes: Slides + Track, Slides + Stems, Lyrics Video, Live Band
- lyric-control modes: Manual, Assisted, Auto
- per-song background assignment
- backing-track and per-stem resource assignment
- per-stem enable/disable state for future live-musician substitutions
- timestamp cue maps for Assisted/Auto lyrics
- legacy lyrics-video triggering with embedded audio
- video/background playback semantics separated: full videos are audible/non-looping; motion backgrounds are muted/looping
- Web Audio master Song transport with Play / Pause / Resume / Stop / Seek
- backing tracks loaded from approved resource-library audio assets
- multistem playback scheduled from one shared AudioContext clock
- live stem mute/unmute without restarting or losing synchronization
- stem-duration mismatch warning
- Audio Bin transport that remains available while browsing other service items
- Auto Lyrics cue execution from the same transport position
- Assisted Lyrics next-cue countdown from the same timing map
- F5 / Clear Audio now stops the real song transport
- versioned persistent presenter library stored in the desktop app data folder
- atomic/debounced autosave with previous-save backup recovery
- editable presentation names/categories
- editable Verse / Chorus / Bridge / Scripture / Generic slide groups
- add/delete/reorder slide groups
- edit slide text and Stage notes
- add/delete/reorder slides within groups
- editable Song names with linked lyrics-presentation/service-title synchronization
- live Audience/Stage text updates when the currently-live slide is edited
- create new Presentations and Songs from the Library pane
- saved Song resources automatically create linked lyric presentations
- duplicate Presentations with fresh group/slide IDs
- duplicate Songs with fresh presentation/stem/cue IDs while preserving assigned media/audio
- delete Presentation/Song resources with service-reference cleanup
- add any saved Presentation/Song back into the current service
- remove an item from the service without deleting its library resource
- move service items up/down while preserving live output
- Library pane now lists saved Presentation/Song resources independently from the current service

## Run on macOS or Windows

Prerequisites:

- Node.js
- npm

From a terminal in the repository:

```bash
npm install
npm run dev
```

The app should open the Operator window. Use the **Audience** and **Stage** controls in the toolbar to show/hide those logical outputs.

With one external display, Audience uses it and local Stage falls back to a normal development window. With two external displays, Audience uses the first and local Stage uses the second. In addition, the app starts a LAN Stage server and shows its tablet URL in the operator inspector. A tablet on the same reachable local network can open that URL in a browser and receive the separate Stage CURRENT/NEXT view.

### Production-style build

```bash
npm run build
npm start
```

### Windows installer

Windows is now an explicit first-class build target:

```bash
npm run dist:win
```

This produces an NSIS setup executable in `release/`. Code signing is not configured yet for the alpha.

### macOS disk image

```bash
npm run dist:mac
```

See `docs/WINDOWS.md` for the Windows laptop + projector setup and test checklist.

## Resource folders

Use the **+** button in the Library panel to add any normal folder visible to Windows or macOS. A synced OneDrive folder works because Presenter reads the local synced filesystem path; no Microsoft sign-in is required inside Presenter.

The current v0.3 scanner recognises:

- stills: JPG, JPEG, PNG, WEBP, GIF, BMP
- motion/video resources: MP4, WEBM, M4V, MOV
- audio resources: MP3, WAV, M4A, AAC, OGG, FLAC

For service reliability, OneDrive media that will be used live should be marked **Always keep on this device** so playback never depends on downloading a cloud placeholder during a service.

Motion resources imported from resource folders are treated as looping backgrounds and can coexist with the Slide layer.

## Song system

A Song is now a first-class resource rather than just a presentation with song-shaped slides. Each song can select one of four operating modes:

- **Slides + Track** — operator-controlled lyrics, optional motion background, one backing track
- **Slides + Stems** — operator-controlled lyrics with independently selectable stems
- **Lyrics Video** — retain an existing MP4/video with its own kid-friendly graphics and embedded audio
- **Live Band** — lyrics only, no backing audio

Lyrics can independently be configured as **Manual**, **Assisted**, or **Auto**. The cue map is part of the Song model now; synchronized audio transport and automatic cue execution are the next audio-engine pass.

The Song transport now uses the Web Audio API. Assigned stems are decoded and scheduled against one shared AudioContext start time, rather than starting independent HTML audio elements. Muted stems remain on the shared timeline at zero gain, so a stem can be switched on during playback without restarting it.

**Auto Lyrics** uses the exact same transport position as the backing track/stems. **Assisted** mode leaves slide control with the operator but displays the next stored cue and countdown. Song and presentation configuration is now persisted automatically in the desktop app data folder.

## Library and service management

The left side now distinguishes **saved library resources** from **items in the current service**.

- **New Slides** creates a saved Presentation and adds it to the current service.
- **New Song** creates a Song plus its linked lyrics presentation and adds the Song to the service.
- The **+** beside any library resource adds another service reference to it.
- **Duplicate** makes a genuinely independent copy of the selected Presentation or Song.
- **Delete** removes the underlying resource and cleans up its service references; external audio/video files are never deleted.
- The arrows beside a service item reorder that service.
- **×** beside a service item removes only that service reference, leaving the library resource available to add again later.

Removing/reordering service items does not clear whatever is already live on Audience or Stage.

## Editing and persistence

Select a presentation or Song and use **Edit** in the central workspace.

The current editor supports:

- presentation/category rename for ordinary presentations
- Song rename from Song Setup
- Verse / Chorus / Bridge / Scripture / Generic group types
- group rename, add, delete and reorder
- slide text editing
- Stage notes per slide
- slide add, delete and reorder

Changes autosave after a short debounce. The desktop process owns the saved JSON file and keeps the previous successful save as a backup. If the primary library file is unreadable on launch, Presenter attempts to recover the backup.

The built-in demo service is now only the first-run seed. After the first successful save, the editable saved library becomes the source of truth.

## Song Playback Engine test

For a real test, add a OneDrive/local folder containing a backing track or WAV stems, then configure **Light of Hope**:

1. choose **Slides + Track** and assign an audio resource
2. press **Play**, then Pause / Resume / Seek / Stop
3. switch lyrics to **Assisted** and confirm the next-cue countdown moves with the track
4. switch lyrics to **Auto** and confirm lyric slides follow the stored cue map
5. choose **Slides + Stems**, assign multiple stems exported from the same zero point, and start playback
6. mute/unmute a stem while playing and confirm the other stems do not restart
7. browse another service item, open the **Audio** tab, and confirm the active song remains controllable
8. use **Clear Audio / F5** and confirm playback stops

For production stem files, export every stem from the same start and end points. Presenter warns when decoded stem durations differ by more than 250 ms.

## First desktop test checklist

1. Launch the app.
2. Select **Light of Hope**.
3. Click a slide and confirm it becomes LIVE.
4. Open **Audience** and confirm the same slide appears there.
5. Browse another playlist item without triggering anything; Audience should not change.
6. Return to the song and use Left/Right arrow navigation.
7. Trigger a Media Bin item; it should coexist with the slide layer.
8. Clear Slide; media should remain.
9. Clear Media.
10. Test F1/F2/F3 and F12.
11. Toggle Black and confirm underlying state returns when Black is removed.
12. If a second display is attached, verify Audience uses it.

## Core architectural rules

1. **Operator selection is not live output.** Browsing a presentation must never implicitly change what the audience sees.
2. **Output is layered.** Slide, media, prop, message, announcement, audio and live-video states are represented independently.
3. **Logical screens are separate.** Audience and Stage have independent state and receive it through a narrow generic IPC bridge.
4. **Playlist items are typed.** The playlist is not restricted to ordinary slide presentations.
5. **Integrations remain optional and isolated.** Downloader, CrowdLight and future services must not be able to destabilise the core presentation engine.
6. **ProPresenter familiarity wins over arbitrary simplification** where training value is involved.

## Planned playlist item types

- `presentation`
- `song`
- `media`
- `bible`
- `timer`
- `interactive`
- `web-tool`

## Integration direction

External media acquisition is deliberately behind a provider interface. The future presentation-side flow is:

```text
Add Media
  -> choose provider
  -> provider acquires the file
  -> KidsChurch Presenter imports/manages the result
  -> Media Library / playlist references the managed asset
```

The live presentation engine must continue to work if an external provider is unavailable or fails.

## Project philosophy

KidsChurch Presenter is not intended to copy Renewed Vision branding or proprietary artwork. It intentionally mirrors familiar presentation concepts and operating workflow while using its own implementation and visual identity.

See `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PROPRESENTER-COMPATIBILITY.md`, and `docs/WINDOWS.md` for the current design direction.
