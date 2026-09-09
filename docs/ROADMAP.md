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

## v0.3 — Real service/library persistence

- create/edit presentations
- create/edit playlists
- reorder playlist items
- save and reopen library data
- managed application data folder
- basic autosave / recovery

## v0.4 — Real Audience media

- still-image media
- video playback
- media backgrounds behind slides
- media clear semantics
- transitions kept intentionally simple initially
- correct aspect-ratio handling

## v0.5 — Song workflow

- Verse / Chorus / Bridge groups
- presentation editor
- arrangements
- duplicate/reorder sections
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

- Stage display
- Props / Messages / Announcements
- audio workflows
- external media-provider integration (video downloader)
- CrowdLight integration
- MIDI / OSC
- remote control
- training exercises / scoring mode
- installer and auto-update strategy
