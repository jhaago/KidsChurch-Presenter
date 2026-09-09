# Windows Support

Windows is a first-class target for KidsChurch Presenter.

The intended Kids Church setup is:

```text
Windows laptop
   |
   +-- Operator window on laptop display
   |
   +-- Audience window on HDMI / second display
          |
          +-- projector / TV
```

## Supported development target

For the current alpha, use a modern 64-bit Windows 10 or Windows 11 machine with Node.js 22.12 or newer.

## Display setup

Before launching KidsChurch Presenter:

1. Connect the projector or TV.
2. Open **Settings > System > Display**.
3. Under **Multiple displays**, choose **Extend these displays**.
4. Keep the laptop display as the main display during the current v0.2 alpha.
5. Launch KidsChurch Presenter.
6. Press **Audience** in the operator toolbar.

The app currently selects the first non-primary display as Audience output and makes it fullscreen.

A future milestone will add a ProPresenter-style Screens configuration panel so the operator can explicitly choose which physical display is Audience and which is Stage.

## Run from source

Open PowerShell in the cloned repository:

```powershell
npm install
npm run dev
```

The Operator window should open on the Windows desktop.

With no external display attached, Audience opens as a normal 16:9 development window.

## Build a Windows installer

On Windows:

```powershell
npm install
npm run dist:win
```

The installer is written to:

```text
release/
  KidsChurch-Presenter-<version>-Setup.exe
```

The current installer target is:

- 64-bit Windows
- NSIS installer
- optional install directory
- Start Menu shortcut
- desktop shortcut

Code signing is not configured yet, so Windows may show an unknown-publisher warning on alpha installers. Signing will be addressed before any wider distribution.

## Windows test checklist

### Single display

- Operator window launches.
- Audience button opens a separate 16:9 window.
- Audience does not steal keyboard focus from Operator.
- Left/Right navigation continues to work after Audience is opened.
- Clear-layer shortcuts work.
- Closing Audience hides it rather than closing the application.

### Laptop + projector

- Windows display mode is **Extend**.
- Operator remains on laptop.
- Audience opens fullscreen on projector.
- Clicking a slide updates projector output.
- Browsing another playlist item does not change projector output.
- Black affects Audience only as intended.
- Clear Slide leaves Media active.
- Disconnecting/reconnecting the projector is tested before relying on the alpha in a service.

## Current limitation

v0.2 chooses the first display that is not Windows' primary display. This is adequate for a two-display laptop/projector setup but is not sufficient for a future three-screen configuration.

The planned Screens configuration will store explicit output mappings rather than guessing from primary/non-primary status.
