const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { QA_IDENTITY, qaVersion, precedes, validateInputs, validatePlan, describe, verifyFiles } = require('./qa-contract.cjs');
const { trustedCommit, assertSigningApproval, resolvePlan } = require('./resolve-qa.cjs');
const { validateRunReport } = require('./retained-qa.cjs');

const sourceSha = 'a'.repeat(40), candidateSha = 'b'.repeat(40), workflowSha = 'c'.repeat(40);
const context = { repository: 'ORNL-AMO/VERIFI', ref: 'refs/heads/develop', attempt: '1', runNumber: 10, runId: 100, workflowSha };
const input = { mode: 'build-only', scenario: 'baseline-validation', candidate_ref: 'candidate', baseline_ref: 'develop', baseline_run_id: '', artifact_run_id: '' };
function apiForTrust(route) {
    if (route.startsWith('/commits/')) return { sha: route.endsWith('candidate') ? candidateSha : sourceSha };
    if (route.startsWith('/pulls?')) return [{ head: { sha: candidateSha, repo: { full_name: context.repository } } }];
    if (route.startsWith('/branches?')) return [{ commit: { sha: sourceSha } }];
    throw new Error(`Unexpected route ${route}`);
}
function plan() { return { schemaVersion: 1, kind: 'desktop-qa-plan', repository: context.repository, identity: QA_IDENTITY, workflowSha, candidateSha, runId: 100, scenario: 'baseline-validation', builds: [{ role: 'baseline', sourceSha, version: '0.0.30' }, { role: 'candidate-b', sourceSha: candidateSha, version: '0.0.32' }] }; }

test('requires unambiguous build inputs and rejects source overrides during artifact reruns', () => {
    assert.equal(validateInputs(input), input);
    for (const changes of [{ baseline_ref: '' }, { baseline_run_id: '1' }, { artifact_run_id: '1' }, { candidate_ref: '' }, { scenario: 'anything' }]) assert.throws(() => validateInputs({ ...input, ...changes }));
    assert.doesNotThrow(() => validateInputs({ mode: 'test-only', scenario: 'baseline-validation', artifact_run_id: '100' }));
    assert.throws(() => validateInputs({ mode: 'test-only', scenario: 'baseline-validation', artifact_run_id: '100', candidate_ref: candidateSha }));
});

test('generates ordered, Windows-compatible QA versions across the component boundary', () => {
    assert(precedes(qaVersion(10, 0), qaVersion(10, 1)));
    assert(precedes(qaVersion(10, 1), qaVersion(10, 2)));
    assert(precedes(qaVersion(19999, 2), qaVersion(20000, 0)));
    for (const invalid of ['0', '-1', '1;echo nope', '1.5']) assert.throws(() => qaVersion(invalid, 0));
    assert.throws(() => qaVersion(10, 3));
});

test('pins same-repository PR heads and protected branch commits', async () => {
    assert.equal(await trustedCommit(apiForTrust, 'candidate', context.repository), candidateSha);
    assert.equal(await trustedCommit(apiForTrust, 'develop', context.repository), sourceSha);
    const ancestorApi = route => route.startsWith('/compare/') ? { status: 'ahead' } : route.startsWith('/pulls?') ? [] : route.startsWith('/branches?') ? [{ commit: { sha: workflowSha } }] : { sha: sourceSha };
    assert.equal(await trustedCommit(ancestorApi, sourceSha, context.repository), sourceSha);
});

test('rejects fork PRs and unrelated unprotected commits', async () => {
    const api = route => route.startsWith('/commits/') ? { sha: candidateSha } : route.startsWith('/pulls?') ? [{ head: { sha: candidateSha, repo: { full_name: 'fork/VERIFI' } } }] : [];
    await assert.rejects(trustedCommit(api, 'untrusted', context.repository), /protected branch/);
});

test('requires an actual signing reviewer and allows maintainer self-approval', async () => {
    await assert.rejects(assertSigningApproval(() => ({ protection_rules: [] })), /required maintainer/);
    await assert.rejects(assertSigningApproval(() => ({ protection_rules: [{ type: 'required_reviewers', reviewers: ['maintainer'], prevent_self_review: true }] })), /self-approval/);
    await assert.doesNotReject(assertSigningApproval(() => ({ protection_rules: [{ type: 'required_reviewers', reviewers: ['maintainer'], prevent_self_review: false }] })));
});

test('resolves distinct source/version relationships for the two upgrade paths', async () => {
    const result = await resolvePlan({ ...input, scenario: 'electron-upgrade' }, context, apiForTrust);
    assert.deepEqual(result.builds.map(value => [value.role, value.sourceSha, value.version]), [['baseline', sourceSha, '0.0.30'], ['candidate-a', candidateSha, '0.0.31'], ['candidate-b', candidateSha, '0.0.32']]);
    await assert.rejects(resolvePlan(input, { ...context, ref: 'refs/heads/master' }, apiForTrust), /develop/);
    await assert.rejects(resolvePlan(input, { ...context, attempt: '2' }, apiForTrust), /rebuild/);
    await assert.rejects(resolvePlan(input, context, apiForTrust, { sourceSha, version: '0.0.99', reuseRunId: 3 }), /increase/);
});

test('rejects mismatched candidate sources, incomplete roles, mutable commits, and identity drift', () => {
    assert.doesNotThrow(() => validatePlan(plan()));
    assert.doesNotThrow(() => validatePlan({ ...plan(), identity: Object.fromEntries(Object.entries(QA_IDENTITY).reverse()) }));
    for (const mutate of [p => p.builds.pop(), p => p.builds[1].sourceSha = sourceSha, p => p.workflowSha = 'develop', p => p.identity = { ...QA_IDENTITY, feed: 'https://example.com' }, p => p.builds[1].version = p.builds[0].version]) {
        const broken = structuredClone(plan()); mutate(broken); assert.throws(() => validatePlan(broken));
    }
});

test('verifies actual retained file bytes and rejects traversal and duplicate names', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifi-qa-files-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const file = path.join(directory, 'VERIFI.AppImage'); await fs.writeFile(file, 'package bytes');
    const description = await describe(file); await verifyFiles(directory, [description]);
    await assert.rejects(verifyFiles(directory, [description, description]), /Duplicate/);
    await assert.rejects(verifyFiles(directory, [{ ...description, name: '../VERIFI.AppImage' }]), /filename/);
    await fs.appendFile(file, 'changed'); await assert.rejects(verifyFiles(directory, [description]), /mismatch/);
});

test('retained reports require the trusted successful run, every platform, and live immutable artifact IDs', () => {
    const p = plan();
    const run = { id: 100, head_sha: workflowSha, status: 'completed', conclusion: 'success', event: 'workflow_dispatch', head_branch: 'develop', path: '.github/workflows/desktop_prerelease.yml' };
    const packages = p.builds.flatMap((build, index) => ['linux', 'windows', 'mac'].map((platform, offset) => ({ role: build.role, platform, sourceSha: build.sourceSha, version: build.version, verified: true, artifactId: 10 + index * 3 + offset, artifactName: `${build.role}-${platform}`, artifactDigest: `sha256:${'d'.repeat(64)}`, artifactRunId: 100 })));
    const artifacts = packages.map(item => ({ id: item.artifactId, name: item.artifactName, digest: item.artifactDigest, expires_at: '2100-01-01T00:00:00Z', workflow_run: { id: 100 } }));
    const report = { schemaVersion: 1, kind: 'desktop-qa-packages', status: 'passed', runId: 100, plan: p, packages };
    assert.equal(validateRunReport(report, run, artifacts, context.repository), report);
    assert.throws(() => validateRunReport(report, { ...run, conclusion: 'failure' }, artifacts, context.repository));
    assert.doesNotThrow(() => validateRunReport(report, { ...run, conclusion: 'failure' }, artifacts, context.repository, Date.now(), true));
    assert.throws(() => validateRunReport({ ...report, status: 'failed' }, { ...run, conclusion: 'failure' }, artifacts, context.repository, Date.now(), true));
    assert.throws(() => validateRunReport(report, { ...run, head_sha: candidateSha }, artifacts, context.repository));
    assert.throws(() => validateRunReport({ ...report, packages: packages.slice(1) }, run, artifacts, context.repository));
    assert.throws(() => validateRunReport(report, run, artifacts.map((a, i) => i ? a : { ...a, expired: true }), context.repository), /expired/);
    assert.throws(() => validateRunReport(report, run, artifacts.map((a, i) => i ? a : { ...a, digest: 'different' }), context.repository), /mismatched/);
});
