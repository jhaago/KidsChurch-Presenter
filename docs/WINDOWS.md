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

The app currently routes local screens automatically:

- Audience -> first non-primary display
- Stage -> second non-primary display

With the present Kids Church duplicated-TV/tablet setup, Windows still exposes that duplicated pair as one external display, so Audience continues to work as before. Stage can simply remain hidden.

If the Android tablet is later changed to a separate extended Windows display, it can already act as the second local Stage display. The preferred longer-term design is still a network Stage browser client.

A future ProPresenter-style Screens configuration panel will let the operator explicitly choose physical displays and switch Stage between `local-display` and `network`.

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

v0.2.1 can automatically use the first external display for Audience and the second for Stage. Explicit screen mappings are not yet persisted, and the network Stage transport is reserved but not implemented. The planned Screens configuration will store output mappings rather than relying on automatic ordering.


## Network Stage on Android

v0.2.2 can expose Stage directly over the local network without making the tablet a Windows display.

1. Connect the Windows laptop and Android tablet to the same reachable local network.
2. Launch KidsChurch Presenter.
3. Find **Network Stage** in the operator inspector.
4. Open the displayed Stage URL in Chrome on the tablet.
5. Trigger a slide. The tablet should update CURRENT and NEXT independently from Audience.

Windows may request firewall permission the first time the presenter listens on the LAN. Allow access on the appropriate trusted/private church network. If the church Wi-Fi uses client isolation or a guest network, devices may be prevented from reaching each other even when they share the same Wi-Fi name.
