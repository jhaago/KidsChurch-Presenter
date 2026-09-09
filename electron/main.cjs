const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');

let operatorWindow = null;
let audienceWindow = null;
let latestOutputState = null;
let isQuitting = false;

const devUrl = process.env.VITE_DEV_SERVER_URL || null;

function rendererTarget(mode) {
  if (devUrl) {
    return { type: 'url', value: `${devUrl}?mode=${mode}` };
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

function placeAudienceWindow() {
  if (!audienceWindow) return;

  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const external = displays.find((display) => display.id !== primary.id);

  if (external) {
    const { x, y, width, height } = external.bounds;
    audienceWindow.setBounds({ x, y, width, height });
    audienceWindow.setFullScreen(true);
  } else {
    audienceWindow.setFullScreen(false);
    audienceWindow.setBounds({ width: 960, height: 540 });
    audienceWindow.center();
  }
}

function createAudienceWindow() {
  audienceWindow = new BrowserWindow({
    width: 960,
    height: 540,
    show: false,
    frame: false,
    backgroundColor: '#000000',
    title: 'KidsChurch Presenter — Audience',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  audienceWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      audienceWindow.hide();
      operatorWindow?.webContents.send('audience:visibility', false);
    }
  });

  audienceWindow.on('closed', () => {
    audienceWindow = null;
  });

  audienceWindow.webContents.on('did-finish-load', () => {
    if (latestOutputState) {
      audienceWindow?.webContents.send('output:state', latestOutputState);
    }
  });

  loadRenderer(audienceWindow, 'audience');
}

function setAudienceVisible(visible) {
  if (!audienceWindow) createAudienceWindow();
  if (!audienceWindow) return false;

  if (visible) {
    placeAudienceWindow();
    audienceWindow.show();
    audienceWindow.focus();
  } else {
    audienceWindow.hide();
  }

  operatorWindow?.webContents.send('audience:visibility', visible);
  return visible;
}

app.whenReady().then(() => {
  createOperatorWindow();
  createAudienceWindow();

  ipcMain.handle('audience:set-visible', (_event, visible) => setAudienceVisible(Boolean(visible)));
  ipcMain.handle('audience:get-visible', () => Boolean(audienceWindow?.isVisible()));

  ipcMain.on('output:update', (_event, outputState) => {
    latestOutputState = outputState;
    if (audienceWindow && !audienceWindow.isDestroyed()) {
      audienceWindow.webContents.send('output:state', latestOutputState);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOperatorWindow();
      createAudienceWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
