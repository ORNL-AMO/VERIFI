// This file is copied into QA packages only; production retains its original entrypoint.
const { app, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const archiveFs = require('original-fs');
const { randomUUID, createHash } = require('node:crypto');
const config = require('./desktop-qa-config.json');

if (config.appId !== 'gov.ornl.amo.verifi.qa' || config.name !== 'verifi-desktop-qa' ||
    config.debugPort !== 47832 || config.feed !== 'http://127.0.0.1:47831/updates/') {
    throw new Error('Invalid desktop QA configuration.');
}
app.setName(config.name);
app.setPath('userData', path.join(app.getPath('appData'), config.name));
app.setAppLogsPath(path.join(app.getPath('userData'), 'logs'));
if (process.platform === 'win32') app.setAppUserModelId(config.appId);
app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');
app.commandLine.appendSwitch('remote-debugging-port', String(config.debugPort));

// The external controller may supply file choices only. Real backup filesystem
// operations, updater requests, and native installation are never replaced.
const nativeSaveDialog = dialog.showSaveDialog.bind(dialog);
dialog.showSaveDialog = async (...args) => {
    const choiceFile = path.join(app.getPath('userData'), 'desktop-qa-file-choice.json');
    if (!fs.existsSync(choiceFile)) return nativeSaveDialog(...args);
    const choice = JSON.parse(fs.readFileSync(choiceFile, 'utf8'));
    const relative = path.relative(app.getPath('userData'), choice.savePath || '');
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('QA file choice must stay inside the disposable QA profile.');
    return { canceled: false, filePath: choice.savePath };
};

let observedWindow = false;
app.on('browser-window-created', (_event, window) => {
    if (observedWindow) return;
    observedWindow = true;
    const preferences = window.webContents.getLastWebPreferences();
    const runtime = {
        schemaVersion: 1, nonce: randomUUID(), pid: process.pid,
        version: app.getVersion(), electron: process.versions.electron, packaged: app.isPackaged,
        executable: process.execPath, appImage: process.env.APPIMAGE || null,
        appPath: app.getAppPath(), profile: app.getPath('userData'), logs: app.getPath('logs'),
        security: { contextIsolation: preferences.contextIsolation, nodeIntegration: preferences.nodeIntegration, sandbox: preferences.sandbox },
        archiveSha256: createHash('sha256').update(archiveFs.readFileSync(app.getAppPath())).digest('hex'),
        provenance: require('./package.json').verifiQa
    };
    const target = path.join(app.getPath('userData'), 'desktop-qa-runtime.json');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(`${target}.${process.pid}.tmp`, JSON.stringify(runtime, null, 2));
    fs.renameSync(`${target}.${process.pid}.tmp`, target);
});
// Preserve the application's BrowserWindow security and its real updater handlers.
require('./main.js');
