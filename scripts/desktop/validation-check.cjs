const fs = require('node:fs/promises');
const { githubApi, paginate } = require('./github-api.cjs');
const { assert, sha, positiveInteger } = require('./qa-contract.cjs');
const { loadRetainedRun, readReport } = require('./retained-qa.cjs');
const { validateResults } = require('./collect-qa-tests.cjs');
const policy = require('./validation-policy.json');

function qualifyingInvocation(invocation, run, defaultBranch) {
    return invocation?.schemaVersion === 1 && invocation.kind === 'desktop-qa-invocation' && invocation.runId === run.id && invocation.workflowSha === run.head_sha &&
        invocation.workflowRef === `refs/heads/${defaultBranch}` && run.head_branch === defaultBranch && run.event === 'workflow_dispatch' &&
        run.path === '.github/workflows/desktop_prerelease.yml' && ['build-and-test', 'test-only'].includes(invocation.operation) && invocation.scenario === 'electron-upgrade' && invocation.testPlatform === 'all';
}

function checkRunId(check) {
    const match = /^desktop-validation:([0-9]+)$/.exec(check?.external_id || '');
    return match ? Number(match[1]) : 0;
}
function newerCheckExists(check, runId) { return checkRunId(check) > runId; }

function assertUpgradeEvidence(report, cohort, invocation, run, selectedPolicy = policy) {
    assert(run.status === 'completed' && run.conclusion === 'success', 'The required workflow did not complete successfully.');
    assert(report.kind === 'desktop-installed-report' && report.schemaVersion === 1 && report.status === 'passed' && report.selection === 'all', 'Complete installed-app acceptance is required.');
    assert(report.testRunId === run.id && report.testToolingSha === run.head_sha && report.candidateSha === invocation.candidateSha && report.packageRunId === invocation.packageRunId, 'Installed-report provenance mismatch.');
    assert(cohort.plan.candidateSha === report.candidateSha && cohort.plan.scenario === 'electron-upgrade', 'The signed package cohort does not match the required candidate.');
    const verified = validateResults({ ...report, selection: 'all', report: cohort }, report.results);
    assert(verified.status === 'passed', 'Every required platform and safeguard must pass.');
    const major = value => { const match = /^(\d+)\.\d+\.\d+(?:[-+].*)?$/.exec(value); assert(match, 'Invalid reported Electron version.'); return Number(match[1]); };
    for (const result of report.results) {
        const expectedFrom = result.scenario === 'baseline-update' ? selectedPolicy.fromElectronMajor : selectedPolicy.toElectronMajor;
        assert(major(result.runtimeBefore.electron) === expectedFrom && major(result.runtimeAfter.electron) === selectedPolicy.toElectronMajor, 'The required Electron runtime upgrade path was not exercised.');
    }
    return report;
}

async function requiredAtHead(api, candidateSha, defaultBranch) {
    for (const number of policy.requiredPullRequests) {
        const pr = await api(`/pulls/${number}`);
        if (pr.state === 'open' && pr.base.ref === defaultBranch && pr.head.sha === candidateSha) return pr;
    }
    return undefined;
}

async function checks(api, candidateSha) {
    const values = await paginate(api, `/commits/${sha(candidateSha)}/check-runs?check_name=${encodeURIComponent(policy.checkName)}`, 'check_runs');
    return values.filter(value => value.name === policy.checkName && value.app?.slug === 'github-actions').sort((a, b) => checkRunId(b) - checkRunId(a) || b.id - a.id);
}

async function writeCheck(api, candidateSha, update, runId) {
    // Every caller uses the same candidate-scoped reusable-workflow concurrency
    // group. IDs add ordering protection because GitHub queues are not FIFO.
    const existing = await checks(api, candidateSha);
    if (existing.some(check => newerCheckExists(check, runId))) return;
    if (runId > 0 && update.status !== 'completed' && existing.some(check => checkRunId(check) === runId && check.status === 'completed')) return;
    const payload = { name: policy.checkName, head_sha: sha(candidateSha), external_id: `desktop-validation:${runId}`, ...update };
    const options = { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    if (!existing.length) await api('/check-runs', { ...options, method: 'POST' });
    else for (const check of existing) {
        // Synchronize any duplicate contexts left by an interrupted older publisher.
        const { head_sha, ...patch } = payload;
        await api(`/check-runs/${check.id}`, { ...options, method: 'PATCH', body: JSON.stringify(patch) });
    }
}

async function invocationForRun(api, runId) {
    const artifacts = await paginate(api, `/actions/runs/${runId}/artifacts`, 'artifacts');
    const matches = artifacts.filter(item => item.name === 'desktop-qa-plan');
    assert(matches.length === 1, 'Missing immutable invocation record.');
    return { invocation: await readReport(api, matches[0], 'qa-invocation.json'), artifacts };
}

async function main() {
    const api = githubApi(), phase = process.env.VALIDATION_PHASE;
    const event = JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const defaultBranch = event.repository.default_branch;
    if (phase === 'identify') {
        const number = event.pull_request?.number || policy.requiredPullRequests[0];
        const pr = await api(`/pulls/${positiveInteger(number, 'PR number')}`);
        const enabled = pr.state === 'open' && pr.base.ref === defaultBranch;
        await fs.appendFile(process.env.GITHUB_OUTPUT, `enabled=${enabled}\ncandidate-sha=${sha(pr.head.sha)}\npr-number=${pr.number}\n`);
        return;
    }
    const candidateSha = sha(process.env.VALIDATION_CANDIDATE_SHA);
    if (phase === 'pull-request') {
        const pr = await api(`/pulls/${positiveInteger(process.env.VALIDATION_PR_NUMBER, 'PR number')}`);
        if (pr.head.sha !== candidateSha || pr.base.ref !== defaultBranch || pr.state !== 'open') return;
        const required = await requiredAtHead(api, candidateSha, defaultBranch);
        const existing = await checks(api, candidateSha);
        if (required) {
            // A different PR may already have received N/A for this commit.
            // Once the required PR adopts it, replace that provisional success.
            if (!existing.some(check => checkRunId(check) > 0)) await writeCheck(api, candidateSha, { status: 'queued', output: { title: 'Installer evidence required', summary: `PR #${required.number} requires a full Electron-upgrade run for ${candidateSha}.` } }, 0);
        } else if (!existing.some(check => checkRunId(check) > 0)) {
            await writeCheck(api, candidateSha, { status: 'completed', conclusion: 'success', output: { title: 'Not applicable', summary: 'This commit is not subject to the required upgrade installer gate.' } }, 0);
        }
        return;
    }
    const runId = positiveInteger(process.env.VALIDATION_RUN_ID, 'validation run ID');
    const run = await api(`/actions/runs/${runId}`);
    let invocation, artifacts;
    try {
        if (phase === 'start') invocation = JSON.parse(await fs.readFile('qa-invocation.json', 'utf8'));
        else ({ invocation, artifacts } = await invocationForRun(api, runId));
    } catch (error) {
        const existing = await checks(api, candidateSha);
        if (existing.some(check => checkRunId(check) === runId)) await writeCheck(api, candidateSha, { status: 'completed', conclusion: 'failure', details_url: run.html_url, output: { title: 'Installer evidence unavailable', summary: error.message } }, runId);
        return;
    }
    if (!qualifyingInvocation(invocation, run, defaultBranch) || invocation.candidateSha !== candidateSha || !await requiredAtHead(api, candidateSha, defaultBranch)) return;
    if (phase === 'start') {
        assert(run.id === Number(process.env.GITHUB_RUN_ID) && run.head_sha === process.env.GITHUB_SHA, 'Only this trusted dispatch may register its validation check.');
        await writeCheck(api, candidateSha, { status: 'in_progress', details_url: run.html_url, output: { title: 'Validating signed installers and updates', summary: `Run ${runId} is testing the exact candidate ${candidateSha}.` } }, runId);
    } else if (phase === 'completed') {
        let conclusion = 'failure', summary;
        try {
            const matches = artifacts.filter(item => item.name === 'desktop-installed-report');
            assert(matches.length === 1, 'A complete installed-app report was not retained.');
            const report = await readReport(api, matches[0], 'qa-installed-report.json');
            const cohort = await loadRetainedRun(api, invocation.packageRunId, process.env.GITHUB_REPOSITORY, true);
            assertUpgradeEvidence(report, cohort, invocation, run);
            conclusion = 'success'; summary = `All ${report.results.length} required platform/scenario checks passed for ${candidateSha}. Baseline and package IDs are recorded in run ${runId}.`;
        } catch (error) { summary = error.message; }
        await writeCheck(api, candidateSha, { status: 'completed', conclusion, details_url: run.html_url, output: { title: conclusion === 'success' ? 'Signed installer/update acceptance passed' : 'Signed installer/update acceptance failed', summary } }, runId);
    } else throw new Error('Invalid validation publisher phase.');
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { qualifyingInvocation, checkRunId, newerCheckExists, assertUpgradeEvidence, requiredAtHead, writeCheck };
