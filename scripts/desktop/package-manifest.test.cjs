const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { prepareManifest } = require('./package-manifest.cjs');
const { verifyFiles } = require('./qa-contract.cjs');

test('publishes only complete verified distribution sets and hashes final bytes', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifi-package-manifest-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    await fs.writeFile(path.join(directory, 'package.json'), JSON.stringify({ version: '0.16.4-beta' }));
    // Reuse the actual pinned Electron metadata without changing installed dependencies.
    await fs.symlink(path.resolve(__dirname, '../../node_modules'), path.join(directory, 'node_modules'), 'junction');
    await fs.mkdir(path.join(directory, 'output'));
    await fs.writeFile(path.join(directory, 'desktop-package-config.json'), '{}');
    const env = { DESKTOP_SOURCE_SHA: 'a'.repeat(40), DESKTOP_WORKFLOW_SHA: 'b'.repeat(40), RUNNER_OS: 'Windows', RUNNER_ARCH: 'X64', ImageOS: 'win25', ImageVersion: 'recorded-image' };
    for (const name of ['VERIFI.exe', 'VERIFI.exe.blockmap', 'latest.yml']) await fs.writeFile(path.join(directory, 'output', name), `final signed ${name}`);
    await fs.writeFile(path.join(directory, 'desktop-verification.json'), JSON.stringify({ platform: 'windows', verified: true, signature: false }));
    await assert.rejects(prepareManifest(directory, 'windows', path.join(directory, 'rejected'), env), /signature\/publisher/);
    await fs.writeFile(path.join(directory, 'desktop-verification.json'), JSON.stringify({ platform: 'windows', verified: true, signature: true, publisher: 'Expected publisher' }));
    const destination = path.join(directory, 'distributions');
    const manifest = await prepareManifest(directory, 'windows', destination, env);
    assert.equal(manifest.sourceVersion, '0.16.4-beta');
    assert.equal(manifest.electronVersion, require('electron/package.json').version);
    assert.equal(manifest.runner.imageVersion, 'recorded-image');
    assert.equal(manifest.files.length, 3);
    await verifyFiles(destination, manifest.files);
    await fs.appendFile(path.join(destination, 'VERIFI.exe'), 'mutated after signing');
    await assert.rejects(verifyFiles(destination, manifest.files), /mismatch/);
    await fs.unlink(path.join(directory, 'output/VERIFI.exe.blockmap'));
    await assert.rejects(prepareManifest(directory, 'windows', path.join(directory, 'incomplete'), env), /Missing required/);
});
