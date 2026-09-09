# KidsChurch Presenter

KidsChurch Presenter is a ProPresenter-familiar presentation application designed for Kids Church.

The first goal is **training compatibility**: a young operator should learn the same core mental model they will later encounter in ProPresenter — library, playlist, presentation, slide groups, live output, clear layers, media, Audience output, and eventually Stage output.

The second goal is to extend that workflow where Kids Church benefits from it, especially interactive tools, local web apps, games, timers, quizzes, and optional integrations such as a video-downloader/import service and CrowdLight.

## Current status

**v0.2.0-alpha.1 — desktop foundation**

Implemented in source:

- Electron desktop application shell
- React + TypeScript operator renderer
- separate Operator and Audience windows
- automatic fullscreen Audience placement on an external display when available
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

## Run on macOS or Windows

Prerequisites:

- Node.js
- npm

From a terminal in the repository:

```bash
npm install
npm run dev
```

The app should open the Operator window. Use the **Audience** control in the toolbar to show/hide the Audience output.

If a second display is connected, the current v0.2 shell attempts to place Audience fullscreen on that display. With only one display, it opens a normal 16:9 Audience window so development can still be tested.

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
3. **Audience output is separate.** It receives live state through a narrow IPC bridge.
4. **Playlist items are typed.** The playlist is not restricted to ordinary slide presentations.
5. **Integrations remain optional and isolated.** Downloader, CrowdLight and future services must not be able to destabilise the core presentation engine.
6. **ProPresenter familiarity wins over arbitrary simplification** where training value is involved.

## Planned playlist item types

- `presentation`
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
