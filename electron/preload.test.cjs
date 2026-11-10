const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function setup() {
    const renderer = new EventEmitter();
    const sent = [];
    renderer.send = (...args) => sent.push(args);
    renderer.invoke = async (...args) => args;
    let api;
    vm.runInNewContext(readFileSync(require.resolve('../preload.js'), 'utf8'), {
        require: name => {
            assert.equal(name, 'electron');
            return { ipcRenderer: renderer, contextBridge: { exposeInMainWorld: (_name, value) => { api = value; } } };
        }
    });
    return { api, renderer, sent };
}

test('only forwards allowlisted commands and invokes', async () => {
    const { api, sent } = setup();
    api.send('quit-and-install');
    api.send('update');
    api.send('arbitrary-command');
    assert.deepEqual(sent, [['quit-and-install', undefined], ['update', undefined]]);
    await assert.rejects(api.invoke('arbitrary-command'), /not allowed/);
    assert.equal((await api.invoke('backup:exists', { path: '/tmp/test.json' }))[0], 'backup:exists');
    assert.equal(api.ipcRenderer, undefined);
});

test('strips native events and removes exactly the subscribed listener', () => {
    const { api, renderer } = setup();
    const received = [];
    const off = api.on('update-status', value => received.push(value));
    const other = () => {};
    renderer.on('update-status', other);
    renderer.emit('update-status', { sender: 'private Electron object' }, { status: 'downloaded' });
    assert.deepEqual(received, [{ status: 'downloaded' }]);
    off();
    off();
    assert.equal(renderer.listenerCount('update-status'), 1);
    api.on('forbidden-event', () => {});
    assert.equal(renderer.listenerCount('forbidden-event'), 0);
});
