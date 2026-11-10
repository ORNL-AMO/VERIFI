const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const vm = require('node:vm');

async function setup() {
    const root = path.resolve(__dirname, '..');
    const app = Object.assign(new EventEmitter(), { isPackaged: true, whenReady: async () => {}, quit() {}, relaunch() {}, exit() { this.exitRequested = true; } });
    const updater = Object.assign(new EventEmitter(), { checkForUpdates: async () => null, downloadUpdate: async () => {}, quitAndInstall() {} });
    const handlers = new Map();
    const requests = new Map();
    const external = [];
    const windows = [];
    const writes = [];
    class BrowserWindow extends EventEmitter {
        constructor(options) {
            super();
            this.options = options;
            this.webContents = Object.assign(new EventEmitter(), {
                mainFrame: { url: pathToFileURL(path.join(root, 'dist/verifi/browser/index.html')).href },
                isDestroyed: () => false, send() {},
                setWindowOpenHandler: handler => { this.popup = handler; }
            });
            windows.push(this);
        }
        isDestroyed() { return false; }
        async loadURL() {}
        setMenuBarVisibility() {}
    }
    vm.runInNewContext(readFileSync(path.join(root, 'main.js'), 'utf8'), {
        __dirname: root, process: { platform: 'darwin', env: {} }, URL,
        require: name => {
            if (name === 'electron') return {
                app, BrowserWindow,
                ipcMain: { on: (name, fn) => handlers.set(name, fn), handle: (name, fn) => requests.set(name, fn) },
                Menu: { buildFromTemplate: value => value, setApplicationMenu() {} },
                shell: { openExternal: async value => external.push(value) }, dialog: {},
                session: { defaultSession: { webRequest: { onBeforeSendHeaders() {} } } }
            };
            if (name === 'electron-log') return { transports: { file: {} }, info() {}, warn() {}, error() {} };
            if (name === 'electron-updater') return { autoUpdater: updater };
            if (name === 'node:fs') return {
                existsSync: () => true, unlinkSync: value => writes.push(value),
                promises: { readFile: async () => '{"origin":"VERIFI"}' }
            };
            return require(name.startsWith('./') ? path.join(root, name) : name);
        }
    });
    await Promise.resolve();
    const win = windows[0];
    const trusted = { sender: win.webContents, senderFrame: win.webContents.mainFrame };
    return { app, win, updater, handlers, requests, trusted, external, writes, windows };
}

test('main process enforces sender validation on filesystem and updater commands', async () => {
    const { win, handlers, requests, trusted, writes } = await setup();
    assert.equal(win.options.webPreferences.contextIsolation, true);
    assert.equal(win.options.webPreferences.nodeIntegration, false);
    assert.equal(win.options.webPreferences.sandbox, true);
    const subframe = { ...trusted, senderFrame: { ...trusted.senderFrame } };
    handlers.get('disconnectBill')(subframe, '/tmp/bill.pdf');
    assert.throws(() => requests.get('backup:read')(subframe, { path: '/tmp/account.json' }), /Untrusted/);
    assert.equal(writes.length, 0);
    const result = await requests.get('backup:read')(trusted, { path: '/tmp/account.json' });
    assert.equal(result.data.origin, 'VERIFI');
    trusted.senderFrame.url = trusted.senderFrame.url.replace('index.html', '#/welcome');
    assert.equal((await requests.get('backup:read')(trusted, { path: '/tmp/account.json' })).ok, true);
});

test('denies popup windows, opens only safe external links, and keeps local routing', async () => {
    const { win, external } = await setup();
    assert.equal(win.popup({ url: 'https://ornl.gov' }).action, 'deny');
    win.popup({ url: 'file:///tmp/other.html' });
    win.popup({ url: 'javascript:alert(1)' });
    assert.deepEqual(external, ['https://ornl.gov']);
    let prevented = false;
    win.webContents.emit('will-navigate', { preventDefault() { prevented = true; } }, `${win.webContents.mainFrame.url}#/welcome`);
    assert.equal(prevented, false);
    win.webContents.emit('will-navigate', { preventDefault() { prevented = true; } }, 'https://ornl.gov');
    assert.equal(prevented, true);
});

test('does not send update notifications to closed windows and recreates the window on activation', async () => {
    const { app, win, updater, windows } = await setup();
    win.emit('closed');
    assert.doesNotThrow(() => updater.emit('update-downloaded', { version: '1.1.0' }));
    app.emit('activate');
    assert.equal(windows.length, 2);
    assert.equal(updater.listenerCount('update-downloaded'), 1);
});

test('preserves the explicit database-reset relaunch and rejects requests from other frames', async () => {
    const { app, handlers, trusted } = await setup();
    handlers.get('relaunch')({ ...trusted, senderFrame: {} });
    await Promise.resolve();
    assert.equal(app.exitRequested, undefined);
    handlers.get('relaunch')(trusted);
    await Promise.resolve();
    assert.equal(app.exitRequested, true);
});
