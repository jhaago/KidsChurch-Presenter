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

## v0.5.2 — Multiple saved services

Status: implemented in source.

- persistent collection of services/playlists
- active service persisted across restart
- create empty service
- duplicate service with independent playlist-item IDs
- rename service inline
- optional service date and note
- delete/switch services without altering live output
- library resource rename/delete propagation across all services
- empty-service operator state

## v0.5.3 — Song Timing Editor

Status: implemented in source.

- isolated local preview transport separate from live Song output
- Start New Tap Pass workflow
- Space/Tap records the next lyric slide from the high-resolution Web Audio playhead
- Backspace undo / Escape disarm shortcuts
- cue replacement and incomplete-cue continuation
- per-cue Set Now / seek / delete controls
- direct cue-time entry
- ±10 ms / ±100 ms fine adjustment
- cue-marker timeline
- timing completeness summary
- one-click Auto Lyrics enable when all current lyric slides are timed
- no Audience/Stage changes while timing
- guard against preview/live backing-track overlap

## v0.5.4 — Song Arrangements

Status: implemented in source.

- source lyric groups remain single editable resources
- ordered arrangement entries reference source groups
- repeat sections without duplicating source slides
- Add / Repeat / Remove / Move arrangement controls
- reset to source order
- stable per-occurrence arrangement IDs
- arrangement-aware thumbnail/live selection
- Left/Right navigation follows repeated occurrences
- Stage CURRENT/NEXT follows arrangement sequence
- Auto Lyrics supports multiple cues for the same source slide via occurrence IDs
- Timing Editor follows arranged occurrences
- structural arrangement changes clear stale timing maps with confirmation
- source-group deletion sanitizes arrangement/cue references
- Song duplication remaps arrangement/cue occurrence IDs

## v0.5.5 — Editing history + formatting foundation

Status: implemented in source.

- Presentation Editor undo/redo
- Ctrl/Cmd+Z, Ctrl/Cmd+Y and Shift+Cmd+Z shortcuts
- coalesced typing history
- built-in Theme presets
- presentation-wide font / size / weight / line-height controls
- horizontal and vertical text alignment
- text colour / shadow / uppercase / safe-area margin
- ordinary-presentation still/motion background assignment
- per-slide format overrides
- per-slide background inheritance / replacement / explicit none
- format-aware thumbnails
- Audience output uses resolved saved formatting
- live formatting refresh for the currently-live slide
- Song Setup remains the default Song-background owner

## v0.5.6 — Visual slide layout editor

Status: implemented in source.

- dedicated 16:9 Layout workspace
- one editable primary text box per slide
- drag-to-position
- four-corner resizing
- percentage-based resolution-independent geometry
- presentation-level layout inheritance
- per-slide layout overrides
- promote current slide box to Presentation default
- reset slide / Presentation layout controls
- precise numeric X/Y/W/H controls
- arrow-key fine/coarse nudging
- optional safe-area and centre guides
- local Layout undo/redo
- layout-aware thumbnails
- Audience output uses resolved box geometry
- backward-compatible derivation from legacy margin settings
- editing controls no longer leak Left/Right keys into live navigation

## v0.5.7 — User-created reusable Themes

Status: implemented in source.

- persistent custom Theme library
- save current resolved Presentation style/layout as a Theme
- built-in vs My Themes grouping
- apply custom Themes to Presentations and Song lyrics
- update linked Theme from current Presentation
- rename custom Theme
- delete custom Theme without visually changing linked Presentations
- linked Presentations inherit Theme updates automatically
- Presentation-level overrides clear when applying/updating a Theme
- per-slide overrides remain local
- live Audience slide refresh when a linked Theme changes
- backward-compatible loading of pre-theme presenter libraries

## v0.5.8 — Multi-element slide editor

Status: implemented in source.

- ordered slide-element model with protected legacy Primary Text
- multiple independent supplemental text elements
- still-image elements from indexed resource assets
- direct canvas selection / drag / resize
- Layers inspector
- forward/back layer ordering
- duplicate and delete controls
- per-element naming
- per-element percentage geometry
- independent supplemental-text formatting
- per-element opacity
- image Contain / Cover fit
- keyboard duplicate/delete/nudge shortcuts
- full element-stack thumbnail rendering
- full element-stack Audience rendering
- live slide refresh when elements are edited
- duplicated Presentations remap element IDs and layer order
- persistence coverage for text/image elements and layer order
- automatic backward compatibility for pre-element slides

### Next v0.5 passes

- shape elements and basic fills/borders
- richer multi-element Theme templates
- copy/paste elements between slides
- alignment/distribution tools and snapping
- expand undo/redo history across Song Setup / Arrangement / Timing changes
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
