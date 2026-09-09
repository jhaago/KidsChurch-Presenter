const { app, BrowserWindow, dialog, ipcMain, screen } = require('electron');
const path = require('node:path');
const { NetworkStageServer } = require('./stage-server.cjs');
const { ResourceLibrary } = require('./resource-library.cjs');

let operatorWindow = null;
const screenWindows = new Map();
let isQuitting = false;
const networkStageServer = new NetworkStageServer({ port: 4310 });
let resourceLibrary = null;

const devUrl = process.env.VITE_DEV_SERVER_URL || null;
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
const screenKinds = new Set(['audience', 'stage']);

const screenAssignments = {
  audience: {
    id: 'audience-main',
    kind: 'audience',
    label: 'Audience',
    transport: 'local-display',
    enabled: true,
    displayId: null,
  },
  stage: {
    id: 'stage-main',
    kind: 'stage',
    label: 'Stage',
    transport: 'local-display',
    enabled: true,
    displayId: null,
  },
};

let latestPresenterOutput = {
  audience: null,
  stage: null,
};

if (process.platform === 'win32') {
  app.setAppUserModelId('com.kidschurch.presenter');
}

function assertScreenKind(kind) {
  if (!screenKinds.has(kind)) {
    throw new Error('Unsupported screen kind: ' + kind);
  }
  return kind;
}

function rendererTarget(mode) {
  if (devUrl) {
    return { type: 'url', value: devUrl + '?mode=' + mode };
  }

  return {
    type: 'file',
    value: path.join(__dirname, '..', 'dist', 'index.html'),
    query: { mode },
  };
}

async function loadRenderer(window, mode) {
  const target = rendererTarget(mode);
  if (target.type === 'url') {
    await window.loadURL(target.value);
  } else {
    await window.loadFile(target.value, { query: target.query });
  }
}

function createOperatorWindow() {
  operatorWindow = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#15171a',
    title: 'KidsChurch Presenter',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  operatorWindow.on('closed', () => {
    operatorWindow = null;
  });

  loadRenderer(operatorWindow, 'operator');
}

function externalDisplays() {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().filter((display) => display.id !== primary.id);
}

function resolveDisplay(kind) {
  const assignment = screenAssignments[kind];
  const displays = screen.getAllDisplays();

  if (assignment.displayId) {
    const explicit = displays.find((display) => String(display.id) === String(assignment.displayId));
    if (explicit) return explicit;
  }

  const external = externalDisplays();
  if (kind === 'audience') return external[0] || null;
  if (kind === 'stage') return external[1] || null;
  return null;
}

function placeScreenWindow(kind) {
  const window = screenWindows.get(kind);
  if (!window || window.isDestroyed()) return null;

  // Always leave fullscreen before moving/resizing a window. Reusing a hidden
  // fullscreen BrowserWindow is unreliable on Windows after an output toggle.
  window.setFullScreen(false);

  const display = resolveDisplay(kind);
  if (display) {
    const { x, y, width, height } = display.bounds;
    window.setBounds({ x, y, width, height });

    // If this is a live display-remap, restore fullscreen after the move.
    if (window.isVisible()) window.setFullScreen(true);
    return display;
  }

  const width = kind === 'stage' ? 1100 : 960;
  const height = kind === 'stage' ? 650 : 540;
  window.setBounds({ width, height });
  window.center();
  return null;
}

function sendScreenState(kind) {
  const window = screenWindows.get(kind);
  const state = latestPresenterOutput[kind];
  if (window && !window.isDestroyed() && state) {
    window.webContents.send('screen:state', kind, state);
  }
}

function createScreenWindow(kind) {
  assertScreenKind(kind);
  if (screenWindows.get(kind)) return screenWindows.get(kind);

  const window = new BrowserWindow({
    width: kind === 'stage' ? 1100 : 960,
    height: kind === 'stage' ? 650 : 540,
    show: false,
    frame: false,
    backgroundColor: '#000000',
    title: 'KidsChurch Presenter — ' + (kind === 'audience' ? 'Audience' : 'Stage'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  screenWindows.set(kind, window);

  window.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      window.hide();
      if (operatorWindow) operatorWindow.webContents.send('screen:visibility', kind, false);
    }
  });

  window.on('closed', () => {
    screenWindows.delete(kind);
  });

  window.webContents.on('did-finish-load', () => sendScreenState(kind));
  loadRenderer(window, kind);
  return window;
}

function destroyScreenWindow(kind) {
  const window = screenWindows.get(kind);
  if (!window) return;

  // Remove it from the registry first so any synchronous closed event cannot
  // leave a stale reference behind.
  screenWindows.delete(kind);

  if (!window.isDestroyed()) {
    window.setFullScreen(false);
    window.destroy();
  }
}

function setScreenVisible(kind, visible) {
  assertScreenKind(kind);
  const assignment = screenAssignments[kind];

  if (!assignment.enabled || assignment.transport !== 'local-display') {
    return false;
  }

  if (!visible) {
    // Dispose of the output window instead of hiding a fullscreen window.
    // The next enable gets a clean BrowserWindow and is rehydrated from
    // latestPresenterOutput by did-finish-load/sendScreenState.
    destroyScreenWindow(kind);
    if (operatorWindow) operatorWindow.webContents.send('screen:visibility', kind, false);
    return false;
  }

  const window = createScreenWindow(kind);
  if (!window) return false;

  const display = placeScreenWindow(kind);

  if (typeof window.showInactive === 'function') {
    window.showInactive();
  } else {
    window.show();
    if (operatorWindow) operatorWindow.focus();
  }

  // Enter fullscreen only after the window is visible. This avoids the
  // Windows hidden-fullscreen lifecycle bug observed after toggling outputs.
  if (display && !window.isDestroyed()) {
    window.setFullScreen(true);
  }

  sendScreenState(kind);
  if (operatorWindow) operatorWindow.webContents.send('screen:visibility', kind, true);
  return true;
}

app.whenReady().then(async () => {
  resourceLibrary = new ResourceLibrary(app.getPath('userData'));
  await resourceLibrary.load();

  createOperatorWindow();
  createScreenWindow('audience');
  createScreenWindow('stage');

  ipcMain.handle('screen:set-visible', (_event, kind, visible) =>
    setScreenVisible(assertScreenKind(kind), Boolean(visible)),
  );
  ipcMain.handle('screen:get-visible', (_event, kind) =>
    Boolean(screenWindows.get(assertScreenKind(kind))?.isVisible()),
  );
  ipcMain.handle('screen:get-assignments', () => structuredClone(screenAssignments));
  ipcMain.handle('network-stage:get-info', () => networkStageServer.info());

  const publishResourceLibrary = (snapshot) => {
    if (operatorWindow && !operatorWindow.isDestroyed()) {
      operatorWindow.webContents.send('resource-library:updated', snapshot);
    }
    return snapshot;
  };

  ipcMain.handle('resource-library:get', () => resourceLibrary?.snapshot() ?? {
    sources: [],
    assets: [],
    lastError: 'Resource library is not ready.',
  });

  ipcMain.handle('resource-library:add-folder', async () => {
    const options = {
      title: 'Add Resource Library Folder',
      buttonLabel: 'Add Folder',
      properties: ['openDirectory'],
    };
    const result = operatorWindow && !operatorWindow.isDestroyed()
      ? await dialog.showOpenDialog(operatorWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || !result.filePaths[0]) {
      return resourceLibrary?.snapshot() ?? { sources: [], assets: [], lastError: null };
    }

    return publishResourceLibrary(await resourceLibrary.addFolder(result.filePaths[0]));
  });

  ipcMain.handle('resource-library:remove-folder', async (_event, sourceId) => {
    return publishResourceLibrary(await resourceLibrary.removeFolder(String(sourceId)));
  });

  ipcMain.handle('resource-library:rescan', async () => {
    return publishResourceLibrary(await resourceLibrary.rescan());
  });

  networkStageServer.onInfo((info) => {
    if (operatorWindow && !operatorWindow.isDestroyed()) {
      operatorWindow.webContents.send('network-stage:info', info);
    }
  });

  ipcMain.on('presenter:output-update', (_event, presenterOutput) => {
    if (!presenterOutput || typeof presenterOutput !== 'object') return;
    latestPresenterOutput = {
      audience: presenterOutput.audience || latestPresenterOutput.audience,
      stage: presenterOutput.stage || latestPresenterOutput.stage,
    };
    sendScreenState('audience');
    sendScreenState('stage');
    networkStageServer.publish(latestPresenterOutput.stage);
  });

  await networkStageServer.start();

  screen.on('display-added', () => {
    for (const kind of screenKinds) {
      const window = screenWindows.get(kind);
      if (window?.isVisible()) placeScreenWindow(kind);
    }
  });

  screen.on('display-removed', () => {
    for (const kind of screenKinds) {
      const window = screenWindows.get(kind);
      if (window?.isVisible()) placeScreenWindow(kind);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOperatorWindow();
      createScreenWindow('audience');
      createScreenWindow('stage');
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  networkStageServer.stop().catch(() => undefined);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
