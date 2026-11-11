const { build, Platform } = require('electron-builder');

// No certificates, provisioning profile, publishing, or production signing overrides required.
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
delete process.env.CSC_LINK;
delete process.env.WIN_CSC_LINK;
const platform = process.platform === 'darwin' ? Platform.MAC : process.platform === 'win32' ? Platform.WINDOWS : Platform.LINUX;
build({
    targets: platform.createTarget(process.argv.includes('--dir') ? ['dir'] : undefined),
    publish: 'never',
    config: {
        forceCodeSigning: false,
        mac: { identity: '-', provisioningProfile: null, hardenedRuntime: false },
        win: { signtoolOptions: { sign: async () => {} } }
    }
}).then(async () => {
    if (process.platform === 'darwin' && !process.argv.includes('--dir')) {
        const { finalizeMetadata, darwinMinimum } = require('./update-metadata.cjs');
        const minimum = darwinMinimum(require('../../package.json').build.mac.minimumSystemVersion);
        await finalizeMetadata('output', 'latest-mac.yml', true, minimum);
        await finalizeMetadata('output', 'latest-mac.yml', false, minimum);
    }
}).catch(error => { console.error(error.message); process.exitCode = 1; });
