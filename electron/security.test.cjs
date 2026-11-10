const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isApplicationUrl, isTrustedSender, isExternalUrl } = require('./security.cjs');

test('accepts only the packaged entry document and its hash routes', () => {
    assert.equal(isApplicationUrl('file:///app/index.html#/welcome', '/app/index.html'), true);
    assert.equal(isApplicationUrl('file:///app/#/welcome', '/app/index.html'), true);
    for (const value of ['file:///app/', 'file:///other/#/welcome', 'file:///other/index.html', 'https://example.com/index.html', 'file://host/app/index.html', 'file:///app/index.html?other=1', 'not a URL']) {
        assert.equal(isApplicationUrl(value, '/app/index.html'), false, value);
    }
});

test('rejects other windows, subframes, remote documents, and destroyed windows', () => {
    const frame = { url: 'file:///app/index.html#/welcome' };
    const win = { isDestroyed: () => false, webContents: { mainFrame: frame } };
    const event = { sender: win.webContents, senderFrame: frame };
    assert.equal(isTrustedSender(event, win, '/app/index.html'), true);
    assert.equal(isTrustedSender({ ...event, sender: {} }, win, '/app/index.html'), false);
    assert.equal(isTrustedSender({ ...event, senderFrame: { ...frame } }, win, '/app/index.html'), false);
    frame.url = 'https://example.com';
    assert.equal(isTrustedSender(event, win, '/app/index.html'), false);
    assert.equal(isTrustedSender(event, { ...win, isDestroyed: () => true }, '/app/index.html'), false);
    assert.equal(isTrustedSender(event, null, '/app/index.html'), false);
});

test('allows browser and mail links but rejects executable and local schemes', () => {
    for (const value of ['https://ornl.gov', 'http://example.com', 'mailto:verifi-help@ornl.gov']) assert.equal(isExternalUrl(value), true);
    for (const value of ['file:///tmp/test.exe', 'javascript:alert(1)', 'data:text/html,test', 'custom:run', 'invalid']) assert.equal(isExternalUrl(value), false);
});
