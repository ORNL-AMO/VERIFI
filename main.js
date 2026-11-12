const { app, BrowserWindow, ipcMain, Menu, shell, dialog, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');
const { UpdateController } = require('./electron/update-controller.cjs');
const { isApplicationUrl, isTrustedSender, isExternalUrl } = require('./electron/security.cjs');

const entryPath = path.join(__dirname, 'dist/verifi/browser/index.html');
let win = null;

function reply(channel, data) {
    if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
        win.webContents.send(channel, data);
    }
}

function onTrusted(channel, handler) {
    ipcMain.on(channel, (event, ...args) => {
        if (!isTrustedSender(event, win, entryPath)) {
            log.warn('Rejected IPC sender', channel);
            return;
        }
        Promise.resolve().then(() => handler(event, ...args)).catch(error => log.error('Desktop request failed', channel, error));
    });
}

function handleTrusted(channel, handler) {
    ipcMain.handle(channel, (event, ...args) => {
        if (!isTrustedSender(event, win, entryPath)) throw new Error('Untrusted desktop request.');
        return handler(event, ...args);
    });
}

autoUpdater.logger = log;
log.transports.file.level = 'info';
log.info('App starting...');
const updates = new UpdateController({
    updater: autoUpdater, log,
    publish: state => reply('update-status', state),
    supported: app.isPackaged && (process.platform !== 'linux' || Boolean(process.env.APPIMAGE))
});

onTrusted('ready', () => updates.ready());
onTrusted('check-for-updates', () => updates.check());
onTrusted('update', () => updates.download());
handleTrusted('quit-and-install', () => updates.install());
onTrusted('relaunch', () => { app.relaunch(); app.exit(); });

function openExternal(value) {
    if (isExternalUrl(value)) shell.openExternal(value).catch(error => log.error('Could not open external link', error));
}

function createWindow() {
    win = new BrowserWindow({
        width: 1300,
        height: 1500,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    win.webContents.setWindowOpenHandler(({ url }) => {
        openExternal(url);
        return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (event, value) => {
        if (!isApplicationUrl(value, entryPath)) {
            event.preventDefault();
            openExternal(value);
        }
    });
    win.webContents.on('will-redirect', (event, value) => {
        if (!isApplicationUrl(value, entryPath)) event.preventDefault();
    });
    win.loadURL(pathToFileURL(entryPath).href).catch(error => log.error('Application could not load', error));
    if (!app.isPackaged) win.webContents.openDevTools();
    win.on('closed', () => { win = null; });
    win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
    // Preserve the service headers used by the existing desktop API integrations.
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = 'VERIFI';
        details.requestHeaders['Origin'] = 'https://verifi.ornl.gov';
        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
        { label: 'Application', submenu: [
            { role: 'quit' },
            { label: 'Dev Tools', accelerator: 'CmdOrCtrl+I', click: () => win?.webContents.toggleDevTools() }
        ] },
        { label: 'Edit', submenu: [
            { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
            { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
        ] }
    ]));
    createWindow();
}).catch(error => log.error('Desktop startup failed', error));
app.on('activate', () => { if (win === null) createWindow(); });
app.on('window-all-closed', () => app.quit());

onTrusted("selectFolder", async (event) => {
    try {
        const result = await dialog.showOpenDialog({
            title: "Select a Folder",
            properties: ['openDirectory']
        });

        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
            reply('folder-selected', null);
            return;
        }
        const selectedPath = result.filePaths[0];

        if (fs.existsSync(selectedPath)) {
            reply('folder-selected', selectedPath);
        } else {
            reply('folder-selected', null);
        }
    } catch (err) {
        log.error('Error getting bills folder:', err);
    }
});

onTrusted("checkFolderExists", async (event, folderPath) => {
    const exists = fs.existsSync(folderPath);
    reply('folder-exists', { exists, folderPath });
});

onTrusted("openBillsFolder", async (event, folderPath) => {
    try {
        if (folderPath && fs.existsSync(folderPath)) {
            shell.openPath(folderPath);
        }
    }
    catch (err) {
        log.error('Error opening bills folder:', err);
    }

});

onTrusted("uploadFileDialog", async (event, { key, folderPath, meterNumber, date }) => {
    try {
        log.info('open upload bill dialog');
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
        });
        if (result.canceled || result.filePaths.length === 0) {
            log.info('File selection was canceled');
            return;
        }

        const originalFilePath = result.filePaths[0];
        const fileExtension = path.extname(originalFilePath).toLowerCase();

        meterNumber = meterNumber.trim().split(/\s+/).join('_');
        const facilityName = meterNumber.split('_')[0];

        const newFileName = `${meterNumber}_${date}${fileExtension}`;
        const subFolderPath = path.join(folderPath, facilityName);
        if (!fs.existsSync(subFolderPath)) {
            fs.mkdirSync(subFolderPath, { recursive: true });
        }
        const destinationPath = path.join(subFolderPath, newFileName);

        fs.copyFile(originalFilePath, destinationPath, (err) => {
            if (err) {
                log.error('Error copying file:', err);
                return;
            }
            reply('utility-file-path', destinationPath);
        });
    } catch (err) {
        log.error('Error during file upload:', err);
    }
});

onTrusted("openUploadedFileLocation", (event, filepath) => {
    if (filepath && fs.existsSync(filepath)) {
        shell.openPath(filepath);
    }
});

onTrusted("disconnectBill", async (event, path) => {
    try {
        if (path && fs.existsSync(path)) {
            fs.unlinkSync(path);
            reply('bill-disconnected', { success: true });
        }
        else {
            reply('bill-disconnected', { success: false });
        }
    } catch (err) {
        console.error('In main.js Error disconnecting bill:', err);
        reply('bill-disconnected', { success: false });
    }
});

onTrusted("utilityFileExists", (event, path) => {
    log.info('Checking if file exists');
    const exists = fs.existsSync(path);
    reply('utility-file-exists', exists);
});

handleTrusted("backup:chooseSavePath", async (_event, arg) => {
    const defaultPath = typeof arg?.defaultPath === 'string' ? arg.defaultPath : undefined;
    const result = await dialog.showSaveDialog(win, {
        filters: [{ name: "JSON Files", extensions: ["json"] }],
        defaultPath
    });
    return result.canceled ? undefined : result.filePath;
});

handleTrusted("backup:exists", async (_event, arg) => {
    if (!arg?.path || typeof arg.path !== 'string') {
        return { ok: false, error: 'A backup file path is required.' };
    }
    return { ok: true, exists: fs.existsSync(arg.path) };
});

handleTrusted("backup:read", async (_event, arg) => {
    if (!arg?.path || typeof arg.path !== 'string') {
        return { ok: false, error: 'A backup file path is required.' };
    }
    if (!fs.existsSync(arg.path)) {
        return { ok: false, error: 'The selected backup file does not exist.' };
    }
    try {
        const raw = await fs.promises.readFile(arg.path, 'utf8');
        return { ok: true, data: JSON.parse(raw) };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'The backup file could not be read.' };
    }
});

handleTrusted("backup:write", async (_event, arg) => {
    const backupPath = typeof arg?.path === 'string' ? arg.path : undefined;
    const backup = arg?.backup;
    if (!backupPath) {
        return { ok: false, error: 'A backup file path is required.' };
    }
    if (!backup || typeof backup !== 'object') {
        return { ok: false, error: 'Backup data is required.' };
    }

    const tempPath = `${backupPath}.tmp`;
    try {
        const sanitizedBackup = JSON.parse(JSON.stringify(backup));
        if (sanitizedBackup?.account) {
            delete sanitizedBackup.account.dataBackupFilePath;
        }

        await fs.promises.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.promises.writeFile(tempPath, JSON.stringify(sanitizedBackup), 'utf8');
        await fs.promises.rename(tempPath, backupPath);
        return { ok: true };
    } catch (error) {
        try {
            if (fs.existsSync(tempPath)) {
                await fs.promises.unlink(tempPath);
            }
        } catch (_cleanupError) {
            // Ignore temp cleanup failure and return the original write error.
        }
        return { ok: false, error: error instanceof Error ? error.message : 'The backup file could not be written.' };
    }
});
