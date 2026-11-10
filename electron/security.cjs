const path = require('node:path');
const { fileURLToPath } = require('node:url');

function isApplicationUrl(value, entryPath) {
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'file:' || parsed.host || parsed.search) return false;
        const documentPath = path.resolve(fileURLToPath(parsed));
        // Angular's HashLocationStrategy replaces index.html with the base directory in history.
        return documentPath === path.resolve(entryPath) ||
            (parsed.hash.startsWith('#/') && parsed.pathname.endsWith('/') && documentPath === path.dirname(path.resolve(entryPath)));
    } catch {
        return false;
    }
}

function isTrustedSender(event, win, entryPath) {
    return Boolean(win && !win.isDestroyed() && event.sender === win.webContents &&
        event.senderFrame === win.webContents.mainFrame && isApplicationUrl(event.senderFrame.url, entryPath));
}

function isExternalUrl(value) {
    try {
        return ['https:', 'http:', 'mailto:'].includes(new URL(value).protocol);
    } catch {
        return false;
    }
}

module.exports = { isApplicationUrl, isTrustedSender, isExternalUrl };
