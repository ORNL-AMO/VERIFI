const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createReadStream } = require('node:fs');
const requireSource = require('node:module').createRequire(path.resolve(process.env.DESKTOP_SOURCE_DIR || process.cwd(), 'package.json'));
const yaml = requireSource('js-yaml');
const { gunzipSync } = require('node:zlib');

function artifactPath(directory, name) {
    const decoded = decodeURIComponent(name);
    if (!decoded || decoded !== path.basename(decoded) || /[\\/]/.test(decoded)) throw new Error('Invalid update artifact name.');
    return path.join(directory, decoded);
}

async function describe(file) {
    const hash = createHash('sha512');
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    return { size: (await fs.stat(file)).size, sha512: hash.digest('base64') };
}

async function verifyBlockmap(file, size) {
    const map = JSON.parse(gunzipSync(await fs.readFile(`${file}.blockmap`)));
    const blocks = map.files?.[0];
    if (map.version !== '2' || map.files.length !== 1 || blocks.offset !== 0 ||
        blocks.sizes.length !== blocks.checksums.length || blocks.sizes.reduce((sum, value) => sum + value, 0) !== size) {
        throw new Error(`Invalid blockmap: ${path.basename(file)}`);
    }
    const { blake2b } = requireSource('@noble/hashes/blake2.js');
    let remaining = Buffer.alloc(0);
    let index = 0;
    for await (const chunk of createReadStream(file)) {
        remaining = Buffer.concat([remaining, chunk]);
        while (index < blocks.sizes.length && remaining.length >= blocks.sizes[index]) {
            const length = blocks.sizes[index];
            if (!Number.isInteger(length) || length <= 0) throw new Error('Invalid block size.');
            const hash = Buffer.from(blake2b(remaining.subarray(0, length), { dkLen: 18 })).toString('base64');
            if (hash !== blocks.checksums[index]) throw new Error(`Blockmap checksum mismatch: ${path.basename(file)}`);
            remaining = remaining.subarray(length);
            index++;
        }
    }
    if (remaining.length || index !== blocks.sizes.length) throw new Error('Incomplete blockmap.');
}

function darwinMinimum(marketingVersion) {
    if (marketingVersion === undefined) return undefined;
    if (!/^\d+\.\d+(\.\d+)?$/.test(marketingVersion)) throw new Error('Invalid macOS marketing minimum.');
    const [major, minor] = marketingVersion.split('.').map(Number);
    if (major < 10 || (major === 10 && minor < 10)) throw new Error('Unsupported macOS minimum.');
    return `${major === 10 ? minor + 4 : major + 9}.0.0`;
}

async function finalizeMetadata(directory, manifest, refresh = false, minimumSystemVersion) {
    const manifestPath = path.join(directory, manifest);
    const info = yaml.load(await fs.readFile(manifestPath, 'utf8'));
    if (!info.version || !Array.isArray(info.files) || !info.files.length) throw new Error(`Invalid update metadata: ${manifest}`);
    // Preserve the baseline's defaults; only map an explicitly configured source minimum.
    if (manifest === 'latest-mac.yml' && minimumSystemVersion !== undefined) {
        if (refresh) info.minimumSystemVersion = minimumSystemVersion;
        else if (info.minimumSystemVersion !== minimumSystemVersion) throw new Error('Incorrect macOS updater kernel minimum.');
    }
    for (const file of info.files) {
        const target = artifactPath(directory, file.url);
        const actual = await describe(target);
        if (refresh) {
            Object.assign(file, actual);
            if (/\.(exe|dmg|zip)$/i.test(target)) {
                // Adapter to the pinned builder's blockmap format. Do not implement a second chunking algorithm.
                const { buildBlockMap } = requireSource('app-builder-lib/out/targets/blockmap/blockmap');
                await buildBlockMap(target, 'gzip', `${target}.blockmap`);
            }
        } else {
            if (file.sha512 !== actual.sha512 || file.size !== actual.size) throw new Error(`Artifact metadata mismatch: ${file.url}`);
            if (/\.(exe|dmg|zip)$/i.test(target)) await verifyBlockmap(target, actual.size);
        }
    }
    if (info.path) {
        const actual = await describe(artifactPath(directory, info.path));
        if (refresh) info.sha512 = actual.sha512;
        else if (info.sha512 !== actual.sha512) throw new Error(`Legacy checksum mismatch: ${info.path}`);
    }
    if (refresh) await fs.writeFile(manifestPath, yaml.dump(info), 'utf8');
    return info;
}

if (require.main === module) {
    const [directory, manifest, mode] = process.argv.slice(2);
    if (!directory || !manifest || !['verify', 'refresh'].includes(mode)) {
        console.error('Usage: node scripts/desktop/update-metadata.cjs <directory> <manifest> <verify|refresh>');
        process.exitCode = 1;
    } else {
        const minimum = darwinMinimum(requireSource('./package.json').build?.mac?.minimumSystemVersion);
        finalizeMetadata(directory, manifest, mode === 'refresh', minimum).catch(error => { console.error(error.message); process.exitCode = 1; });
    }
}

module.exports = { artifactPath, describe, finalizeMetadata, verifyBlockmap, darwinMinimum };
