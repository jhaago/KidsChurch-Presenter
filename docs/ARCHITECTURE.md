# Architecture

## Purpose

KidsChurch Presenter is being designed as a real presentation application, not a static ProPresenter simulator. Training compatibility is a core product requirement, while the architecture must also support Kids Church-specific interactive tools.

## Runtime surfaces

### Operator window

The operator window owns user interaction and local UI state:

- selected library
- selected playlist
- selected playlist item
- search state
- panel visibility
- slide thumbnail selection context

It also owns the authoritative live-output state for the current single-machine prototype.

### Audience window

The Audience window is intentionally dumb. It renders only the live state sent to it and does not read operator selection state.

This is an important reliability boundary: browsing in the operator interface must not leak onto the projector.

Future Stage output will use the same principle with its own renderer contract.

## Output layers

`OutputState` currently reserves independent state for:

- slide
- media
- prop
- message
- announcement
- audio
- live video
- logo mode
- black mode

A clear action affects only its intended layer(s). For example, Clear Slide does not implicitly remove Media.

## Domain model

### Presentation

A presentation contains ordered slide groups. A slide group can represent Verse 1, Chorus, Verse 2, Bridge, Scripture, or a generic section.

### PlaylistItem

A playlist item has a type and optional resource reference. The initial type union is:

```text
presentation
media
bible
timer
interactive
web-tool
```

The type union is deliberately broader than the initial implementation so interactive tools do not require a later playlist rewrite.

## External integrations

External features should integrate through explicit boundaries rather than being imported directly into the presentation engine.

Examples:

- video downloader / media acquisition provider
- CrowdLight
- MIDI / OSC
- online Bible provider
- remote control

The presentation engine should continue to operate if any optional integration is unavailable or fails.

### Video downloader principle

The future presenter-side flow should be conceptually:

```text
Add Media
  -> choose external media provider
  -> provider acquires media
  -> provider returns an ImportedMedia record
  -> media library imports/copies the result
  -> playlist references the managed media asset
```

The core app should not depend on downloader-specific implementation details.

## Security boundary

Electron runs with:

- `nodeIntegration: false`
- `contextIsolation: true`
- a narrow preload API

Web tools will require additional isolation work before arbitrary remote content is allowed. They should not inherit unrestricted application privileges.

## Persistence

Persistence is intentionally not implemented yet. When introduced, service/library data should be versioned and migrated explicitly rather than relying on ad-hoc browser localStorage structures.

## Future process split

As reliability requirements increase, media playback and external integrations may move behind dedicated processes/services. A crash or stalled download must not take down live projection.
