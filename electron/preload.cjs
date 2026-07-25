const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mkwii", {
  loadConfig: () => ipcRenderer.invoke("config:load"),
  saveConfig: (config) => ipcRenderer.invoke("config:save", config),
  choosePath: (kind, currentPath) => ipcRenderer.invoke("dialog:choose-path", kind, currentPath),
  analyzeProject: (projectFolder, preferredSzs) => ipcRenderer.invoke("project:analyze", projectFolder, preferredSzs),
  createProjectStructure: (basePath, projectName) => ipcRenderer.invoke("project:create-structure", basePath, projectName),
  deleteAdditionalFiles: (trackFilesFolder, files) => ipcRenderer.invoke("project:delete-additional-files", trackFilesFolder, files),
  start: (command, config) => ipcRenderer.invoke("automation:start", command, config),
  pause: (paused) => ipcRenderer.invoke("automation:pause", paused),
  stop: () => ipcRenderer.invoke("automation:stop"),
  getState: () => ipcRenderer.invoke("automation:state"),
  onLog: (callback) => {
    const listener = (_event, entry) => callback(entry);
    ipcRenderer.on("automation:log", listener);
    return () => ipcRenderer.removeListener("automation:log", listener);
  },
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("automation:state", listener);
    return () => ipcRenderer.removeListener("automation:state", listener);
  },
});
