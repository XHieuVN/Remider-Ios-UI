const { contextBridge, ipcRenderer } = require('electron');

// Trong preload.js
contextBridge.exposeInMainWorld('electronAPI', {
    loadData: () => ipcRenderer.invoke('load-from-json'),
    saveData: (data) => ipcRenderer.invoke('save-data', data),
    updateData: (data) => ipcRenderer.invoke('update-data', data),
    deleteData: (id) => ipcRenderer.invoke('delete-data', id), // THÊM DÒNG NÀY
});