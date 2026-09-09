const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kidsPresenter', {
  isElectron: true,
  setAudienceVisible: (visible) => ipcRenderer.invoke('audience:set-visible', Boolean(visible)),
  getAudienceVisible: () => ipcRenderer.invoke('audience:get-visible'),
  sendOutputState: (state) => ipcRenderer.send('output:update', state),
  onOutputState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('output:state', listener);
    return () => ipcRenderer.removeListener('output:state', listener);
  },
  onAudienceVisibility: (callback) => {
    const listener = (_event, visible) => callback(Boolean(visible));
    ipcRenderer.on('audience:visibility', listener);
    return () => ipcRenderer.removeListener('audience:visibility', listener);
  },
});
