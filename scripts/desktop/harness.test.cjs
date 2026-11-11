const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createFixture, FIELDS, assertRelationships } = require('./testing/fixture.cjs');
const { validateRuntime, until } = require('./testing/controller.cjs');
const { createFeed } = require('./testing/feed.cjs');
const { describe, QA_IDENTITY } = require('./qa-contract.cjs');

test('fixture preserves measured zero and all account/facility/meter/predictor/analysis links', () => {
    const backup = createFixture();
    const mappings = { accounts: [backup.account], facilities: backup.facilities, utilityMeterGroups: backup.groups, utilityMeter: backup.meters, utilityMeterData: backup.meterData,
        predictors: backup.predictors, predictorData: backup.predictorDataV2, analysisItems: backup.facilityAnalysisItems, accountAnalysisItems: backup.accountAnalysisItems };
    assert.deepEqual(Object.keys(mappings), Object.keys(FIELDS));
    assertRelationships(mappings);
    assert(mappings.utilityMeterData.some(row => row.totalEnergyUse === 0));
    assert(mappings.predictorData.some(row => row.amount === 0));
    const broken = structuredClone(mappings); broken.predictorData[0].predictorId = 'missing';
    assert.throws(() => assertRelationships(broken), /predictor-reading/);
});

test('runtime verification rejects an unpackaged app, another source/version, and weakened renderer security', () => {
    const item = { manifest: { version: '0.0.32', electronVersion: '39.8.10', sourceSha: 'a'.repeat(40) } };
    const runtime = { schemaVersion: 1, profile: '/qa-profile', version: '0.0.32', electron: '39.8.10', packaged: true,
        provenance: { sourceSha: item.manifest.sourceSha, instrumentationVersion: 2 }, security: { contextIsolation: true, nodeIntegration: false, sandbox: true }, archiveSha256: 'b'.repeat(64), nonce: 'new-launch', pid: 100 };
    assert.equal(validateRuntime(runtime, item, '/qa-profile'), runtime);
    for (const change of [{ packaged: false }, { version: '0.0.31' }, { security: { ...runtime.security, sandbox: false } }, { profile: '/production' }]) assert.throws(() => validateRuntime({ ...runtime, ...change }, item, '/qa-profile'));
});

test('controller waits are bounded and do not rerun failed scenarios', async () => {
    let count = 0;
    assert.equal(await until('expected transition', () => ++count === 2 && 'ready', 1000), 'ready');
    await assert.rejects(until('never becomes ready', () => false, 5), /Timed out waiting/);
});

test('local update feed serves the active metadata, actual payload bytes, and byte ranges without arbitrary file access', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifi-feed-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const packages = [];
    for (const version of ['0.0.30', '0.0.32']) {
        const folder = path.join(directory, version); await fs.mkdir(folder);
        await fs.writeFile(path.join(folder, 'latest-linux.yml'), `version: ${version}\n`);
        await fs.writeFile(path.join(folder, `VERIFI QA-${version}.AppImage`), `payload-${version}`);
        const files = await Promise.all((await fs.readdir(folder)).map(name => describe(path.join(folder, name))));
        packages.push({ directory: folder, manifest: { platform: 'linux', version, files } });
    }
    const feed = await createFeed(packages, { port: 0 }); t.after(() => feed.close());
    const base = `http://127.0.0.1:${feed.port}/updates/`;
    feed.offer('0.0.30'); assert.match(await (await fetch(base + 'latest-linux.yml')).text(), /0\.0\.30/);
    feed.offer('0.0.32'); assert.match(await (await fetch(base + 'latest-linux.yml')).text(), /0\.0\.32/);
    const payload = `VERIFI%20QA-0.0.32.AppImage`;
    const range = await fetch(base + payload, { headers: { Range: 'bytes=0-6' } });
    assert.equal(range.status, 206); assert.equal(await range.text(), 'payload');
    assert.equal((await fetch(base + '%2e%2e%2fpackage.json')).status, 404);
    assert.equal((await fetch(base + payload, { headers: { Range: 'bytes=999-1000' } })).status, 416);
    assert(feed.requests.some(row => row.name.endsWith('.AppImage') && row.bytes === 7));
});
