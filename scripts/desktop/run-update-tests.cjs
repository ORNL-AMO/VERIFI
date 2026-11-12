const fs = require('node:fs/promises');
const path = require('node:path');
const { assert } = require('./qa-contract.cjs');
const { runScenario } = require('./testing/controller.cjs');
const { platformName } = require('./testing/platform.cjs');

async function main() {
    assert(process.env.GITHUB_RUN_ATTEMPT === '1', 'Dispatch a new test-only run against the same artifacts; job reruns are rejected.');
    const testPlan = JSON.parse(await fs.readFile('qa-tests.json', 'utf8'));
    assert(testPlan.schemaVersion === 1 && testPlan.kind === 'desktop-test-plan' && testPlan.testRunId === Number(process.env.GITHUB_RUN_ID) && testPlan.testToolingSha === process.env.GITHUB_SHA, 'Test-plan provenance mismatch.');
    const scenario = process.env.QA_TEST_CASE;
    const row = testPlan.matrix.find(item => item.platform === platformName && item.scenario === scenario);
    assert(row, 'Unexpected platform/scenario.');
    const packages = testPlan.report.packages;
    const find = (id, directory) => {
        const entry = packages.find(item => item.artifactId === id && item.platform === platformName);
        assert(entry, 'Missing pinned test artifact.');
        return { ...entry, directory: path.resolve(directory) };
    };
    const result = await runScenario({ plan: testPlan.report.plan, from: find(row.fromArtifactId, 'baseline'), to: find(row.toArtifactId, 'candidate'), scenario,
        evidence: path.resolve('evidence'), installRoot: path.join(process.env.RUNNER_TEMP, 'desktop-qa-install') });
    if (result.status !== 'passed') process.exitCode = 1;
}
if (require.main === module) main().catch(async error => {
    await fs.mkdir('evidence', { recursive: true });
    await fs.writeFile('evidence/preflight-error.txt', error.stack || error.message);
    console.error(error.message); process.exitCode = 1;
});
