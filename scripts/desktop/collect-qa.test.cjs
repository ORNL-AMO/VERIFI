const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { collect, packageEntry } = require('./collect-qa.cjs');
const { QA_IDENTITY } = require('./qa-contract.cjs');

const sourceSha = 'a'.repeat(40), workflowSha = 'b'.repeat(40);
const builds = [{ role: 'baseline', sourceSha, version: '0.0.30' }, { role: 'candidate-b', sourceSha, version: '0.0.32' }];
const plan = { schemaVersion: 1, kind: 'desktop-qa-plan', identity: QA_IDENTITY, repository: 'ORNL-AMO/VERIFI', workflowSha, candidateSha: sourceSha, runId: 100, scenario: 'baseline-validation', builds };
function manifest(build, platform) { return { schemaVersion: 1, kind: 'desktop-package', qa: true, role: build.role, platform, sourceSha, workflowSha, version: build.version, verification: { verified: true }, qaInstrumentation: { sourceSha, workflowSha, wrapperSha256: 'c'.repeat(64), configSha256: 'd'.repeat(64) } }; }

test('aggregates every baseline/candidate platform with immutable archive IDs and marks packaging-only evidence', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifi-qa-collect-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const artifacts = [];
    for (const build of builds) for (const platform of ['linux', 'windows', 'mac']) {
        const prefix = `desktop-qa-${build.role}-${platform}`;
        const folder = path.join(directory, `${prefix}-manifest`); await fs.mkdir(folder);
        await fs.writeFile(path.join(folder, 'package-manifest.json'), JSON.stringify(manifest(build, platform)));
        artifacts.push({ id: artifacts.length + 1, name: `${prefix}-artifact`, digest: `sha256:${'e'.repeat(64)}` });
    }
    const report = await collect(plan, directory, artifacts);
    assert.equal(report.packages.length, 6); assert.equal(report.stage, 'packaging-only');
    assert.equal(report.packages[0].artifactId, 1);
    await assert.rejects(collect(plan, directory, artifacts.slice(1)), /Missing/);
    await fs.writeFile(path.join(directory, 'desktop-qa-candidate-b-mac-manifest/package-manifest.json'), JSON.stringify({ ...manifest(builds[1], 'mac'), sourceSha: 'f'.repeat(40) }));
    await assert.rejects(collect(plan, directory, artifacts), /provenance/);
});

test('rejects failed verification, wrong QA instrumentation, and expired uploads', () => {
    const build = builds[1], m = manifest(build, 'windows'), artifact = { id: 1, digest: `sha256:${'e'.repeat(64)}` };
    assert.throws(() => packageEntry(plan, build, 'windows', { ...m, qa: false }, artifact), /QA package/);
    assert.throws(() => packageEntry(plan, build, 'windows', { ...m, verification: { verified: false } }, artifact), /verification/);
    assert.throws(() => packageEntry(plan, build, 'windows', { ...m, qaInstrumentation: { ...m.qaInstrumentation, sourceSha: workflowSha } }, artifact), /instrumentation/);
    assert.throws(() => packageEntry(plan, build, 'windows', m, { ...artifact, expired: true }), /expired/);
});

test('reuses the previous candidate packages as baseline without copying or re-signing them', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifi-qa-reuse-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const reused = { ...builds[0], reuseRunId: 90, reuseRole: 'candidate-b' };
    const previous = { packages: ['linux', 'windows', 'mac'].map(platform => ({ role: 'candidate-b', platform, sourceSha, version: reused.version, artifactId: 90 })) };
    const artifacts = [];
    for (const platform of ['linux', 'windows', 'mac']) {
        const prefix = `desktop-qa-candidate-b-${platform}`; await fs.mkdir(path.join(directory, `${prefix}-manifest`));
        await fs.writeFile(path.join(directory, `${prefix}-manifest/package-manifest.json`), JSON.stringify(manifest(builds[1], platform)));
        artifacts.push({ id: artifacts.length + 1, name: `${prefix}-artifact`, digest: `sha256:${'e'.repeat(64)}` });
    }
    const report = await collect({ ...plan, builds: [reused, builds[1]] }, directory, artifacts, previous);
    assert.deepEqual(report.packages.slice(0, 3).map(item => [item.role, item.originalRole, item.artifactId]), Array(3).fill(['baseline', 'candidate-b', 90]));
});
