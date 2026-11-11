const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { assert, positiveInteger, validatePlan, PLATFORMS } = require('./qa-contract.cjs');
const { paginate } = require('./github-api.cjs');

function assertTrustedRun(run, allowFailedTests = false, currentRun) {
    const current = currentRun && run.id === currentRun.id && run.head_sha === currentRun.workflowSha && run.status === 'in_progress';
    assert((current || (run.status === 'completed' && (run.conclusion === 'success' || (allowFailedTests && ['failure', 'cancelled'].includes(run.conclusion))))) && run.event === 'workflow_dispatch' && typeof run.head_branch === 'string' && run.path === '.github/workflows/desktop_prerelease.yml', 'Retained run is not a completed trusted desktop pre-release run.');
}

function validateRunReport(report, run, artifacts, repository, now = Date.now(), allowFailedTests = false, currentRun) {
    assertTrustedRun(run, allowFailedTests, currentRun);
    assert(report.schemaVersion === 1 && report.kind === 'desktop-qa-packages' && report.status === 'passed' && report.runId === run.id, 'Invalid retained package report.');
    const plan = validatePlan(report.plan);
    assert(plan.repository === repository && plan.runId === run.id && plan.workflowSha === run.head_sha, 'Retained plan provenance mismatch.');
    assert((plan.workflowRef || 'refs/heads/develop') === `refs/heads/${run.head_branch}`, 'Retained workflow branch mismatch.');
    assert(Array.isArray(report.packages) && report.packages.length === plan.builds.length * PLATFORMS.length, 'Incomplete retained platform set.');
    for (const build of plan.builds) for (const platform of PLATFORMS) {
        const matches = report.packages.filter(item => item.role === build.role && item.platform === platform);
        assert(matches.length === 1, 'Missing or duplicate retained platform package.');
        const item = matches[0];
        assert(item.sourceSha === build.sourceSha && item.version === build.version && item.verified === true, 'Retained package relationship mismatch.');
        const artifact = artifacts.find(value => value.id === item.artifactId);
        assert(artifact && !artifact.expired && Date.parse(artifact.expires_at) > now && artifact.name === item.artifactName && /^sha256:[a-f0-9]{64}$/.test(artifact.digest) && artifact.digest === item.artifactDigest, 'Retained artifact is missing, expired, or mismatched.');
        assert(artifact.workflow_run?.id === item.artifactRunId, 'Retained artifact run mismatch.');
    }
    return report;
}

async function readReport(api, artifact, fileName = 'qa-run.json') {
    assert(['qa-run.json', 'qa-installed-report.json', 'qa-invocation.json'].includes(fileName), 'Unsupported report filename.');
    assert(!artifact.expired && artifact.digest?.startsWith('sha256:'), 'Report artifact expired or has no digest.');
    // Fetch the authenticated redirect separately; never forward the token to blob storage.
    const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/actions/artifacts/${artifact.id}/zip`, {
        headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' }, redirect: 'manual', signal: AbortSignal.timeout(60000)
    });
    assert(response.status === 302 && response.headers.get('location')?.startsWith('https://'), 'Cannot download retained report.');
    const archive = await fetch(response.headers.get('location'), { signal: AbortSignal.timeout(60000) });
    assert(archive.ok && Number(archive.headers.get('content-length') || 0) < 20_000_000, 'Invalid retained report archive.');
    const bytes = Buffer.from(await archive.arrayBuffer());
    assert(bytes.length < 20_000_000 && `sha256:${createHash('sha256').update(bytes).digest('hex')}` === artifact.digest, 'Retained report archive digest mismatch.');
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifi-qa-report-'));
    try {
        const file = path.join(directory, 'report.zip');
        await fs.writeFile(file, bytes);
        return JSON.parse(execFileSync('unzip', ['-p', file, fileName], { maxBuffer: 10_000_000 }).toString());
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
}

async function loadRetainedRun(api, runId, repository, allowFailedTests = false, currentRun) {
    const id = positiveInteger(runId, 'retained run ID');
    const run = await api(`/actions/runs/${id}`);
    assertTrustedRun(run, allowFailedTests, currentRun);
    const artifacts = await paginate(api, `/actions/runs/${id}/artifacts`, 'artifacts');
    const reports = artifacts.filter(item => item.name === 'desktop-qa-report');
    assert(reports.length === 1, 'Retained run must contain exactly one QA report.');
    const report = await readReport(api, reports[0]);
    // A reused baseline can originate in an earlier run. Retrieve only those explicit IDs.
    for (const item of report.packages || []) {
        if (!artifacts.some(value => value.id === item.artifactId)) artifacts.push(await api(`/actions/artifacts/${positiveInteger(item.artifactId, 'artifact ID')}`));
    }
    return validateRunReport(report, run, artifacts, repository, Date.now(), allowFailedTests, currentRun);
}

module.exports = { validateRunReport, loadRetainedRun, readReport };
