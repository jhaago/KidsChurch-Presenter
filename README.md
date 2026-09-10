# KidsChurch Presenter

KidsChurch Presenter is a ProPresenter-familiar presentation application designed for Kids Church.

The first goal is **training compatibility**: a young operator should learn the same core mental model they will later encounter in ProPresenter — library, playlist, presentation, slide groups, live output, clear layers, media, Audience output, and eventually Stage output.

The second goal is to extend that workflow where Kids Church benefits from it, especially interactive tools, local web apps, games, timers, quizzes, and optional integrations such as a video-downloader/import service and CrowdLight.

## Current status

**v0.5.5-alpha.1 — Editing History + Formatting Foundation**

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
- multiple persistent service playlists sharing the same library
- New / Duplicate / Delete / Switch Service workflow
- editable service title, date and optional note
- empty services are valid and can be built from the shared library
- active service selection persists across app restarts
- switching or deleting a service does not clear already-live Audience/Stage output
- resource renames and deletes propagate safely across every saved service
- dedicated Song Timing Editor using an isolated preview transport
- tap-to-time workflow: Space/Tap records the next lyric slide at the exact Web Audio playhead
- Backspace undo and Escape disarm during tap mode
- new timing pass can replace an existing cue map in one guided workflow
- per-cue Set Now, seek, delete and direct time entry
- ±10 ms and ±100 ms cue fine adjustment
- visual cue markers across the preview timeline
- incomplete cue count / timing-complete status
- one-click switch to Auto Lyrics when every lyric slide has a cue
- timing preview never sends slides/backgrounds to Audience or Stage
- live-song guard prevents a timing preview from mixing over an actively playing service track
- reusable Song Arrangement model separate from source lyric groups
- repeat Verse / Chorus / Bridge sections without duplicating source slides
- dedicated Arrangement editor with Add / Repeat / Remove / Move controls
- arrangement-aware slide thumbnails and sequence numbering
- Left/Right live navigation follows repeated arrangement occurrences correctly
- Stage CURRENT/NEXT follows the arrangement rather than source-group order
- Auto Lyrics cues are tied to arrangement occurrence IDs, so repeated Choruses can have different timestamps
- Timing Editor now follows the complete arranged lyric sequence
- arrangement edits clear stale timing cues with an explicit warning
- deleting source groups sanitizes stale arrangement/cue references
- duplicated Songs receive independent arrangement IDs and remapped cue occurrence IDs
- Presentation Editor undo/redo with Ctrl/Cmd+Z, Ctrl/Cmd+Y and Shift+Cmd+Z
- typing edits are coalesced into useful undo steps rather than one character per history entry
- reusable built-in presentation Theme presets
- presentation-wide font, size, weight, line-height, alignment, vertical position, colour, shadow, uppercase and margin controls
- presentation-wide still/motion background assignment
- optional per-slide text-format overrides
- optional per-slide background override, including explicit No Background
- slide thumbnails reflect resolved formatting and local still/motion backgrounds
- Audience output renders the saved resolved format rather than a hard-coded text style
- live slide formatting updates when the currently-live slide is edited
- Song Setup remains the owner of the default Song background; individual lyric slides can override it

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

Lyrics can independently be configured as **Manual**, **Assisted**, or **Auto**. The cue map is persisted with the Song, follows the same transport clock as the audio engine, and can now be created with the built-in tap-to-time editor.

The Song transport now uses the Web Audio API. Assigned stems are decoded and scheduled against one shared AudioContext start time, rather than starting independent HTML audio elements. Muted stems remain on the shared timeline at zero gain, so a stem can be switched on during playback without restarting it.

**Auto Lyrics** uses the exact same transport position as the backing track/stems. **Assisted** mode leaves slide control with the operator but displays the next stored cue and countdown. Song and presentation configuration is now persisted automatically in the desktop app data folder.

## Multiple saved services

Presenter now stores a collection of services rather than only one current playlist. The existing saved **Sunday Kids** service is preserved and becomes the first service automatically.

The **SERVICES** section supports:

- **New** — create an empty service
- **Duplicate Service** — copy the service order while keeping references to the same library resources
- **Delete Service** — remove only that service; library Songs, Presentations and media remain
- click any saved service to switch the operator workspace to it
- edit the active service name, date and optional note directly above its service order

A duplicated service receives fresh playlist-item IDs, so its order can be edited independently without duplicating the underlying Songs/Presentations.

Switching services changes preparation context only. Existing Audience/Stage output and an already-running Song transport are intentionally left alone.

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

## Presentation formatting and undo/redo

The Presentation Editor now has an application-level editing history for presentation changes.

- **Ctrl/Cmd+Z** — Undo
- **Ctrl/Cmd+Y** — Redo
- **Shift+Cmd+Z** — Redo on macOS
- Undo/Redo buttons are also available in the editor header
- continuous typing in the same field is grouped into a sensible history step

The first Theme/formatting foundation is also implemented. A presentation can choose a reusable built-in Theme and then apply presentation-wide overrides for font family, size, weight, line height, horizontal alignment, vertical position, text colour, shadow, uppercase and safe-area margin.

Still or motion backgrounds can be assigned to ordinary presentations. Songs continue to use **Song Setup** for their default background so there is only one clear owner for that setting.

Each individual slide can optionally override the presentation text format and/or background. A slide can inherit the presentation/Song background, choose another still/motion resource, or explicitly choose **No Background**.

Formatting is saved in the presenter library and resolved into the live Audience state. Slide thumbnails use the same resolved formatting rules so the operator sees a useful approximation before triggering the slide.

## Song Arrangements

Songs now separate **source lyrics** from the **live arrangement**.

For example, source lyrics can remain:

```text
Verse 1
Chorus
Verse 2
Bridge
```

while the Arrangement is:

```text
Verse 1
Chorus
Verse 2
Chorus
Bridge
Chorus
```

The repeated Chorus occurrences all reference the same source Chorus slides. Editing the Chorus text once updates every occurrence.

Choose **Arrange** in a Song workspace to open the Arrangement editor. Source sections can be appended, existing occurrences can be repeated, removed, or moved up/down, and the arrangement can be reset to the source order.

Each occurrence has its own stable arrangement-entry ID. This lets the same lyric slide appear several times while Manual navigation, Stage NEXT, Assisted/Auto Lyrics and the Timing Editor still know which occurrence is current.

Changing arrangement structure clears the existing timing map after confirmation because timestamps belong to the previous sequence. The Timing Editor then records a fresh cue for every arranged slide occurrence.

## Song Timing Editor

For Songs using **Slides + Track** or **Slides + Stems**, choose **Timing** in the central workspace.

The timing editor uses a separate preview transport from the live service transport. Preview audio is heard locally, but opening/timing slides does not alter Audience or Stage output.

A normal timing pass is:

1. assign the real backing track or stems in Song Setup
2. open **Timing**
3. choose **Start New Tap Pass**
4. listen to the song
5. press **Space** (or the large Tap button) whenever the next lyric slide should appear
6. use **Backspace** to undo the previous tap if you were early/late
7. Presenter pauses the preview when the last slide is captured
8. review/nudge individual cue times
9. choose **Use Auto Lyrics** once the timing map is complete

Individual cues support direct seconds entry, **Set Now**, seek-to-cue, deletion, and ±10/±100 ms adjustments. Cues autosave as part of the Song.

The timing editor follows the Song Arrangement. Repeated sections receive separate cue occurrences and can therefore have different timestamps while still sharing the same source lyric slides.

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
