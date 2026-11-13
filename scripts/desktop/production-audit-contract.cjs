const semver = require('semver');
const { assert, positiveInteger, safeName, sha } = require('./qa-contract.cjs');

const PLATFORMS = ['windows', 'mac', 'linux'];

function releaseVersion(version) {
    assert(typeof version === 'string' && /^[0-9]/.test(version) && !/\s/.test(version) && semver.valid(version) !== null, 'An exact production SemVer version is required.');
    return version;
}

function platformFiles(version) {
    releaseVersion(version);
    const windows = `VERIFI-Setup-${version}.exe`;
    const dmg = `VERIFI-${version}-universal.dmg`;
    const zip = `VERIFI-${version}-universal-mac.zip`;
    return {
        windows: [windows, `${windows}.blockmap`, 'latest.yml'],
        mac: [dmg, `${dmg}.blockmap`, zip, `${zip}.blockmap`, 'latest-mac.yml'],
        linux: [`VERIFI-${version}.AppImage`, `VERIFI-${version}.tar.gz`, 'latest-linux.yml']
    };
}

function expectedFiles(version) {
    return Object.values(platformFiles(version)).flat();
}

function fileIdentity(file) {
    assert(file && typeof file === 'object', 'Invalid distribution file.');
    safeName(file.name);
    assert(Number.isSafeInteger(file.size) && file.size > 0, `Invalid distribution size: ${file.name}`);
    assert(typeof file.sha256 === 'string' && /^[a-f0-9]{64}$/.test(file.sha256), `Invalid distribution hash: ${file.name}`);
    return { name: file.name, size: file.size, sha256: file.sha256 };
}

function assetIdentity(asset) {
    return { id: positiveInteger(asset?.id, 'release asset ID'), ...fileIdentity(asset) };
}

function sameFile(left, right) {
    return left.name === right.name && left.size === right.size && left.sha256 === right.sha256;
}

function uniqueFiles(files, withIds = false) {
    assert(Array.isArray(files), 'A distribution inventory is required.');
    const names = new Set(), ids = new Set();
    return files.map(value => {
        const file = withIds ? assetIdentity(value) : fileIdentity(value);
        assert(!names.has(file.name), `Duplicate distribution filename: ${file.name}`);
        names.add(file.name);
        if (withIds) {
            assert(!ids.has(file.id), 'Duplicate release asset ID.');
            ids.add(file.id);
        }
        return file;
    });
}

function validateProductionManifests(values, { sourceSha, workflowSha, version }) {
    sha(sourceSha); sha(workflowSha); releaseVersion(version);
    assert(Array.isArray(values) && values.length === PLATFORMS.length, 'Incomplete production platform manifests.');
    const seen = new Set(), files = [], expected = platformFiles(version);
    let electronVersion;
    for (const value of values) {
        const manifest = value?.manifest || value;
        assert(manifest?.schemaVersion === 1 && manifest.kind === 'desktop-package', 'Unsupported production package manifest.');
        const platform = manifest.platform;
        assert(PLATFORMS.includes(platform) && !seen.has(platform), 'Missing or duplicate production platform manifest.');
        seen.add(platform);
        assert(manifest.role === 'production' && manifest.qa === false && manifest.qaInstrumentation === null, 'QA configuration cannot supply production evidence.');
        assert(manifest.sourceSha === sourceSha && manifest.workflowSha === workflowSha, 'Production manifest source/workflow mismatch.');
        assert(manifest.version === version && manifest.sourceVersion === version, 'Production manifest version mismatch.');
        releaseVersion(manifest.electronVersion);
        if (electronVersion === undefined) electronVersion = manifest.electronVersion;
        assert(manifest.electronVersion === electronVersion, 'Production runtime version differs across platforms.');
        assert(/^[a-f0-9]{64}$/.test(manifest.configurationSha256), 'Invalid production configuration hash.');
        assert(manifest.runner && typeof manifest.runner.os === 'string' && manifest.runner.os.length > 0 && typeof manifest.runner.arch === 'string' && manifest.runner.arch.length > 0, 'Missing production runner evidence.');
        const verification = manifest.verification;
        assert(verification?.platform === platform && verification.verified === true, 'Missing native production verification.');
        if (platform === 'windows') assert(verification.signature === true && typeof verification.publisher === 'string' && verification.publisher.trim().length > 0, 'Missing Windows signature/publisher verification.');
        if (platform === 'mac') assert(verification.signature === true && verification.universal === true && verification.notarization === 'Accepted' && ['app', 'dmg', 'zip'].every(target => verification.stapling?.[target] === true), 'Missing Mac signing/notarization/stapling verification.');
        if (platform === 'linux') assert(verification.metadata === true, 'Missing Linux metadata verification.');
        const platformInventory = uniqueFiles(manifest.files);
        assert(JSON.stringify(platformInventory.map(file => file.name).sort()) === JSON.stringify([...expected[platform]].sort()), `Incomplete or unexpected ${platform} distribution inventory.`);
        files.push(...platformInventory);
    }
    return uniqueFiles(files);
}

function compareInventory(before, after) {
    const normalize = values => uniqueFiles(values, true).sort((left, right) => left.id - right.id);
    assert(JSON.stringify(normalize(before)) === JSON.stringify(normalize(after)), 'Release asset inventory changed or mismatched.');
    return true;
}

function validateSnapshot(release, assets, expected, { allowEvidence = [] } = {}) {
    const id = positiveInteger(release?.id, 'release ID');
    assert(typeof release.tag_name === 'string' && release.tag_name.startsWith('v'), 'Invalid release tag.');
    assert(Array.isArray(expected) && expected.length > 0, 'Expected distributions are required.');
    const expectedNames = expected.map(file => safeName(typeof file === 'string' ? file : file.name));
    assert(new Set(expectedNames).size === expectedNames.length, 'Duplicate expected distribution filename.');
    assert(expected.every(file => typeof file === typeof expected[0]), 'Invalid mixed expected inventory.');
    const described = typeof expected[0] === 'string' ? undefined : uniqueFiles(expected);
    const evidence = uniqueFiles(allowEvidence, true);
    assert(evidence.every(file => !expectedNames.includes(file.name)), 'Evidence cannot replace a distribution.');
    const actual = uniqueFiles(assets, true);
    assert(actual.length === expectedNames.length + evidence.length, 'Missing or unknown release assets.');
    const distributions = [];
    for (const file of actual) {
        if (expectedNames.includes(file.name)) {
            const trusted = described?.find(value => value.name === file.name);
            assert(!trusted || sameFile(file, trusted), `Distribution hash/size mismatch: ${file.name}`);
            distributions.push(file);
        } else {
            const trusted = evidence.find(value => value.id === file.id);
            assert(trusted && sameFile(file, trusted), 'Unknown or replaced evidence asset.');
        }
    }
    assert(distributions.length === expectedNames.length && expectedNames.every(name => distributions.some(file => file.name === name)), 'Missing expected release distribution.');
    assert(evidence.every(file => actual.some(value => value.id === file.id && sameFile(value, file))), 'Missing trusted evidence attachment.');
    return { id, tag: release.tag_name, sourceSha: release.sourceSha, version: release.version, assets: distributions };
}

function validateBaseline(target, baseline) {
    positiveInteger(target?.id, 'target release ID'); positiveInteger(baseline?.id, 'baseline release ID');
    sha(target.sourceSha); sha(baseline.sourceSha);
    releaseVersion(target.version); releaseVersion(baseline.version);
    assert(target.tag === `v${target.version}` && baseline.tag === `v${baseline.version}`, 'Target/baseline tag version mismatch.');
    assert(baseline.selection === 'public-latest' && baseline.draft === false && baseline.prerelease === false, 'Baseline must be the selected public production latest.');
    assert(target.id !== baseline.id && semver.lt(baseline.version, target.version), 'Production latest is not a suitable older baseline.');
    validateSnapshot({ id: baseline.id, tag_name: baseline.tag }, baseline.assets, expectedFiles(baseline.version));
    return baseline;
}

function validateRecord(report, { target, baseline, latestGeneration, latestAttempt, origin } = {}) {
    assert(report?.schemaVersion === 1 && report.kind === 'desktop-production-audit', 'Unsupported production audit record.');
    assert(['record', 'refresh-baseline'].includes(report.mode) && report.status === 'passed' && report.publicationEligible === true, 'A preview, pending or failed audit cannot authorize publication.');
    positiveInteger(report.generation, 'audit generation'); positiveInteger(report.attempt, 'audit attempt');
    assert(latestGeneration !== undefined && latestAttempt !== undefined && report.generation === latestGeneration && report.attempt === latestAttempt, 'The latest authoritative audit attempt must pass.');
    assert(target && baseline, 'Pinned target and baseline are required.');
    for (const [name, expected] of [['target', target], ['baseline', baseline]]) {
        const actual = report[name];
        assert(actual?.id === expected.id && actual.tag === expected.tag && actual.sourceSha === expected.sourceSha && actual.version === expected.version, `Audit ${name} identity mismatch.`);
        compareInventory(actual.assets, expected.assets);
    }
    validateSnapshot({ id: report.target.id, tag_name: report.target.tag }, report.target.assets, expectedFiles(report.target.version));
    validateBaseline(report.target, report.baseline);
    assert(report.origin && positiveInteger(report.origin.runId, 'origin run ID') && positiveInteger(report.origin.runAttempt, 'origin run attempt'), 'Missing audit origin.');
    assert(report.origin.sourceSha === report.target.sourceSha, 'Audit origin source mismatch.');
    sha(report.origin.workflowSha);
    if (origin) assert(['runId', 'runAttempt', 'sourceSha', 'workflowSha'].every(key => report.origin[key] === origin[key]), 'Audit origin invocation mismatch.');
    positiveInteger(report.audit?.runId, 'audit run ID'); positiveInteger(report.audit?.runAttempt, 'audit run attempt');
    sha(report.audit.toolingSha);
    assert(Array.isArray(report.inspections) && report.inspections.length === PLATFORMS.length, 'A complete platform inspection set is required.');
    const seen = new Set(), expectedDistributions = platformFiles(report.target.version);
    for (const inspection of report.inspections) {
        assert(inspection?.schemaVersion === 1 && inspection.kind === 'desktop-production-inspection' && PLATFORMS.includes(inspection.platform) && !seen.has(inspection.platform), 'Missing or duplicate platform inspection.');
        seen.add(inspection.platform);
        assert(inspection.status === 'passed' && inspection.checks?.metadata === true && inspection.checks?.packagedConfiguration === true, 'Every platform inspection must pass.');
        assert(['runId', 'runAttempt', 'sourceSha', 'workflowSha'].every(key => inspection.origin?.[key] === report.origin[key]), 'Inspection origin mismatch.');
        assert(['runId', 'runAttempt', 'toolingSha'].every(key => inspection.audit?.[key] === report.audit[key]), 'Inspection audit invocation mismatch.');
        assert(['id', 'tag', 'sourceSha', 'version'].every(key => inspection.target?.[key] === report.target[key]), 'Inspection target mismatch.');
        compareInventory(inspection.target.assets, report.target.assets);
        const payloads = expectedDistributions[inspection.platform].filter(name => /\.(exe|dmg|zip|AppImage|tar\.gz)$/.test(name));
        assert(Array.isArray(inspection.distributions) && JSON.stringify(inspection.distributions.map(file => file.name).sort()) === JSON.stringify(payloads.sort()), 'Incomplete distribution inspection.');
    }
    return report;
}

module.exports = { expectedFiles, validateProductionManifests, validateSnapshot, compareInventory, validateBaseline, validateRecord };
