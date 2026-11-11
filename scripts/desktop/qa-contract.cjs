const { createHash } = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs/promises');

const SCHEMA_VERSION = 1;
const RETENTION_DAYS = 14;
const PLATFORMS = ['linux', 'windows', 'mac'];
const QA_IDENTITY = Object.freeze({ appId: 'gov.ornl.amo.verifi.qa', name: 'verifi-desktop-qa', productName: 'VERIFI QA', feed: 'http://127.0.0.1:47831/updates/', debugPort: 47832 });

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function sha(value) {
    assert(typeof value === 'string' && /^[a-f0-9]{40}$/.test(value), 'An immutable 40-character commit is required.');
    return value;
}

function positiveInteger(value, name) {
    assert(/^[1-9][0-9]*$/.test(String(value)) && Number.isSafeInteger(Number(value)), `Invalid ${name}.`);
    return Number(value);
}

function qaVersion(runNumber, slot) {
    const sequence = positiveInteger(runNumber, 'run number') * 3 + slot;
    assert([0, 1, 2].includes(slot) && sequence < 60000 * 60000, 'QA version sequence is out of range.');
    return `0.${Math.floor(sequence / 60000)}.${sequence % 60000}`;
}

function versionTuple(version) {
    assert(typeof version === 'string' && /^0\.[0-9]+\.[0-9]+$/.test(version), 'Invalid ordered QA version.');
    return version.split('.').map(Number);
}

function precedes(a, b) {
    const left = versionTuple(a), right = versionTuple(b);
    for (let index = 0; index < left.length; index++) {
        if (left[index] !== right[index]) return left[index] < right[index];
    }
    return false;
}

function validateInputs(input) {
    assert(['build-only', 'build-and-test', 'test-only'].includes(input.mode), 'Invalid operation.');
    assert(['baseline-validation', 'electron-upgrade'].includes(input.scenario), 'Invalid scenario.');
    if (input.mode === 'test-only') {
        positiveInteger(input.artifact_run_id, 'artifact run ID');
        assert(!input.candidate_ref && !input.baseline_ref && !input.baseline_run_id, 'Test-only uses only its original artifact run; source overrides are forbidden.');
    } else {
        assert(typeof input.candidate_ref === 'string' && input.candidate_ref.length > 0, 'A candidate ref is required.');
        assert(Boolean(input.baseline_ref) !== Boolean(input.baseline_run_id), 'Choose exactly one baseline ref or baseline run ID.');
        assert(!input.artifact_run_id, 'Artifact run ID is only valid for test-only.');
        if (input.baseline_run_id) positiveInteger(input.baseline_run_id, 'baseline run ID');
    }
    return input;
}

function validatePlan(plan) {
    assert(plan.schemaVersion === SCHEMA_VERSION && plan.kind === 'desktop-qa-plan', 'Unsupported QA plan.');
    sha(plan.workflowSha);
    sha(plan.candidateSha);
    assert(plan.identity && Object.keys(plan.identity).length === Object.keys(QA_IDENTITY).length && Object.entries(QA_IDENTITY).every(([key, value]) => plan.identity[key] === value), 'Incompatible QA identity or feed.');
    assert(['baseline-validation', 'electron-upgrade'].includes(plan.scenario), 'Invalid plan scenario.');
    positiveInteger(plan.runId, 'run ID');
    const roles = plan.scenario === 'electron-upgrade' ? ['baseline', 'candidate-a', 'candidate-b'] : ['baseline', 'candidate-b'];
    assert(Array.isArray(plan.builds) && plan.builds.length === roles.length, 'Incomplete build relationships.');
    roles.forEach((role, index) => {
        const build = plan.builds[index];
        assert(build.role === role, 'Invalid build role or order.');
        sha(build.sourceSha);
        versionTuple(build.version);
        if (role !== 'baseline') assert(build.sourceSha === plan.candidateSha, 'Candidate build source mismatch.');
        if (index) assert(precedes(plan.builds[index - 1].version, build.version), 'QA versions must increase.');
    });
    return plan;
}

function safeName(name) {
    assert(typeof name === 'string' && name.length > 0 && !/[\\/\x00-\x1f]/.test(name) && name !== '.' && name !== '..', 'Invalid artifact filename.');
    return name;
}

async function describe(file) {
    const hash = createHash('sha256');
    for await (const chunk of require('node:fs').createReadStream(file)) hash.update(chunk);
    return { name: path.basename(file), size: (await fs.stat(file)).size, sha256: hash.digest('hex') };
}

async function verifyFiles(directory, files) {
    assert(Array.isArray(files) && files.length > 0, 'No artifact files recorded.');
    const seen = new Set();
    for (const expected of files) {
        safeName(expected.name);
        assert(!seen.has(expected.name), 'Duplicate artifact filename.');
        seen.add(expected.name);
        const actual = await describe(path.join(directory, expected.name));
        assert(actual.size === expected.size && actual.sha256 === expected.sha256, `Artifact hash/size mismatch: ${expected.name}`);
    }
}

module.exports = { SCHEMA_VERSION, RETENTION_DAYS, PLATFORMS, QA_IDENTITY, assert, sha, positiveInteger, qaVersion, precedes, validateInputs, validatePlan, safeName, describe, verifyFiles };
