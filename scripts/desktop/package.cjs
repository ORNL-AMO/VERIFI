const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const { QA_IDENTITY, QA_INSTRUMENTATION_VERSION, assert, sha } = require('./qa-contract.cjs');
const { publisherFromCertificate } = require('./package-windows.cjs');

async function packageConfig(source, platform, qaVersion) {
    const requireSource = createRequire(path.join(source, 'package.json'));
    const pkg = requireSource('./package.json');
    const config = { files: ['**/*', '!scripts/desktop/**', '!desktop-package-config.json', '!desktop-verification.json'], directories: { output: 'output' }, publish: [{ provider: 'github', owner: 'ORNL-AMO', repo: 'VERIFI' }] };
    if (platform === 'windows') config.win = { verifyUpdateCodeSignature: true, signtoolOptions: { publisherName: publisherFromCertificate(process.env.WIN_CERT_BASE64) } };
    if (qaVersion) {
        assert(/^0\.[0-9]+\.[0-9]+$/.test(qaVersion), 'Invalid QA version.');
        assert(pkg.main === 'main.js', 'QA wrapper requires the existing main.js entrypoint.');
        const wrapper = await fs.readFile(path.join(__dirname, 'qa-bootstrap.cjs'));
        const configuration = JSON.stringify(QA_IDENTITY, null, 2) + '\n';
        let updaterContract = 'legacy';
        try { await fs.access(path.join(source, 'electron/update-controller.cjs')); updaterContract = 'guarded-v1'; }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        await fs.writeFile(path.join(source, 'desktop-qa-bootstrap.cjs'), wrapper);
        await fs.writeFile(path.join(source, 'desktop-qa-config.json'), configuration);
        Object.assign(config, {
            appId: QA_IDENTITY.appId, productName: QA_IDENTITY.productName,
            extraMetadata: { name: QA_IDENTITY.name, version: qaVersion, main: 'desktop-qa-bootstrap.cjs', verifiQa: {
                sourceSha: sha(process.env.DESKTOP_SOURCE_SHA), workflowSha: sha(process.env.DESKTOP_WORKFLOW_SHA), instrumentationVersion: QA_INSTRUMENTATION_VERSION, updaterContract,
                wrapperSha256: createHash('sha256').update(wrapper).digest('hex'), configSha256: createHash('sha256').update(configuration).digest('hex')
            } },
            publish: [{ provider: 'generic', url: QA_IDENTITY.feed, channel: 'latest', useMultipleRangeRequest: false }],
            // QA has its own bundle identity and no restricted entitlements requiring
            // the production identity's provisioning profile. Developer ID signing remains.
            mac: { provisioningProfile: null },
            linux: { executableName: 'verifi-desktop-qa' },
            nsis: { guid: '9ff93a84-f498-45c4-a56b-4c7180da99c1' }
        });
    } else {
        for (const name of ['desktop-qa-bootstrap.cjs', 'desktop-qa-config.json']) {
            await assertAbsent(path.join(source, name));
        }
    }
    return config;
}

async function assertAbsent(file) {
    try { await fs.access(file); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    throw new Error('QA instrumentation must never enter a production package.');
}

async function main() {
    const [sourceArg, platform, version] = process.argv.slice(2);
    const source = path.resolve(sourceArg);
    const requireSource = createRequire(path.join(source, 'package.json'));
    const { build, Platform, Arch } = requireSource('electron-builder');
    const target = { windows: () => Platform.WINDOWS.createTarget(['nsis'], Arch.x64), linux: () => Platform.LINUX.createTarget(['AppImage', 'tar.gz'], Arch.x64), mac: () => Platform.MAC.createTarget(['dmg', 'zip'], Arch.universal) }[platform];
    assert(target, 'Unsupported desktop platform.');
    const config = await packageConfig(source, platform, version);
    // Store the exact resolved build configuration for manifest generation.
    await fs.writeFile(path.join(source, 'desktop-package-config.json'), JSON.stringify(config, null, 2) + '\n');
    await build({ projectDir: source, targets: target(), publish: 'never', config });
    if (platform === 'windows') {
        const yaml = requireSource('js-yaml');
        const updater = yaml.load(await fs.readFile(path.join(source, 'output/win-unpacked/resources/app-update.yml'), 'utf8'));
        assert([].concat(updater.publisherName || []).includes(config.win.signtoolOptions.publisherName), 'Packaged updater is missing its expected signing publisher.');
    }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { packageConfig };
