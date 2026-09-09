# KidsChurch Presenter

KidsChurch Presenter is a ProPresenter-familiar presentation application designed for Kids Church.

The first goal is training compatibility: a young operator should learn the same core mental model they will later encounter in ProPresenter — library, playlist, presentation, slide groups, live output, clear layers, media, audience output, and eventually stage output.

The second goal is to extend that workflow where Kids Church benefits from it, especially interactive tools, local web apps, games, timers, quizzes, and optional external integrations such as a video-downloader/import service and CrowdLight.

## Current status

**v0.2 desktop foundation (in development)**

The project direction is now locked around:

- Electron desktop shell
- React + TypeScript operator renderer
- separate operator and Audience windows
- explicit UI state vs live output state
- ProPresenter-style output layers
- playlist item types for presentations, media, Bible, timers, interactive tools and web tools
- an integration boundary for future external media providers such as the separate video-downloader project

## Core architectural rules

1. **Operator selection is not live output.** Browsing a presentation must never implicitly change what the audience sees.
2. **Output is layered.** Slide, media, prop, message, announcement, audio and live-video states are represented independently.
3. **Audience output is a separate window/process surface.** It receives live state through a narrow IPC bridge.
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

## Project philosophy

KidsChurch Presenter is not intended to copy Renewed Vision branding or proprietary artwork. It intentionally mirrors familiar presentation concepts and operating workflow while using its own implementation and visual identity.
