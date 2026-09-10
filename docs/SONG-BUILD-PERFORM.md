# Song Build vs Performance

KidsChurch Presenter treats Song preparation and Song operation as two different jobs.

## Build

Build changes the saved Song definition. It is where an operator or service-preparation user configures:

- Song title
- playback mode
- lyric control mode
- backing track or stem file assignments
- saved stem starting defaults
- Song background
- lyrics-video assignment
- lyric wording and Stage notes
- arrangement
- visual Theme/layout
- lyric timing / Auto Lyrics cues

Build is intentionally non-live. Clicking lyric slides in the Build workspace selects them for editing/preparation but does not trigger Audience output. Lyrics Video can be assigned in Build but not triggered from Build.

If the selected Song is currently playing or paused on the live transport, Presenter blocks entering Build for that Song until playback is stopped.

## Perform

Perform runs the already-prepared Song. It does not expose structural editing controls.

The Performance workspace includes:

- Start / Pause / Resume / Stop
- live timeline and seek
- Current / Next lyric readout
- Previous / Go Next controls
- normal live lyric-slide triggering
- Lyrics Video trigger when configured
- live stem mix controls for stem-based Songs

Live stem toggles are runtime state. They do not rewrite the saved Song. Each fresh Song start rebuilds the live mix from the stem defaults saved in Build.

## Operating rule

**Build may change the Song. Perform may only run it.**

This distinction is intended both for live safety and for training. A child learning KidsChurch Presenter should be able to recognise whether they are preparing content or operating a service before interacting with controls that can affect Audience output.

## Output safety

Operator selection remains independent from live output in both modes. Browsing or editing another resource does not clear or replace the current Audience output.

Global clear controls remain authoritative regardless of Song mode.
