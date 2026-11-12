const fs = require('node:fs/promises');
const { githubApi } = require('./github-api.cjs');
const { loadRetainedRun } = require('./retained-qa.cjs');
const { assert, positiveInteger, sha, QA_INSTRUMENTATION_VERSION } = require('./qa-contract.cjs');

const PLATFORMS = [{ platform: 'windows', os: 'windows-2025' }, { platform: 'mac', os: 'macos-26' }, { platform: 'linux', os: 'ubuntu-24.04' }];
function testMatrix(report) {
    const cases = report.plan.scenario === 'electron-upgrade' ? ['baseline-update', 'cancel-save', 'discard', 'backup-recovery'] : ['baseline-update'];
    return PLATFORMS.flatMap(platform => cases.map(scenario => {
        const from = report.packages.find(item => item.platform === platform.platform && item.role === (scenario === 'baseline-update' ? 'baseline' : 'candidate-a'));
        const to = report.packages.find(item => item.platform === platform.platform && item.role === 'candidate-b');
        assert(from && to && from.manifest?.qaInstrumentation?.instrumentationVersion === QA_INSTRUMENTATION_VERSION && to.manifest?.qaInstrumentation?.instrumentationVersion === QA_INSTRUMENTATION_VERSION, 'Rebuild compatible baseline and candidate packages; earlier QA witnesses lack the required security evidence.');
        if (scenario !== 'baseline-update') assert(from.manifest.qaInstrumentation.updaterContract === 'guarded-v1', 'Candidate does not expose the guarded updater contract required by this scenario.');
        return { ...platform, scenario, fromArtifactId: from.artifactId, fromArtifactRunId: from.artifactRunId, toArtifactId: to.artifactId, toArtifactRunId: to.artifactRunId };
    }));
}

async function main() {
    assert(process.env.GITHUB_RUN_ATTEMPT === '1', 'Dispatch test-only with retained packages instead of rerunning workflow jobs.');
    const api = githubApi();
    const packageRun = positiveInteger(process.env.ARTIFACT_RUN_ID, 'package run ID');
    const current = { id: Number(process.env.GITHUB_RUN_ID), workflowSha: sha(process.env.GITHUB_SHA) };
    const report = await loadRetainedRun(api, packageRun, process.env.GITHUB_REPOSITORY, true, current);
    const selection = process.env.QA_TEST_PLATFORM || 'all';
    assert(['all', ...PLATFORMS.map(item => item.platform)].includes(selection), 'Invalid pilot platform.');
    const required = testMatrix(report);
    const matrix = selection === 'all' ? required : required.filter(item => item.platform === selection);
    const testPlan = { schemaVersion: 1, kind: 'desktop-test-plan', testRunId: current.id, testToolingSha: current.workflowSha, packageRunId: packageRun, selection, report, matrix };
    await fs.writeFile('qa-tests.json', JSON.stringify(testPlan, null, 2) + '\n');
    await fs.appendFile(process.env.GITHUB_OUTPUT, `matrix=${JSON.stringify({ include: matrix })}\ncandidate-sha=${report.plan.candidateSha}\n`);
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { testMatrix };
