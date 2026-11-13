const { test } = require('node:test');
const assert = require('node:assert/strict');
const { expectedFiles, validateProductionManifests, validateSnapshot, compareInventory, validateBaseline, validateRecord } = require('./production-audit-contract.cjs');

const SOURCE = 'a'.repeat(40), WORKFLOW = 'b'.repeat(40), VERSION = '0.17.0-beta';
const HASH = 'c'.repeat(64);

function manifests(version = VERSION) {
    const names = expectedFiles(version);
    return ['windows', 'mac', 'linux'].map(platform => ({
        schemaVersion: 1, kind: 'desktop-package', platform, role: 'production', qa: false, qaInstrumentation: null,
        sourceSha: SOURCE, workflowSha: WORKFLOW, version, sourceVersion: version, electronVersion: '39.8.10', configurationSha256: HASH,
        runner: { os: platform, arch: platform === 'mac' ? 'ARM64' : 'X64', image: 'recorded', imageVersion: 'recorded' },
        verification: platform === 'windows' ? { platform, verified: true, signature: true, publisher: 'Production Publisher' } : platform === 'mac' ? { platform, verified: true, signature: true, universal: true, notarization: 'Accepted', stapling: { app: true, dmg: true, zip: true } } : { platform, verified: true, metadata: true },
        files: names.filter(name => platform === 'windows' ? /\.exe(\.blockmap)?$/.test(name) || name === 'latest.yml' : platform === 'mac' ? /\.(zip|dmg)(\.blockmap)?$/.test(name) || name === 'latest-mac.yml' : /\.AppImage$|\.tar\.gz$/.test(name) || name === 'latest-linux.yml').map(name => ({ name, size: 100, sha256: HASH }))
    }));
}

function snapshot(version = VERSION, id = 50, sourceSha = SOURCE) {
    return { id, tag: `v${version}`, sourceSha, version, assets: expectedFiles(version).map((name, index) => ({ id: id * 100 + index, name, size: 100, sha256: HASH })) };
}

function pair() {
    return { target: snapshot(), baseline: { ...snapshot('0.16.4-beta', 40, WORKFLOW), selection: 'public-latest', draft: false, prerelease: false, legacy: true } };
}

test('preserves all five production formats and their updater files while accepting exact beta versions', () => {
    const files = expectedFiles(VERSION);
    assert.equal(files.length, 11);
    assert.equal(files.filter(name => /\.(exe|dmg|zip|AppImage|tar\.gz)$/.test(name)).length, 5);
    assert.equal(files.filter(name => name.endsWith('.blockmap')).length, 3);
    assert(files.includes('latest.yml') && files.includes('latest-mac.yml') && files.includes('latest-linux.yml'));
    assert(expectedFiles('0.17.0-beta+build').includes('VERIFI-Setup-0.17.0-beta+build.exe'));
    for (const version of ['../1.2.3', 'v1.2.3', '1.2', '01.2.3', '', undefined]) assert.throws(() => expectedFiles(version), /version/);
});

test('accepts only complete production manifests bound to the same source, workflow, version and native evidence', () => {
    const values = manifests(), policy = { sourceSha: SOURCE, workflowSha: WORKFLOW, version: VERSION };
    assert.equal(validateProductionManifests(values, policy).length, 11);
    assert.equal(validateProductionManifests(values.map(manifest => ({ manifest })), policy).length, 11);
    const mutations = [
        value => value.pop(),
        value => value[1] = structuredClone(value[0]),
        value => value[0].sourceSha = WORKFLOW,
        value => value[0].workflowSha = SOURCE,
        value => value[0].version = '0.17.0',
        value => value[0].sourceVersion = '0.16.4-beta',
        value => value[0].role = 'candidate-b',
        value => value[0].qa = true,
        value => value[0].qaInstrumentation = {},
        value => value[0].verification.signature = false,
        value => value[0].verification.publisher = ' ',
        value => value[1].verification.universal = false,
        value => value[1].verification.notarization = 'Rejected',
        value => value[1].verification.stapling.zip = false,
        value => value[2].verification.metadata = false,
        value => value[2].verification.platform = 'windows',
        value => value[2].electronVersion = '40.0.0',
        value => value[0].files[0].sha256 = 'corrupt',
        value => value[0].files[0].size = 0,
        value => value[1].files = value[1].files.filter(file => !file.name.endsWith('.dmg.blockmap')),
        value => value[0].files.push({ ...value[0].files[0] }),
        value => value[0].files[0].name = '../installer.exe'
    ];
    for (const mutate of mutations) {
        const changed = structuredClone(values); mutate(changed);
        assert.throws(() => validateProductionManifests(changed, policy));
    }
});

test('exact snapshots reject unknown, missing, duplicate or mismatched files and bind evidence exemptions by asset identity', () => {
    const target = snapshot();
    const release = { id: target.id, tag_name: target.tag, sourceSha: SOURCE, version: VERSION };
    const files = target.assets.map(({ id, ...file }) => file);
    const evidence = { id: 9999, name: 'production-evidence-901-1.json', size: 200, sha256: 'd'.repeat(64) };
    const result = validateSnapshot(release, [...target.assets, evidence], files, { allowEvidence: [evidence] });
    compareInventory(result.assets, target.assets);
    assert.equal(result.assets.length, 11);
    const mutations = [
        values => values.pop(),
        values => values.push({ id: 777, name: 'unknown.pdf', size: 100, sha256: HASH }),
        values => values[0] = { ...values[0], name: 'unknown.pdf' },
        values => values[0].sha256 = '0'.repeat(64),
        values => values[0].size++,
        values => values[1].id = values[0].id,
        values => values[1].name = values[0].name
    ];
    for (const mutate of mutations) {
        const changed = structuredClone(target.assets); mutate(changed);
        assert.throws(() => validateSnapshot(release, changed, files));
    }
    assert.throws(() => validateSnapshot(release, [...target.assets, { ...evidence, id: 10000 }], files, { allowEvidence: [evidence] }), /evidence/);
    assert.throws(() => validateSnapshot(release, [...target.assets, { ...evidence, sha256: HASH }], files, { allowEvidence: [evidence] }), /evidence/);
});

test('inventory comparison rejects replacement IDs even when every byte is identical', () => {
    const target = snapshot();
    compareInventory(target.assets, [...target.assets].reverse());
    const replaced = structuredClone(target.assets); replaced[0].id++;
    assert.throws(() => compareInventory(target.assets, replaced), /Duplicate|inventory/);
    replaced[0].id = 9000;
    assert.throws(() => compareInventory(target.assets, replaced), /inventory/);
});

test('the pinned public latest must be older and complete, and a legacy baseline does not require modern manifests', () => {
    const { target, baseline } = pair();
    assert.equal(validateBaseline(target, baseline), baseline);
    const mutations = [
        value => value.selection = 'fallback',
        value => value.draft = true,
        value => value.prerelease = true,
        value => value.sourceSha = undefined,
        value => value.id = target.id,
        value => { value.version = target.version; value.tag = target.tag; },
        value => { value.version = '0.18.0-beta'; value.tag = 'v0.18.0-beta'; },
        value => value.assets.pop()
    ];
    for (const mutate of mutations) {
        const changed = structuredClone(baseline); mutate(changed);
        assert.throws(() => validateBaseline(target, changed));
    }
});

test('publication consumers require the latest passing authoritative attempt and exact pinned target, baseline and origin', () => {
    const { target, baseline } = pair();
    const origin = { runId: 901, runAttempt: 1, sourceSha: SOURCE, workflowSha: SOURCE };
    const audit = { runId: 1000, runAttempt: 1, toolingSha: WORKFLOW };
    const inspections = manifests().map(manifest => ({ schemaVersion: 1, kind: 'desktop-production-inspection', platform: manifest.platform, status: 'passed', origin: structuredClone(origin), audit: structuredClone(audit), target: structuredClone(target), checks: { metadata: true, packagedConfiguration: true }, distributions: manifest.files.filter(file => /\.(exe|dmg|zip|AppImage|tar\.gz)$/.test(file.name)).map(file => ({ name: file.name })) }));
    const report = { schemaVersion: 1, kind: 'desktop-production-audit', mode: 'record', status: 'passed', publicationEligible: true, generation: 2, attempt: 3, target, baseline, origin, audit, inspections };
    const policy = { target, baseline, latestGeneration: 2, latestAttempt: 3, origin };
    assert.equal(validateRecord(report, policy), report);
    for (const change of [{ mode: 'preview' }, { status: 'failed' }, { status: 'pending' }, { publicationEligible: false }, { generation: 1 }, { attempt: 2 }]) assert.throws(() => validateRecord({ ...report, ...change }, policy));
    assert.throws(() => validateRecord(report, { ...policy, latestAttempt: 4 }), /latest authoritative/);
    assert.throws(() => validateRecord(report, { ...policy, latestGeneration: undefined }), /latest authoritative/);
    const replacedBaseline = structuredClone(baseline); replacedBaseline.assets[0].id = 99999;
    assert.throws(() => validateRecord(report, { ...policy, baseline: replacedBaseline }), /inventory/);
    assert.throws(() => validateRecord(report, { ...policy, origin: { ...origin, runId: 902 } }), /origin/);
    const incomplete = structuredClone(report); incomplete.target.assets.pop();
    assert.throws(() => validateRecord(incomplete, { ...policy, target: incomplete.target }), /assets|distribution/);
    const changes = [
        value => value.inspections.pop(),
        value => value.inspections[1] = structuredClone(value.inspections[0]),
        value => value.inspections[0].status = 'failed',
        value => value.inspections[0].checks.metadata = false,
        value => value.inspections[0].checks.packagedConfiguration = false,
        value => value.inspections[0].distributions.pop(),
        value => value.inspections[0].origin.runId++,
        value => value.inspections[0].audit.runId++,
        value => value.inspections[0].target.assets[0].id = 88888
    ];
    for (const change of changes) {
        const changed = structuredClone(report); change(changed);
        assert.throws(() => validateRecord(changed, policy));
    }
});
