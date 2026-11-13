const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const asar = require('@electron/asar');
const yaml = require('js-yaml');
const { inspectApplication, productionUpdater, appImagePayload, extractDistribution, inspectPackage } = require('./inspect-production-package.cjs');

const version = '0.17.0-beta', main = 'original production entrypoint';
const sourcePackage = { name: 'verifi', version, main: 'main.js', build: { appId: 'gov.ornl.amo', productName: 'VERIFI' } };
const publisher = 'Production Publisher';
const updater = { provider: 'github', owner: 'ORNL-AMO', repo: 'VERIFI' };
const entrypointSha256 = createHash('sha256').update(main).digest('hex');

async function temporary(t) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifi-package-inspection-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    return directory;
}

async function application(t, platform, change = {}) {
    const directory = await temporary(t), root = path.join(directory, platform === 'mac' ? 'VERIFI.app' : 'application');
    const resources = platform === 'mac' ? path.join(root, 'Contents/Resources') : path.join(root, 'resources');
    const input = path.join(directory, 'source'); await fs.mkdir(input, { recursive: true }); await fs.mkdir(resources, { recursive: true });
    await fs.writeFile(path.join(input, 'package.json'), JSON.stringify({ name: 'verifi', version, main: 'main.js', ...change.package }));
    await fs.writeFile(path.join(input, 'main.js'), change.main || main);
    if (change.qaFile) await fs.writeFile(path.join(input, change.qaFile), '{}');
    await asar.createPackage(input, path.join(resources, 'app.asar'));
    await fs.writeFile(path.join(resources, 'app-update.yml'), yaml.dump({ ...updater, ...(platform === 'windows' ? { publisherName: publisher } : {}), ...change.updater }));
    const executable = platform === 'mac' ? path.join(root, 'Contents/MacOS/VERIFI') : path.join(root, platform === 'windows' ? 'VERIFI.exe' : 'VERIFI');
    await fs.mkdir(path.dirname(executable), { recursive: true }); await fs.writeFile(executable, 'binary fixture; never execute');
    const manifest = { platform, version, verification: { publisher } };
    const context = { platform, manifest, sourcePackage, expectedEntrypointSha256: entrypointSha256 };
    return { directory, root, resources, context };
}

function fakeAppImage() {
    const bytes = Buffer.alloc(224);
    Buffer.from([0x7f, 0x45, 0x4c, 0x46, 2, 1]).copy(bytes);
    bytes.writeUInt16LE(62, 18); bytes.writeBigUInt64LE(64n, 40); bytes.writeUInt16LE(64, 58); bytes.writeUInt16LE(1, 60);
    bytes.writeUInt32LE(1, 68); bytes.writeBigUInt64LE(0n, 88); bytes.writeBigUInt64LE(64n, 96);
    bytes.write('hsqs', 128); bytes.writeUInt16LE(4, 156); bytes.writeBigUInt64LE(96n, 168);
    return bytes;
}

test('inspects actual ASAR bytes, immutable entrypoint and public GitHub updater without launching the app', async t => {
    const value = await application(t, 'linux');
    const observation = await inspectApplication(value.root, value.context, async () => { throw new Error('Linux identity inspection needs no executable commands'); });
    assert.equal(observation.application.version, version);
    assert.equal(observation.application.entrypointSha256, entrypointSha256);
    assert.deepEqual(observation.updater, { ...updater, channel: 'latest' });
    assert.equal(observation.identity.executable, 'VERIFI');
});

test('production application inspection rejects QA metadata/files, changed identity and changed main bytes', async t => {
    for (const change of [{ package: { verifiQa: {} } }, { package: { name: 'verifi-desktop-qa' } }, { package: { version: '0.0.32' } }, { package: { main: 'desktop-qa-bootstrap.cjs' } }, { qaFile: 'Desktop-QA-config.json' }, { main: 'injected startup wrapper' }]) {
        const value = await application(t, 'linux', change);
        await assert.rejects(inspectApplication(value.root, value.context));
    }
    const value = await application(t, 'linux');
    await fs.writeFile(path.join(value.resources, 'desktop-qa-config.json'), '{}');
    await assert.rejects(inspectApplication(value.root, value.context), /QA bootstrap/);
});

test('updater policy rejects generic/loopback feeds, wrong repo/channel and Windows publisher expansion', () => {
    assert.equal(productionUpdater({ ...updater, channel: 'latest' }, 'linux').channel, 'latest');
    productionUpdater({ ...updater, publisherName: publisher }, 'windows', publisher);
    for (const change of [{ provider: 'generic', url: 'http://127.0.0.1:47831/updates' }, { owner: 'other' }, { repo: 'other' }, { channel: 'beta' }, { host: 'localhost' }, { protocol: 'http' }, { private: true }, { token: 'embedded-secret' }]) assert.throws(() => productionUpdater({ ...updater, ...change }, 'linux'));
    for (const publisherName of [undefined, 'Other Publisher', [publisher, 'Other Publisher']]) assert.throws(() => productionUpdater({ ...updater, publisherName }, 'windows', publisher));
});

test('native Mac and Windows identities are checked as data, with no application execution', async t => {
    const mac = await application(t, 'mac');
    const info = { CFBundleIdentifier: 'gov.ornl.amo', CFBundleName: 'VERIFI', CFBundleExecutable: 'VERIFI', CFBundleShortVersionString: '0.17.0' };
    const observation = await inspectApplication(mac.root, mac.context, async (command, args) => {
        assert.equal(command, 'plutil'); assert(args.includes('-')); return { stdout: JSON.stringify(info) };
    });
    assert.equal(observation.identity.appId, 'gov.ornl.amo');
    await assert.rejects(inspectApplication(mac.root, mac.context, async () => ({ stdout: JSON.stringify({ ...info, CFBundleIdentifier: 'gov.ornl.amo.verifi.qa' }) })), /nonproduction/);
    const windows = await application(t, 'windows');
    await inspectApplication(windows.root, windows.context, async command => { assert.equal(command, 'pwsh'); return { stdout: '{"ProductName":"VERIFI"}' }; });
    await assert.rejects(inspectApplication(windows.root, windows.context, async () => ({ stdout: '{"ProductName":"VERIFI QA"}' })), /nonproduction/);
});

test('finds the bounded x64 ELF/SquashFS payload without executing an AppImage', async t => {
    const directory = await temporary(t), file = path.join(directory, 'VERIFI.AppImage');
    const bytes = fakeAppImage(); await fs.writeFile(file, bytes);
    assert.deepEqual(await appImagePayload(file), { offset: 128, length: 96 });
    for (const mutate of [value => value[4] = 1, value => value.writeUInt16LE(0, 60), value => value.writeBigUInt64LE(999999999n, 40), value => value.write('nope', 128), value => value.writeBigUInt64LE(1000n, 168)]) {
        const changed = Buffer.from(bytes); mutate(changed); await fs.writeFile(file, changed);
        await assert.rejects(appImagePayload(file));
    }
});

test('Mac DMG inspection uses a read-only mount and detaches even when inspection fails', async t => {
    const directory = await temporary(t), calls = [];
    await assert.rejects(extractDistribution('VERIFI.dmg', path.join(directory, 'mount'), 'mac', async () => { throw new Error('wrong packaged identity'); }, async (command, args) => { calls.push({ command, args }); return { stdout: '' }; }), /wrong packaged identity/);
    assert.deepEqual(calls.map(value => value.command), ['hdiutil', 'hdiutil']);
    assert(calls[0].args.includes('-readonly')); assert.equal(calls[1].args[0], 'detach');
});

test('NSIS inspection extracts its x64 archive and never invokes the installer', async t => {
    const directory = await temporary(t), calls = [];
    const result = await extractDistribution('VERIFI-Setup.exe', path.join(directory, 'nsis'), 'windows', async () => 'inspected', async (command, args) => {
        calls.push({ command, args });
        if (args[0] === 'i') return { stdout: 'NSIS' };
        const output = args.find(arg => arg.startsWith('-o')).slice(2);
        await fs.mkdir(output, { recursive: true });
        if (args.at(-1).endsWith('.exe')) { await fs.mkdir(path.join(output, '$PLUGINSDIR')); await fs.writeFile(path.join(output, '$PLUGINSDIR/app-64.7z'), 'inner archive'); }
        return { stdout: '' };
    });
    assert.equal(result, 'inspected');
    assert.equal(calls.length, 3); assert(calls.every(call => call.command.endsWith('7z.exe')));
    assert(calls.at(-1).args.at(-1).endsWith('app-64.7z'));
});

test('AppImage extraction copies only SquashFS bytes and never uses an AppImage runtime switch', async t => {
    const directory = await temporary(t), file = path.join(directory, 'VERIFI.AppImage'), calls = [];
    await fs.writeFile(file, fakeAppImage());
    await extractDistribution(file, path.join(directory, 'out'), 'linux', async () => {
        const bytes = await fs.readFile(path.join(directory, 'out/payload.squashfs'));
        assert.equal(bytes.length, 96); assert.equal(bytes.toString('ascii', 0, 4), 'hsqs');
    }, async (command, args) => { calls.push({ command, args }); return { stdout: args[0] === 'i' ? 'SquashFS' : '' }; });
    assert(calls.every(value => value.command === '7z'));
    assert(!calls.some(value => value.args.includes('--appimage-extract')));
});

test('tarball extraction refuses path traversal and changed payloads fail before extraction', async t => {
    const directory = await temporary(t);
    await assert.rejects(extractDistribution('VERIFI.tar.gz', path.join(directory, 'tar'), 'linux', async () => {}, async () => ({ stdout: '../outside\n' })), /unsafe extraction/);
    const file = path.join(directory, 'VERIFI.exe'); await fs.writeFile(file, 'changed installer');
    await assert.rejects(inspectPackage({ platform: 'windows', directory, manifest: { platform: 'windows', qa: false, role: 'production', files: [{ name: 'VERIFI.exe', size: 10, sha256: '0'.repeat(64) }] }, sourcePackage, expectedEntrypointSha256: entrypointSha256, outputDirectory: path.join(directory, 'extracted') }, async () => { throw new Error('must not extract mismatched bytes'); }), /hash\/size mismatch/);
});
