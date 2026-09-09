# Roadmap

This roadmap is intentionally incremental. Reliability and familiar operator workflow take priority over feature count.

## v0.1 — Operator shell

Status: prototype complete.

- ProPresenter-style overall workspace
- Library / playlist navigation
- grouped slide thumbnails
- current/live state
- preview
- clear controls
- keyboard navigation
- media-bin shell

## v0.2 — Desktop foundation

Status: in development.

- Electron application shell
- React + TypeScript renderer
- separate operator and Audience windows
- IPC live-state relay
- typed playlist-item model
- explicit output-layer model
- Audience show/hide control
- browser prototype retained for quick visual testing

### Exit criteria

- app launches on macOS
- clicking a slide updates the Audience window
- browsing another presentation does not alter Audience output
- clear commands affect intended layers only
- closing/showing Audience output does not reset operator state

## v0.2.1 — Multi-output foundation

Status: implemented in source.

- generic logical screen model
- separate Audience and Stage state
- generic screen IPC instead of Audience-only IPC
- local Audience and Stage renderer windows
- automatic first/second external-display routing
- `local-display` and reserved `network` transports
- Stage current/next slide renderer
- output-window focus protection retained

### Deferred from v0.2.1

- network web server
- QR pairing
- tablet authentication
- explicit Screens configuration UI
- remote control

## v0.2.2 — Network Stage foundation

Status: implemented in source.

- built-in LAN HTTP server
- Android/browser Stage page
- SSE current/next Stage updates
- automatic reconnect
- random per-launch read-only Stage token
- operator Stage URL display
- connected client count
- no extra server dependency

### Still later

- QR code pairing
- persistent trusted devices
- explicit network interface selection
- remote-control permissions
- polished Stage themes / clocks / timers

## v0.3 — Resource library and motion backgrounds

Status: foundation implemented.

- add/remove persistent local or OneDrive-synced folders
- recursive media discovery
- folder-aware Media Bin filters
- manual rescan
- still background rendering
- looping motion background rendering
- media remains an independent layer behind slides

Still to build around the resource library:

- richer media metadata and thumbnails
- background assignment to individual slides/presentations

## v0.3.2 — Audience media foundation

Status: foundation implemented.

- still-image media
- video playback
- media backgrounds behind slides
- media clear semantics
- transitions kept intentionally simple initially
- correct aspect-ratio handling

## v0.3.1 — Song system foundation

Status: implemented in source.

- first-class Song entity and playlist item
- Slides + Track / Slides + Stems / Lyrics Video / Live Band modes
- Manual / Assisted / Auto lyric-control model
- timestamp lyric cue map
- per-song motion/still background assignment
- backing-track assignment from resource folders
- per-stem file assignment and enable/disable controls
- legacy lyrics-video trigger with embedded audio
- background vs full-video playback semantics

## v0.4 — Song Playback Engine

Status: implemented in source.

- master Web Audio transport
- Play / Pause / Resume / Stop / Seek
- secure indexed-resource audio loading through Electron IPC
- synchronized single backing-track playback
- synchronized multistem scheduling from one AudioContext clock
- live stem mute/unmute with stems remaining time-aligned
- master gain foundation
- stem-duration mismatch warning
- Auto Lyrics execution from transport time
- Assisted Lyrics next-cue countdown
- Audio Bin control remains available while browsing elsewhere
- Clear Audio stops the active transport

### Still to build around the transport

- persistent song configuration
- persistent stem presets (Full Backing / Live Piano / Live Drums etc.)
- cue-map editor / tap-to-time workflow
- richer metering and output-device selection
- optional multichannel audio-interface routing
- dedicated Lyrics Video transport controls

## v0.5 — Editing + persistence

Status: first editor/persistence pass implemented in source.

- versioned persistent presenter-library data
- first-run seed from demo content
- debounced autosave
- previous-save backup and recovery
- editable presentation names/categories
- Verse / Chorus / Bridge / Scripture / Generic group editing
- add/delete/reorder groups
- slide text and Stage-note editing
- add/delete/reorder slides
- editable Song names synchronized to linked presentation/service item

## v0.5.1 — Library + service management

Status: implemented in source.

- create new Presentation
- create new Song with linked lyrics presentation
- duplicate Presentation / Song with independent IDs
- delete library resources safely
- add saved Presentations/Songs to current service
- remove service references without deleting resources
- reorder current service items

### Next v0.5 passes

- multiple saved service playlists
- arrangements / repeat Verse-Chorus sections without duplicating source lyrics
- undo/redo
- cue-map editor / tap-to-time Auto Lyrics workflow
- themes / text formatting baseline
- more ProPresenter-like thumbnail behaviour

## v0.6 — Bible and timers

- Bible passage workflow
- countdown timers
- clocks
- timer playlist items
- message overlays groundwork

## v0.7 — Interactive tools foundation

- first-class `interactive` playlist item
- operator control surface + clean Audience surface
- built-in Spin the Wheel
- reusable tool lifecycle: prepare / show / reset / complete

## v0.8 — Web tools

- isolated local HTML web-tool runner
- Donuts Bingo integration candidate
- operator-vs-audience control separation
- sandbox / permissions model

## Later

- network Stage display / Android browser client
- Props / Messages / Announcements
- external media-provider integration (video downloader)
- CrowdLight integration
- MIDI / OSC
- remote control
- training exercises / scoring mode
- installer and auto-update strategy
