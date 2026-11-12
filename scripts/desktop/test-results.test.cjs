const { test } = require('node:test');
const assert = require('node:assert/strict');
const { testMatrix } = require('./prepare-qa-tests.cjs');
const { validateResults } = require('./collect-qa-tests.cjs');
const { resolvePlan } = require('./resolve-qa.cjs');
const { QA_INSTRUMENTATION_VERSION } = require('./qa-contract.cjs');
const { qualifyingInvocation, assertUpgradeEvidence, assertDefaultPackageRuns, requiredAtHead, writeCheck, policyCandidates, publishPolicy } = require('./validation-check.cjs');

function fixture(scenario = 'electron-upgrade') {
    const source = 'a'.repeat(40), candidate = 'b'.repeat(40);
    const builds = [{ role: 'baseline', sourceSha: source, version: '0.0.30' }, ...(scenario === 'electron-upgrade' ? [{ role: 'candidate-a', sourceSha: candidate, version: '0.0.31' }] : []), { role: 'candidate-b', sourceSha: candidate, version: '0.0.32' }];
    const plan = { scenario, candidateSha: candidate, builds, workflowRef: 'refs/heads/develop' };
    const packages = builds.flatMap((build, index) => ['windows', 'mac', 'linux'].map((platform, offset) => ({ ...build, platform, artifactId: 10 + index * 3 + offset, artifactRunId: 90,
        manifest: { electronVersion: build.role === 'baseline' ? '39.8.10' : '45.2.3', qaInstrumentation: { instrumentationVersion: QA_INSTRUMENTATION_VERSION, updaterContract: build.role === 'baseline' ? 'legacy' : 'guarded-v1' } } })));
    const testPlan = { testRunId: 100, testToolingSha: 'c'.repeat(40), packageRunId: 90, report: { plan, packages } };
    return testPlan;
}
function validResults(testPlan) {
    return testMatrix(testPlan.report).map((row, index) => {
        const from = testPlan.report.packages.find(item => item.artifactId === row.fromArtifactId), to = testPlan.report.packages.find(item => item.artifactId === row.toArtifactId);
        const runtime = (item, suffix) => ({ packaged: true, version: item.version, electron: item.manifest.electronVersion, provenance: { sourceSha: item.sourceSha }, nonce: suffix, pid: index * 2 + (suffix === 'before' ? 100 : 101), archiveSha256: suffix,
            security: { contextIsolation: true, nodeIntegration: false, sandbox: true, noSandbox: false } });
        return { schemaVersion: 1, kind: 'desktop-installed-test', status: 'passed', platform: row.platform, scenario: row.scenario,
            realUpdate: true, dataPreserved: true, candidateSha: testPlan.report.plan.candidateSha, baselineSha: testPlan.report.plan.builds[0].sourceSha, packageRunId: testPlan.packageRunId,
            from: { sourceSha: from.sourceSha, version: from.version, artifactId: from.artifactId }, to: { sourceSha: to.sourceSha, version: to.version, artifactId: to.artifactId },
            runtimeBefore: runtime(from, 'before'), runtimeAfter: runtime(to, 'after'), phases: [{ name: 'fixture', status: 'passed' }],
            guards: { later: true, cancel: true, save: true, discard: true, backupFailure: true, backupRecovery: true } };
    });
}

test('requires three baseline cases and all twelve platform/upgrade safeguard cases', () => {
    assert.equal(testMatrix(fixture('baseline-validation').report).length, 3);
    const plan = fixture(), results = validResults(plan);
    assert.equal(results.length, 12); assert.equal(validateResults(plan, results).status, 'passed');
    const windows = results.filter(row => row.platform === 'windows');
    assert.equal(validateResults({ ...plan, selection: 'windows' }, windows).status, 'partial');
    for (const mutate of [r => r.pop(), r => r[0].status = 'failed', r => r[0].to.artifactId = 999, r => r[0].candidateSha = 'wrong', r => r[1].guards.cancel = false,
        r => r[0].runtimeAfter.pid = r[0].runtimeBefore.pid, r => r[0].runtimeAfter.security.sandbox = false, r => r[0].runtimeAfter.electron = '39.8.10', r => r[0].runtimeAfter.provenance.sourceSha = 'wrong', r => r[0].phases[0].status = 'running']) {
        const changed = structuredClone(results); mutate(changed); assert.throws(() => validateResults(plan, changed));
    }
});

test('rejects either package when the QA runtime witness is missing or outdated', () => {
    for (const role of ['baseline', 'candidate-a', 'candidate-b']) for (const version of [undefined, QA_INSTRUMENTATION_VERSION - 1]) {
        const plan = fixture();
        plan.report.packages.find(item => item.role === role).manifest.qaInstrumentation.instrumentationVersion = version;
        assert.throws(() => testMatrix(plan.report), /Rebuild compatible/);
    }
});

test('rejects globally disabled or unobserved sandboxing in either installed launch', () => {
    const plan = fixture(), results = validResults(plan);
    assert.equal(validateResults(plan, results).status, 'passed');
    for (const launch of ['runtimeBefore', 'runtimeAfter']) for (const noSandbox of [true, undefined]) {
        const changed = structuredClone(results);
        if (noSandbox === undefined) delete changed[0][launch].security.noSandbox;
        else changed[0][launch].security.noSandbox = noSandbox;
        assert.throws(() => validateResults(plan, changed), /Packaged security invariant failed/);
    }
});

test('permits a pinned internal workflow PR for the pre-merge pilot, while recording its branch', async () => {
    const workflow = 'c'.repeat(40), source = 'a'.repeat(40), candidate = 'b'.repeat(40);
    const api = route => {
        if (route.startsWith('/commits/')) return { sha: route.endsWith(workflow) ? workflow : route.endsWith('candidate') ? candidate : source };
        if (route.startsWith('/pulls?')) return [{ head: { sha: workflow, repo: { full_name: 'ORNL-AMO/VERIFI' } } }, { head: { sha: candidate, repo: { full_name: 'ORNL-AMO/VERIFI' } } }];
        if (route.startsWith('/branches?')) return [{ commit: { sha: source } }];
        throw new Error('Untrusted workflow comparison');
    };
    const context = { repository: 'ORNL-AMO/VERIFI', ref: 'refs/heads/codex/harness', attempt: '1', runNumber: 10, runId: 100, workflowSha: workflow };
    const resolved = await resolvePlan({ mode: 'build-only', scenario: 'baseline-validation', candidate_ref: 'candidate', baseline_ref: 'develop' }, context, api);
    assert.equal(resolved.workflowSha, workflow); assert.equal(resolved.workflowRef, context.ref);
    await assert.rejects(resolvePlan({ mode: 'build-only', scenario: 'baseline-validation', candidate_ref: 'candidate', baseline_ref: 'develop' }, { ...context, workflowSha: 'd'.repeat(40) }, api));
});

test('only a full default-branch invocation may satisfy the exact-commit upgrade gate', () => {
    const plan = fixture(), results = validResults(plan), report = validateResults(plan, results);
    const run = { id: 100, head_sha: plan.testToolingSha, head_branch: 'develop', event: 'workflow_dispatch', path: '.github/workflows/desktop_prerelease.yml', status: 'completed', conclusion: 'success' };
    const invocation = { schemaVersion: 1, kind: 'desktop-qa-invocation', runId: 100, workflowSha: run.head_sha, workflowRef: 'refs/heads/develop', operation: 'test-only', scenario: 'electron-upgrade', testPlatform: 'all', candidateSha: report.candidateSha, packageRunId: 90 };
    assert.equal(qualifyingInvocation(invocation, run, 'develop'), true);
    assert.equal(assertUpgradeEvidence(report, plan.report, invocation, run, 'develop'), report);
    for (const patch of [{ testPlatform: 'windows' }, { operation: 'build-only' }, { workflowRef: 'refs/heads/codex/pilot' }, { workflowSha: 'd'.repeat(40) }, { scenario: 'baseline-validation' }, { runId: 99 }]) {
        assert.equal(qualifyingInvocation({ ...invocation, ...patch }, run, 'develop'), false);
    }
    for (const patch of [{ conclusion: 'cancelled' }, { conclusion: 'failure' }, { status: 'in_progress' }]) assert.throws(() => assertUpgradeEvidence(report, plan.report, invocation, { ...run, ...patch }, 'develop'));
    for (const patch of [{ status: 'partial' }, { selection: 'windows' }, { candidateSha: 'd'.repeat(40) }, { testToolingSha: 'd'.repeat(40) }, { testRunId: 99 }, { packageRunId: 89 }, { results: results.slice(1) }]) assert.throws(() => assertUpgradeEvidence({ ...report, ...patch }, plan.report, invocation, run, 'develop'));
    assert.throws(() => assertUpgradeEvidence(report, plan.report, invocation, run, 'develop', { fromElectronMajor: 38, toElectronMajor: 45 }), /runtime upgrade/);
    assert.throws(() => assertUpgradeEvidence(report, { ...plan.report, plan: { ...plan.report.plan, workflowRef: 'refs/heads/codex/pilot' } }, invocation, run, 'develop'), /default-branch package/);
});

test('policy refresh clears obsolete failures after head, base, or state changes without bypassing an active shared head', async () => {
    const old = 'a'.repeat(40), current = 'b'.repeat(40);
    const pr = { number: 2920, state: 'open', base: { ref: 'develop' }, head: { sha: current } };
    const event = { action: 'synchronize', before: old, pull_request: { number: 2920 } };
    assert.deepEqual(policyCandidates(pr, event, 'develop'), [current, old]);
    assert.deepEqual(policyCandidates({ ...pr, state: 'closed' }, { action: 'closed' }, 'develop'), [current]);
    assert.deepEqual(policyCandidates({ ...pr, base: { ref: 'codex/stack' } }, { action: 'edited' }, 'develop'), [current]);
    const ordinary = { ...pr, number: 3000, head: { sha: old } };
    assert.deepEqual(policyCandidates(ordinary, event, 'develop'), [old]);
    for (const requiredPr of [pr, { ...pr, head: { sha: old }, state: 'closed' }, { ...pr, head: { sha: old }, base: { ref: 'codex/stack' } }]) {
        const writes = [];
        const api = async (route, options) => {
            if (route.startsWith('/pulls/')) return requiredPr;
            if (route.startsWith('/commits/')) return { check_runs: [{ id: 1, name: 'desktop-installer-validation', app: { slug: 'github-actions' }, external_id: 'desktop-validation:200', status: 'completed', conclusion: 'failure' }] };
            writes.push(JSON.parse(options.body)); return {};
        };
        await publishPolicy(api, old, 'develop');
        assert.equal(writes.length, 1); assert.equal(writes[0].conclusion, 'success'); assert.equal(writes[0].output.title, 'Not applicable');
        assert.equal(await requiredAtHead(api, old, 'develop'), undefined);
        writes.length = 0;
        if (requiredPr === pr) { await publishPolicy(api, current, 'develop'); assert.equal(writes.length, 0); }
    }
});

test('the required policy follows a shared candidate commit and applies only to the default base', async () => {
    const candidate = 'b'.repeat(40), pr = { state: 'open', base: { ref: 'develop' }, head: { sha: candidate }, number: 2920 };
    assert.equal(await requiredAtHead(async () => pr, candidate, 'develop'), pr);
    assert.equal(await requiredAtHead(async () => pr, 'd'.repeat(40), 'develop'), undefined);
    assert.equal(await requiredAtHead(async () => ({ ...pr, base: { ref: 'codex/harness' } }), candidate, 'develop'), undefined);
});

test('required evidence also verifies the workflow origin of reused baseline artifacts', async () => {
    const workflow = 'c'.repeat(40), cohort = { packages: [{ artifactRunId: 90, manifest: { workflowSha: workflow } }, { artifactRunId: 80, manifest: { workflowSha: workflow } }] };
    const origin = { status: 'completed', event: 'workflow_dispatch', head_branch: 'develop', head_sha: workflow, path: '.github/workflows/desktop_prerelease.yml' };
    await assertDefaultPackageRuns(async () => origin, cohort, 'develop');
    for (const patch of [{ head_branch: 'codex/pilot' }, { head_sha: 'd'.repeat(40) }, { status: 'in_progress' }, { event: 'pull_request' }]) {
        await assert.rejects(assertDefaultPackageRuns(async route => route.endsWith('/80') ? { ...origin, ...patch } : origin, cohort, 'develop'), /Every package/);
    }
});

test('serialized check publishing cannot regress a newer run or reopen its terminal result', async () => {
    const candidate = 'b'.repeat(40), writes = [];
    let existing = [{ id: 1, name: 'desktop-installer-validation', app: { slug: 'github-actions' }, external_id: 'desktop-validation:200', status: 'completed' }];
    const api = async (route, options) => {
        if (route.startsWith('/commits/')) return { check_runs: existing };
        writes.push({ route, payload: JSON.parse(options.body) }); return {};
    };
    await writeCheck(api, candidate, { status: 'completed', conclusion: 'success' }, 100);
    await writeCheck(api, candidate, { status: 'in_progress' }, 200);
    assert.equal(writes.length, 0);
    await writeCheck(api, candidate, { status: 'in_progress' }, 201);
    assert.equal(writes[0].route, '/check-runs/1');
    assert.equal(writes[0].payload.external_id, 'desktop-validation:201');
    existing = [];
    await writeCheck(api, candidate, { status: 'completed', conclusion: 'failure' }, 202);
    assert.equal(writes[1].route, '/check-runs'); assert.equal(writes[1].payload.head_sha, candidate);
    existing = [{ id: 2, name: 'desktop-installer-validation', app: { slug: 'github-actions' }, external_id: 'desktop-validation:0', status: 'completed', conclusion: 'success' }];
    await writeCheck(api, candidate, { status: 'queued' }, 0);
    assert.equal(writes[2].route, '/check-runs/2'); assert.equal(writes[2].payload.status, 'queued');
});
