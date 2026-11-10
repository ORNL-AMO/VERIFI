const {
    contextBridge,
    ipcRenderer
} = require("electron");


//from https://github.com/electron/electron/issues/9920#issuecomment-575839738
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "electronAPI", {
        send: (channel, data) => {
            // whitelist channels
            let validChannels = ["ready", "check-for-updates", "update", "relaunch", "uploadFileDialog", "openUploadedFileLocation", "utilityFileExists", "openBillsFolder", "checkFolderExists", "selectFolder", "disconnectBill"];
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, data);
            }
        },
        on: (channel, func) => {
            let validChannels = ["update-status", "utility-file-path", "utility-file-exists", "folder-exists", "folder-selected", "bill-disconnected"];
            if (validChannels.includes(channel)) {
                // Deliberately strip event as it includes `sender` 
                const listener = (_event, ...args) => func(...args);
                ipcRenderer.on(channel, listener);
                return () => ipcRenderer.removeListener(channel, listener);
            }
            return () => {};
         },
        invoke: (channel, data) => {
            let validChannels = ["quit-and-install", "backup:chooseSavePath", "backup:exists", "backup:read", "backup:write"];
            if (validChannels.includes(channel)) {
                return ipcRenderer.invoke(channel, data);
            }
            return Promise.reject(new Error(`Channel ${channel} is not allowed.`));
        }
    }
);
