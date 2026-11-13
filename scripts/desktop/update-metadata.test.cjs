const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { gunzipSync } = require('node:zlib');
const { createHash } = require('node:crypto');
const yaml = require('js-yaml');
const { artifactPath, describe, finalizeMetadata, verifyEmbeddedBlockmap, darwinMinimum } = require('./update-metadata.cjs');
const { publisherFromCertificate } = require('./package-windows.cjs');

test('rejects metadata pointing outside the artifact directory', () => {
    for (const value of ['../test.exe', '/tmp/test.exe', 'folder\\test.exe', '%2e%2e%2ftest.exe']) {
        assert.throws(() => artifactPath('/tmp', value));
    }
    assert.throws(() => publisherFromCertificate(undefined), /certificate is required/);
    assert.throws(() => publisherFromCertificate(Buffer.from('not a certificate').toString('base64')));
});

test('extracts the publisher from a public certificate without needing its private key', () => {
    const certificate = require('node:tls').rootCertificates[0];
    const expected = new (require('node:crypto').X509Certificate)(certificate).toLegacyObject().subject.CN;
    assert.equal(publisherFromCertificate(Buffer.from(certificate).toString('base64')), expected);
});

test('refreshes signed artifact sizes, all checksums, and readable v2 blockmaps', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifi-metadata-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const target = path.join(directory, 'VERIFI.exe');
    await fs.writeFile(target, Buffer.alloc(32769, 5));
    const original = await describe(target);
    await fs.writeFile(path.join(directory, 'latest.yml'), yaml.dump({
        version: '1.1.0', files: [{ url: 'VERIFI.exe', ...original }], path: 'VERIFI.exe', sha512: original.sha512
    }));
    await fs.appendFile(target, 'signature');
    await assert.rejects(finalizeMetadata(directory, 'latest.yml'), /mismatch/);
    await finalizeMetadata(directory, 'latest.yml', true);
    const info = await finalizeMetadata(directory, 'latest.yml');
    assert.equal(info.files[0].size, 32778);
    assert.notEqual(info.sha512, original.sha512);
    const map = JSON.parse(gunzipSync(await fs.readFile(`${target}.blockmap`)));
    assert.equal(map.version, '2');
    assert.equal(map.files[0].sizes.reduce((sum, size) => sum + size, 0), info.files[0].size);
    const bytes = await fs.readFile(target);
    const { blake2b } = require('@noble/hashes/blake2.js');
    let offset = 0;
    map.files[0].sizes.forEach((size, index) => {
        assert.equal(Buffer.from(blake2b(bytes.subarray(offset, offset + size), { dkLen: 18 })).toString('base64'), map.files[0].checksums[index]);
        offset += size;
    });
    assert.equal(createHash('sha512').update(bytes).digest('base64'), info.sha512);
    const corrupt = JSON.parse(JSON.stringify(map));
    corrupt.files[0].checksums[0] = 'incorrect';
    await fs.writeFile(`${target}.blockmap`, require('node:zlib').gzipSync(JSON.stringify(corrupt)));
    await assert.rejects(finalizeMetadata(directory, 'latest.yml'), /Blockmap checksum mismatch/);
    await fs.unlink(target);
    await assert.rejects(finalizeMetadata(directory, 'latest.yml'), /ENOENT/);
});

test('preserves baseline defaults and applies the selected source Mac minimum', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifi-mac-metadata-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const target = path.join(directory, 'VERIFI.zip');
    await fs.writeFile(target, 'Mac artifact fixture');
    const actual = await describe(target);
    await fs.writeFile(path.join(directory, 'latest-mac.yml'), yaml.dump({
        version: '1.1.0', files: [{ url: 'VERIFI.zip', ...actual }], path: 'VERIFI.zip', sha512: actual.sha512
    }));
    await finalizeMetadata(directory, 'latest-mac.yml', true);
    assert.equal((await finalizeMetadata(directory, 'latest-mac.yml')).minimumSystemVersion, undefined);
    await finalizeMetadata(directory, 'latest-mac.yml', true, darwinMinimum('12.0'));
    assert.equal((await finalizeMetadata(directory, 'latest-mac.yml', false, '21.0.0')).minimumSystemVersion, '21.0.0');
    await assert.rejects(finalizeMetadata(directory, 'latest-mac.yml', false, '22.0.0'), /kernel minimum/);
    await finalizeMetadata(directory, 'latest-mac.yml', true, darwinMinimum('13.0'));
    assert.equal((await finalizeMetadata(directory, 'latest-mac.yml', false, '22.0.0')).minimumSystemVersion, '22.0.0');
    assert.equal(darwinMinimum('10.13'), '17.0.0');
    assert.throws(() => darwinMinimum('macOS 13'));
});

async function embeddedFixture(directory, mutate = value => value) {
    const version = '0.17.0-beta', name = `VERIFI-${version}.AppImage`, file = path.join(directory, name);
    const payload = Buffer.alloc(32769, 7), sizes = [12345, payload.length - 12345];
    const { blake2b } = require('@noble/hashes/blake2.js');
    let offset = 0;
    const checksums = sizes.map(size => {
        const result = Buffer.from(blake2b(payload.subarray(offset, offset + size), { dkLen: 18 })).toString('base64');
        offset += size; return result;
    });
    const map = mutate({ version: '2', files: [{ name: 'file', offset: 0, sizes, checksums }] });
    const compressed = require('node:zlib').deflateRawSync(JSON.stringify(map)), trailer = Buffer.alloc(4);
    trailer.writeUInt32BE(compressed.length);
    await fs.writeFile(file, Buffer.concat([payload, compressed, trailer]));
    const actual = await describe(file);
    const info = { version, files: [{ url: name, ...actual, blockMapSize: compressed.length }], path: name, sha512: actual.sha512 };
    await fs.writeFile(path.join(directory, 'latest-linux.yml'), yaml.dump(info));
    return { file, version, info, payload, map, compressed };
}

test('verifies AppImage embedded map chunks/trailer and preserves the final bytes and metadata', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifi-embedded-map-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const value = await embeddedFixture(directory);
    const before = await fs.readFile(value.file), metadata = await fs.readFile(path.join(directory, 'latest-linux.yml'));
    await verifyEmbeddedBlockmap(value.file, value.compressed.length);
    await finalizeMetadata(directory, 'latest-linux.yml', false, undefined, { expectedVersion: value.version });
    assert.deepEqual(await fs.readFile(value.file), before);
    assert.deepEqual(await fs.readFile(path.join(directory, 'latest-linux.yml')), metadata);
    await assert.rejects(verifyEmbeddedBlockmap(value.file, value.compressed.length + 1), /trailer\/metadata mismatch/);
    await assert.rejects(verifyEmbeddedBlockmap(value.file, undefined), /Invalid embedded/);
    const mutated = Buffer.from(before); mutated[0] ^= 1; await fs.writeFile(value.file, mutated);
    await assert.rejects(verifyEmbeddedBlockmap(value.file, value.compressed.length), /checksum mismatch/);
});

test('rejects corrupt embedded checksums, chunk coverage and trailer even when full-file metadata was refreshed', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifi-corrupt-embedded-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    for (const mutate of [map => { map.files[0].checksums[0] = 'incorrect'; return map; }, map => { map.files[0].sizes[0]++; return map; }, map => { map.files[0].offset = 10; return map; }]) {
        const value = await embeddedFixture(directory, mutate);
        await assert.rejects(finalizeMetadata(directory, 'latest-linux.yml', false, undefined, { expectedVersion: value.version }), /blockmap|Blockmap/);
    }
    const value = await embeddedFixture(directory), bytes = await fs.readFile(value.file);
    bytes.writeUInt32BE(value.compressed.length + 1, bytes.length - 4); await fs.writeFile(value.file, bytes);
    await assert.rejects(verifyEmbeddedBlockmap(value.file, value.compressed.length), /trailer\/metadata mismatch/);
});

test('production metadata requires the exact version, references and legacy primary path', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifi-metadata-contract-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const value = await embeddedFixture(directory);
    for (const mutate of [info => info.version = '0.18.0-beta', info => info.files.push({ ...info.files[0] }), info => info.files[0].url = 'untracked.AppImage', info => delete info.path, info => info.path = 'another.AppImage', info => delete info.files[0].blockMapSize]) {
        const changed = structuredClone(value.info); mutate(changed);
        await fs.writeFile(path.join(directory, 'latest-linux.yml'), yaml.dump(changed));
        await assert.rejects(finalizeMetadata(directory, 'latest-linux.yml', false, undefined, { expectedVersion: value.version }));
    }
    for (const [manifest, refs] of [['latest.yml', [`VERIFI-Setup-${value.version}.exe`]], ['latest-mac.yml', [`VERIFI-${value.version}-universal-mac.zip`, `VERIFI-${value.version}-universal.dmg`]]]) {
        await fs.writeFile(path.join(directory, manifest), yaml.dump({ version: value.version, files: [], path: refs[0], sha512: 'placeholder' }));
        await assert.rejects(finalizeMetadata(directory, manifest, false, undefined, { expectedVersion: value.version }), /Invalid update metadata/);
    }
});
