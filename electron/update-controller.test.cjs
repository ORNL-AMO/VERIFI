const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { UpdateController } = require('./update-controller.cjs');

function setup(supported = true) {
    const updater = new EventEmitter();
    let checks = 0;
    let downloads = 0;
    let installs = 0;
    updater.checkForUpdates = async () => {
        checks++;
        updater.emit('update-available', { version: '1.1.0' });
        return { updateInfo: { version: '1.1.0' } };
    };
    updater.downloadUpdate = async () => { downloads++; };
    updater.quitAndInstall = () => { installs++; };
    const published = [];
    const controller = new UpdateController({ updater, supported, publish: state => published.push(state), log: { error() {} } });
    return { updater, controller, published, calls: () => ({ checks, downloads, installs }) };
}

test('registers listeners once and replays status for repeated renderer readiness', async () => {
    const { controller, updater, calls, published } = setup();
    await controller.ready();
    await controller.ready();
    assert.deepEqual(calls(), { checks: 1, downloads: 0, installs: 0 });
    assert.equal(updater.listenerCount('update-available'), 1);
    assert.equal(published.at(-1).status, 'available');
    assert.equal(published.at(-1).releaseName, '1.1.0');
    assert.equal(updater.autoDownload, false);
    assert.equal(updater.autoInstallOnAppQuit, false);
});

test('allows failed checks and failed downloads to be retried without relaunching', async () => {
    const { controller, updater, calls } = setup();
    const check = updater.checkForUpdates;
    updater.checkForUpdates = async () => { throw new Error('offline'); };
    await controller.ready();
    assert.equal(controller.state.status, 'error');
    assert.equal(controller.state.operation, 'check');
    updater.checkForUpdates = check;
    await controller.check();
    updater.downloadUpdate = async () => { throw new Error('private network details'); };
    await controller.download();
    assert.equal(controller.state.operation, 'download');
    assert.doesNotMatch(controller.state.message, /private network/);
    updater.downloadUpdate = async () => updater.emit('update-downloaded', { version: '1.1.0' });
    await controller.download();
    assert.equal(controller.state.status, 'downloaded');
    assert.equal(calls().installs, 0);
});

test('ignores duplicate downloads, forwards progress, and installs only on explicit request', async () => {
    const { controller, updater, calls } = setup();
    controller.install();
    assert.equal(calls().installs, 0);
    await controller.ready();
    await Promise.all([controller.download(), controller.download()]);
    assert.equal(calls().downloads, 1);
    updater.emit('download-progress', { percent: 31.5 });
    assert.equal(controller.state.percent, 31.5);
    updater.emit('update-downloaded', { version: '1.1.0' });
    assert.equal(calls().installs, 0);
    await controller.ready();
    assert.equal(controller.state.status, 'downloaded');
    controller.install();
    updater.emit('update-downloaded', { version: '1.1.0' });
    assert.equal(controller.state.status, 'installing');
    controller.install();
    assert.equal(calls().installs, 1);
});

test('uses documented error event arguments and recovers installation failures', async () => {
    const { controller, updater } = setup();
    await controller.ready();
    updater.emit('error', new Error('offline'), 'stack');
    assert.equal(controller.state.status, 'error');
    updater.emit('update-downloaded', { version: '1.1.0' });
    updater.quitAndInstall = () => { throw new Error('failed'); };
    controller.install();
    assert.equal(controller.state.status, 'downloaded');
    assert.match(controller.state.message, /could not be installed/);
});

test('does not check or download for development or unsupported packages', async () => {
    const { controller, calls } = setup(false);
    await controller.ready();
    await controller.check();
    await controller.download();
    controller.install();
    assert.equal(controller.state.status, 'unsupported');
    assert.deepEqual(calls(), { checks: 0, downloads: 0, installs: 0 });
});

test('reports current versions and null checks without exposing a download action', async () => {
    const { controller, updater, calls } = setup();
    updater.checkForUpdates = async () => {
        updater.emit('update-not-available', { version: '1.0.0' });
        return { updateInfo: { version: '1.0.0' } };
    };
    await controller.ready();
    await controller.download();
    assert.equal(controller.state.status, 'current');
    assert.equal(calls().downloads, 0);
    updater.checkForUpdates = async () => null;
    await controller.check();
    assert.equal(controller.state.status, 'unsupported');
});
