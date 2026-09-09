const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');

let operatorWindow = null;
const screenWindows = new Map();
let isQuitting = false;

const devUrl = process.env.VITE_DEV_SERVER_URL || null;
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
  if (!window) return;

  const display = resolveDisplay(kind);
  if (display) {
    const { x, y, width, height } = display.bounds;
    window.setFullScreen(false);
    window.setBounds({ x, y, width, height });
    window.setFullScreen(true);
    return;
  }

  window.setFullScreen(false);
  const width = kind === 'stage' ? 1100 : 960;
  const height = kind === 'stage' ? 650 : 540;
  window.setBounds({ width, height });
  window.center();
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

function setScreenVisible(kind, visible) {
  assertScreenKind(kind);
  const assignment = screenAssignments[kind];

  if (!assignment.enabled || assignment.transport !== 'local-display') {
    return false;
  }

  const window = createScreenWindow(kind);
  if (!window) return false;

  if (visible) {
    placeScreenWindow(kind);
    if (typeof window.showInactive === 'function') {
      window.showInactive();
    } else {
      window.show();
      if (operatorWindow) operatorWindow.focus();
    }
  } else {
    window.hide();
  }

  if (operatorWindow) operatorWindow.webContents.send('screen:visibility', kind, visible);
  return visible;
}

app.whenReady().then(() => {
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

  ipcMain.on('presenter:output-update', (_event, presenterOutput) => {
    if (!presenterOutput || typeof presenterOutput !== 'object') return;
    latestPresenterOutput = {
      audience: presenterOutput.audience || latestPresenterOutput.audience,
      stage: presenterOutput.stage || latestPresenterOutput.stage,
    };
    sendScreenState('audience');
    sendScreenState('stage');
  });

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
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
