const { app, BrowserWindow, ipcMain, Menu, shell, dialog, session } = require('electron');
const path = require('path');
const url = require('url');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');
const jetpack = require('fs-jetpack');
const { event } = require('jquery');
const fs = require('fs');

function isDev() {
    //TODO: check for isDev. Latest electron update breaks old
    // return require.filename.indexOf('app.asar') === -1;
    return false;
};


app.allowRendererProcessReuse = false
// Logger for autoUpdater
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
//needed for forcing update check in develop
// autoUpdater.forceDevUpdateConfig = true;
log.info('App starting...');

let win = null;

app.on('ready', function () {
    // Initialize the window to our specified dimensions
    win = new BrowserWindow({
        width: 1300,
        height: 1500,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        },
    });
    // win.maximize();

    // Specify entry point
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'dist/verifi/index.html'),
        protocol: 'file',
        slashes: true
    }));

    if (isDev()) {
        win.toggleDevTools();
    }
    // Remove window once app is closed
    win.on('closed', function () {
        win = null;
    });



    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = 'VERIFI'
        details.requestHeaders['Origin'] = 'https://verifi.ornl.gov';
        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });


    //signal from core.component to check for update
    ipcMain.on('ready', (coreCompEvent, arg) => {

        if (!isDev()) {
            autoUpdater.checkForUpdates().then(() => {
                log.info('done checking for updates');
                if (autoUpdater.updateInfoAndProvider) {
                    win.webContents.send('release-info', autoUpdater.updateInfoAndProvider.info);
                }
            });
            autoUpdater.on('update-available', (event, info) => {
                log.info('update available');
                win.webContents.send('available', true);
            });
            autoUpdater.on('error', (event, error) => {
                log.info('error');
                win.webContents.send('error', error);
            });

            autoUpdater.on('update-downloaded', (event, info) => {
                autoUpdater.quitAndInstall();
                win.webContents.send('update-downloaded');
            });
        }
    })

    ipcMain.once('quit-and-install', (event, arg) => {
        autoUpdater.quitAndInstall(false);
    })

    //Check for updates and install
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    var template = [{
        label: "Application",
        submenu: [
            { label: "Quit", accelerator: "Command+Q", click: function () { app.quit(); } },
            { label: "Dev Tools", accelerator: "CmdOrCtrl+I", click: function () { win.toggleDevTools(); } }
        ]
    }, {
        label: "Edit",
        submenu: [
            { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
            { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
            { type: "separator" },
            { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
            { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
            { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
        ]
    }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    win.setMenuBarVisibility(false)

    win.webContents.on('new-window', function (e, url) {
        // make sure local urls stay in electron perimeter
        if ('file://' === url.substr(0, 'file://'.length)) {
            return;
        }

        e.preventDefault();
        shell.openExternal(url);
    });

});

// Listen for message from application (electron component) to either download updates
ipcMain.once('update', (event, arg) => {
    log.info('update')
    autoUpdater.downloadUpdate();
});

ipcMain.once('later', (event, arg) => {
    update = null;
});

ipcMain.once('relaunch', () => {
    app.relaunch();
    app.exit();
});

app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});

app.on('window-all-closed', function () {
    app.quit();
});


ipcMain.on("saveData", (event, arg) => {
    log.info('saveData called');
    delete arg.fileData.account.dataBackupFilePath;
    if (jetpack.exists(arg.fileName)) {
        log.info('saved existing')
        jetpack.writeAsync(arg.fileName, arg.fileData);
    } else if (arg.isArchive) {
        log.info('createArchiveFile')
        jetpack.writeAsync(arg.fileName, arg.fileData);
    } else if (arg.isCreateNewFile) {
        log.info('createNewFile')
        jetpack.writeAsync(arg.fileName, arg.fileData);
    }
});

ipcMain.on("openDialog", (event, arg) => {
    log.info('openDialog');
    let saveDialogOptions = {
        filters: [{
            name: "JSON Files",
            extensions: ["json"]
        }],
        defaultPath: arg.fileName
    }
    dialog.showSaveDialog(win, saveDialogOptions).then(results => {
        win.webContents.send('file-path', results.filePath);
        // log.info('save new')
        // jetpack.writeAsync(results.filePath, arg.fileData);
    });

});

ipcMain.on("uploadFileDialog", async (event) => {
    log.info('open upload bill dialog');
    const result = await dialog.showOpenDialog({
        properties: ['openFile']
    });
    if (result && result.filePaths.length > 0){
        win.webContents.send('utility-file-path', result.filePaths[0]);
        log.info('path selected is ' + result.filePaths[0]);
    }
});

ipcMain.on("openUploadedFileLocation", (event, filepath) => {
    log.info('File opened at location ' + filepath);
    if(filepath){
        shell.showItemInFolder(filepath);
    }
});

ipcMain.on("utilityFileExists", (event, path) => {
    log.info('Checking if file exists');
    const exists = fs.existsSync(path);
    win.webContents.send('utility-file-exists', exists);
});

ipcMain.on("fileExists", (event, arg) => {
    log.info("check for data");
    let results = jetpack.exists(arg.fileName);
    win.webContents.send('file-exists', results);
})

ipcMain.on("getDataFile", (event, arg) => {
    let dataFile = jetpack.read(arg.fileName, 'json');
    win.webContents.send('data-file', dataFile);
});