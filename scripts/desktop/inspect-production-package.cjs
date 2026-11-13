const fs = require('node:fs/promises');
const path = require('node:path');
const { createReadStream, createWriteStream } = require('node:fs');
const { pipeline } = require('node:stream/promises');
const { createHash } = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const asar = require('@electron/asar');
const yaml = require('js-yaml');
const { assert, verifyFiles } = require('./qa-contract.cjs');
const execute = promisify(execFile);

const IDENTITY = { name: 'verifi', productName: 'VERIFI', appId: 'gov.ornl.amo', main: 'main.js' };
const QA_FILES = new Set(['desktop-qa-bootstrap.cjs', 'desktop-qa-config.json', 'qa-bootstrap.cjs']);

async function run(command, args) {
    try { return await execute(command, args, { timeout: 180000, maxBuffer: 10_000_000, windowsHide: true }); }
    catch (error) { throw new Error(`Package inspection command failed: ${path.basename(command)} (${error.code || error.signal || 'error'}).`); }
}

async function exists(file) {
    try { await fs.access(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function archiveTool(platform, command = run) {
    const tool = platform === 'windows' ? path.join(process.env.ProgramFiles || 'C:\\Program Files', '7-Zip', '7z.exe') : '7z';
    const { stdout } = await command(tool, ['i']);
    assert(platform === 'windows' ? /nsis/i.test(stdout) : /squashfs/i.test(stdout), 'Full 7-Zip with NSIS/SquashFS support is required for static package inspection.');
    return tool;
}

async function appImagePayload(file) {
    const handle = await fs.open(file, 'r');
    try {
        const size = (await handle.stat()).size;
        const read = async (length, offset) => {
            assert(Number.isSafeInteger(offset) && offset >= 0 && offset + length <= size, 'AppImage ELF bounds are invalid.');
            const bytes = Buffer.alloc(length);
            assert((await handle.read(bytes, 0, length, offset)).bytesRead === length, 'AppImage is truncated.');
            return bytes;
        };
        const header = await read(64, 0);
        assert(header.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])) && header[4] === 2 && header[5] === 1 && header.readUInt16LE(18) === 62, 'Only the production Linux x64 ELF AppImage is supported.');
        const table = Number(header.readBigUInt64LE(40)), entrySize = header.readUInt16LE(58), count = header.readUInt16LE(60);
        assert(entrySize === 64 && count > 0 && count <= 4096, 'Unsupported AppImage ELF section table.');
        const sections = await read(entrySize * count, table);
        let offset = table + entrySize * count;
        for (let index = 0; index < count; index++) {
            const section = sections.subarray(index * entrySize, (index + 1) * entrySize);
            if (section.readUInt32LE(4) === 8) continue; // SHT_NOBITS occupies no bytes in the ELF file.
            const start = Number(section.readBigUInt64LE(24)), length = Number(section.readBigUInt64LE(32));
            assert(Number.isSafeInteger(start) && Number.isSafeInteger(length) && start >= 0 && length >= 0 && start + length <= size, 'Invalid AppImage ELF section.');
            offset = Math.max(offset, start + length);
        }
        const superblock = await read(96, offset);
        assert(superblock.toString('ascii', 0, 4) === 'hsqs' && superblock.readUInt16LE(28) === 4, 'AppImage has no supported SquashFS payload at its ELF boundary.');
        const length = Number(superblock.readBigUInt64LE(40));
        assert(Number.isSafeInteger(length) && length >= 96 && offset + length <= size, 'Invalid AppImage SquashFS bounds.');
        return { offset, length };
    } finally { await handle.close(); }
}

async function applicationRoot(directory, platform, depth = 0) {
    const resources = platform === 'mac' ? path.join(directory, 'Contents/Resources') : path.join(directory, 'resources');
    if (await exists(path.join(resources, 'app.asar'))) return [directory];
    if (depth === 3) return [];
    const roots = [];
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) roots.push(...await applicationRoot(path.join(directory, entry.name), platform, depth + 1));
    }
    return roots;
}

function productionUpdater(value, platform, publisher) {
    assert(value && value.provider === 'github' && value.owner === 'ORNL-AMO' && value.repo === 'VERIFI', 'Packaged updater must use the production GitHub repository.');
    assert(value.channel === undefined || value.channel === 'latest', 'Packaged updater uses a nonproduction channel.');
    assert(value.url === undefined && (value.host === undefined || value.host === 'github.com') && (value.protocol === undefined || value.protocol === 'https'), 'Packaged updater contains a QA, loopback or alternate feed.');
    assert(value.private !== true && value.token === undefined, 'Production updater must use the public feed without embedded credentials.');
    if (platform === 'windows') {
        const names = [].concat(value.publisherName || []);
        assert(typeof publisher === 'string' && publisher.length > 0 && names.length === 1 && names[0] === publisher, 'Packaged Windows publisher does not match verified native signing evidence.');
    }
    return { provider: value.provider, owner: value.owner, repo: value.repo, channel: 'latest', ...(platform === 'windows' ? { publisherName: publisher } : {}) };
}

async function inspectApplication(root, { platform, manifest, sourcePackage, expectedEntrypointSha256 }, command = run) {
    assert(sourcePackage.name === IDENTITY.name && sourcePackage.main === IDENTITY.main && sourcePackage.build?.appId === IDENTITY.appId && sourcePackage.build?.productName === IDENTITY.productName, 'Immutable source does not describe the production identity.');
    const resources = platform === 'mac' ? path.join(root, 'Contents/Resources') : path.join(root, 'resources');
    const archive = path.join(resources, 'app.asar');
    const realArchive = await fs.realpath(archive), realRoot = await fs.realpath(root);
    assert(realArchive.startsWith(`${realRoot}${path.sep}`), 'Application archive escapes its extracted package.');
    const entries = asar.listPackage(archive);
    assert(!entries.some(entry => QA_FILES.has(path.posix.basename(entry.replaceAll('\\', '/')).toLowerCase())), 'QA bootstrap/configuration is present in the production archive.');
    for (const name of QA_FILES) assert(!await exists(path.join(resources, name)) && !await exists(path.join(root, name)), 'QA bootstrap/configuration is present beside the production archive.');
    const pkg = JSON.parse(asar.extractFile(archive, 'package.json').toString('utf8'));
    assert(pkg.name === IDENTITY.name && pkg.main === IDENTITY.main && pkg.version === manifest.version && pkg.verifiQa === undefined, 'Packaged application identity/version/entrypoint is not production.');
    assert(asar.statFile(archive, IDENTITY.main).unpacked !== true, 'Production entrypoint must be inside the inspected archive.');
    const entrypointSha256 = createHash('sha256').update(asar.extractFile(archive, IDENTITY.main)).digest('hex');
    assert(entrypointSha256 === expectedEntrypointSha256, 'Packaged entrypoint differs from immutable production source.');
    const updater = productionUpdater(yaml.load(await fs.readFile(path.join(resources, 'app-update.yml'), 'utf8')), platform, manifest.verification?.publisher);
    let identity;
    if (platform === 'mac') {
        assert(path.basename(root) === 'VERIFI.app', 'Unexpected Mac application bundle name.');
        const { stdout } = await command('plutil', ['-convert', 'json', '-o', '-', path.join(root, 'Contents/Info.plist')]);
        const info = JSON.parse(stdout);
        assert(info.CFBundleIdentifier === IDENTITY.appId && info.CFBundleName === IDENTITY.productName && info.CFBundleExecutable === IDENTITY.productName, 'Mac bundle has a nonproduction identity.');
        assert(String(info.CFBundleShortVersionString).replace(/[-+].*$/, '') === pkg.version.replace(/[-+].*$/, ''), 'Mac bundle version differs from its application.');
        await fs.access(path.join(root, 'Contents/MacOS/VERIFI'));
        identity = { appId: info.CFBundleIdentifier, productName: info.CFBundleName, executable: info.CFBundleExecutable };
    } else {
        const executable = platform === 'windows' ? 'VERIFI.exe' : 'VERIFI';
        await fs.access(path.join(root, executable));
        if (platform === 'windows') {
            const literalPath = path.join(root, executable).replaceAll("'", "''");
            const script = `$info = (Get-Item -LiteralPath '${literalPath}').VersionInfo; @{ProductName=$info.ProductName} | ConvertTo-Json -Compress`;
            const { stdout } = await command('pwsh', ['-NoProfile', '-NonInteractive', '-Command', script]);
            assert(JSON.parse(stdout).ProductName === IDENTITY.productName, 'Windows executable has a nonproduction product identity.');
        }
        const desktops = (await fs.readdir(root)).filter(name => name.endsWith('.desktop'));
        if (platform === 'linux' && desktops.length) {
            assert(desktops.length === 1, 'Unexpected Linux application desktop identities.');
            const desktop = await fs.readFile(path.join(root, desktops[0]), 'utf8');
            assert(/^Name=VERIFI\r?$/m.test(desktop) && !/verifi-desktop-qa|VERIFI QA/.test(desktop), 'Linux desktop identity is not production.');
        }
        identity = { productName: IDENTITY.productName, executable };
    }
    return { application: { name: pkg.name, version: pkg.version, main: pkg.main, entrypointSha256 }, updater, identity };
}

async function extractDistribution(file, destination, platform, inspect, command = run) {
    await fs.mkdir(destination, { recursive: true });
    if (file.endsWith('.dmg')) {
        const mount = path.join(destination, 'mounted'); await fs.mkdir(mount);
        let mounted = false;
        try {
            await command('hdiutil', ['attach', '-readonly', '-nobrowse', '-plist', '-mountpoint', mount, file]); mounted = true;
            return await inspect(mount);
        } finally { if (mounted) await command('hdiutil', ['detach', mount]); }
    }
    if (file.endsWith('.zip')) await command('ditto', ['-x', '-k', file, destination]);
    else if (file.endsWith('.exe')) {
        const tool = await archiveTool('windows', command), outer = path.join(destination, 'nsis');
        await command(tool, ['x', '-y', '-bd', `-o${outer}`, file]);
        const plugins = path.join(outer, '$PLUGINSDIR');
        const payloads = (await fs.readdir(plugins)).filter(name => /^app-.*\.7z$/.test(name));
        assert(payloads.length === 1 && payloads[0] === 'app-64.7z', 'NSIS must contain exactly the production x64 application payload.');
        const application = path.join(destination, 'application');
        await command(tool, ['x', '-y', '-bd', `-o${application}`, path.join(plugins, payloads[0])]);
        return inspect(application);
    } else if (file.endsWith('.AppImage')) {
        const tool = await archiveTool('linux', command), payload = await appImagePayload(file), squash = path.join(destination, 'payload.squashfs');
        await pipeline(createReadStream(file, { start: payload.offset, end: payload.offset + payload.length - 1 }), createWriteStream(squash, { flags: 'wx' }));
        const application = path.join(destination, 'application');
        await command(tool, ['x', '-y', '-bd', `-o${application}`, squash]);
        return inspect(application);
    } else if (file.endsWith('.tar.gz')) {
        const { stdout } = await command('tar', ['-tzf', file]);
        assert(stdout.trim().split('\n').every(name => !path.posix.isAbsolute(name) && !name.split('/').includes('..') && !name.includes('\\')), 'Tarball contains unsafe extraction paths.');
        await command('tar', ['-xzf', file, '-C', destination]);
    } else throw new Error('Unsupported production distribution.');
    return inspect(destination);
}

async function inspectPackage({ platform, directory, manifest, sourcePackage, expectedEntrypointSha256, outputDirectory }, command = run) {
    assert(['windows', 'mac', 'linux'].includes(platform) && manifest.platform === platform && manifest.qa === false && manifest.role === 'production', 'Expected production platform manifest.');
    await verifyFiles(directory, manifest.files);
    const payloads = manifest.files.filter(file => /\.(exe|dmg|zip|AppImage|tar\.gz)$/.test(file.name));
    assert(payloads.length === (platform === 'windows' ? 1 : 2), 'Incomplete production distributions to inspect.');
    assert(typeof outputDirectory === 'string' && outputDirectory.length > 0, 'A fresh extraction directory is required.');
    await fs.mkdir(path.dirname(outputDirectory), { recursive: true });
    await fs.mkdir(outputDirectory); // Never reuse or clean an existing user directory.
    const observations = [];
    try {
        for (const file of payloads) {
            const observation = await extractDistribution(path.join(directory, file.name), path.join(outputDirectory, file.name), platform, async extracted => {
                const roots = await applicationRoot(extracted, platform);
                assert(roots.length === 1, 'Distribution must contain exactly one production application.');
                return inspectApplication(roots[0], { platform, manifest, sourcePackage, expectedEntrypointSha256 }, command);
            }, command);
            observations.push({ name: file.name, ...observation });
        }
    } finally { await fs.rm(outputDirectory, { recursive: true, force: true }); }
    return observations;
}

module.exports = { inspectPackage, inspectApplication, productionUpdater, appImagePayload, extractDistribution, applicationRoot };
