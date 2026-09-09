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
  getNetworkStageInfo: () => ipcRenderer.invoke('network-stage:get-info'),
  getResourceLibrary: () => ipcRenderer.invoke('resource-library:get'),
  addResourceFolder: () => ipcRenderer.invoke('resource-library:add-folder'),
  removeResourceFolder: (sourceId) => ipcRenderer.invoke('resource-library:remove-folder', sourceId),
  rescanResourceLibrary: () => ipcRenderer.invoke('resource-library:rescan'),
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
  onNetworkStageInfo: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on('network-stage:info', listener);
    return () => ipcRenderer.removeListener('network-stage:info', listener);
  },
  onResourceLibraryUpdated: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on('resource-library:updated', listener);
    return () => ipcRenderer.removeListener('resource-library:updated', listener);
  },
});
