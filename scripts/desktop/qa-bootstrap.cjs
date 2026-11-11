// This file is copied into QA packages only; production retains its original entrypoint.
const { app } = require('electron');
const path = require('node:path');
const config = require('./desktop-qa-config.json');

if (config.appId !== 'gov.ornl.amo.verifi.qa' || config.name !== 'verifi-desktop-qa' ||
    config.debugPort !== 47832 || config.feed !== 'http://127.0.0.1:47831/updates/') {
    throw new Error('Invalid desktop QA configuration.');
}
app.setName(config.name);
app.setPath('userData', path.join(app.getPath('appData'), config.name));
if (process.platform === 'win32') app.setAppUserModelId(config.appId);
app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');
app.commandLine.appendSwitch('remote-debugging-port', String(config.debugPort));
// Preserve the application's BrowserWindow security and its real updater handlers.
require('./main.js');
