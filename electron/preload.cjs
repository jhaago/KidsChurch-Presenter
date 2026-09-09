const { contextBridge, ipcRenderer } = require('electron');

const validScreenKinds = new Set(['audience', 'stage']);

function assertScreenKind(kind) {
  if (!validScreenKinds.has(kind)) {
    throw new Error('Unsupported screen kind: ' + kind);
  }
  return kind;
}

contextBridge.exposeInMainWorld('kidsPresenter', {
  isElectron: true,
  setScreenVisible: (kind, visible) =>
    ipcRenderer.invoke('screen:set-visible', assertScreenKind(kind), Boolean(visible)),
  getScreenVisible: (kind) =>
    ipcRenderer.invoke('screen:get-visible', assertScreenKind(kind)),
  getScreenAssignments: () => ipcRenderer.invoke('screen:get-assignments'),
  sendPresenterOutput: (state) => ipcRenderer.send('presenter:output-update', state),
  onScreenState: (kind, callback) => {
    const safeKind = assertScreenKind(kind);
    const listener = (_event, eventKind, state) => {
      if (eventKind === safeKind) callback(state);
    };
    ipcRenderer.on('screen:state', listener);
    return () => ipcRenderer.removeListener('screen:state', listener);
  },
  onScreenVisibility: (callback) => {
    const listener = (_event, kind, visible) => callback(kind, Boolean(visible));
    ipcRenderer.on('screen:visibility', listener);
    return () => ipcRenderer.removeListener('screen:visibility', listener);
  },
});
