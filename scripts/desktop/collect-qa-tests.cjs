const fs = require('node:fs/promises');
const path = require('node:path');
const { assert } = require('./qa-contract.cjs');
const { testMatrix } = require('./prepare-qa-tests.cjs');

function validateResults(testPlan, results) {
    const selection = testPlan.selection || 'all';
    assert(['all', 'windows', 'mac', 'linux'].includes(selection), 'Invalid result platform selection.');
    const required = testMatrix(testPlan.report);
    const expected = selection === 'all' ? required : required.filter(row => row.platform === selection);
    assert(results.length === expected.length, 'Every required installed-app scenario/platform must report.');
    for (const row of expected) {
        const matches = results.filter(result => result.platform === row.platform && result.scenario === row.scenario);
        assert(matches.length === 1, 'Missing or duplicate installed-app result.');
        const result = matches[0];
        assert(result.schemaVersion === 1 && result.kind === 'desktop-installed-test' && result.status === 'passed' && result.realUpdate === true && result.dataPreserved === true, 'An installed-app scenario failed or lacks real-update evidence.');
        assert(result.candidateSha === testPlan.report.plan.candidateSha && result.packageRunId === testPlan.packageRunId && result.from.artifactId === row.fromArtifactId && result.to.artifactId === row.toArtifactId, 'Installed-test artifact/candidate mismatch.');
        const from = testPlan.report.packages.find(item => item.artifactId === row.fromArtifactId);
        const to = testPlan.report.packages.find(item => item.artifactId === row.toArtifactId);
        assert(result.baselineSha === testPlan.report.plan.builds[0].sourceSha && result.from.sourceSha === from.sourceSha && result.to.sourceSha === to.sourceSha && result.from.version === from.version && result.to.version === to.version, 'Test source/version relationships mismatch.');
        assert(result.runtimeBefore.version === from.version && result.runtimeBefore.provenance.sourceSha === from.sourceSha && result.runtimeAfter.version === to.version && result.runtimeAfter.provenance.sourceSha === to.sourceSha, 'Updated installed version/source mismatch.');
        assert(result.runtimeBefore.pid !== result.runtimeAfter.pid && result.runtimeBefore.nonce !== result.runtimeAfter.nonce && result.runtimeBefore.archiveSha256 !== result.runtimeAfter.archiveSha256, 'No distinct updated application launch.');
        for (const runtime of [result.runtimeBefore, result.runtimeAfter]) assert(runtime.packaged === true && runtime.security.contextIsolation === true && runtime.security.nodeIntegration === false && runtime.security.sandbox === true, 'Packaged security invariant failed.');
        const required = { 'baseline-update': [], 'cancel-save': ['later', 'cancel', 'save'], discard: ['later', 'discard'], 'backup-recovery': ['later', 'save', 'backupFailure', 'backupRecovery'] }[row.scenario];
        required.forEach(guard => assert(result.guards[guard] === true, `Missing restart safeguard: ${guard}`));
        assert(result.phases.length > 0 && result.phases.every(phase => phase.status === 'passed'), 'Incomplete controller phases.');
    }
    return { schemaVersion: 1, kind: 'desktop-installed-report', status: selection === 'all' ? 'passed' : 'partial', selection, testRunId: testPlan.testRunId, testToolingSha: testPlan.testToolingSha,
        packageRunId: testPlan.packageRunId, candidateSha: testPlan.report.plan.candidateSha, plan: testPlan.report.plan, results };
}

async function main() {
    const testPlan = JSON.parse(await fs.readFile('qa-tests.json', 'utf8'));
    let report;
    try {
        const results = [];
        for (const name of await fs.readdir('test-results')) {
            const file = path.join('test-results', name, 'result.json');
            try { results.push(JSON.parse(await fs.readFile(file, 'utf8'))); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        }
        report = validateResults(testPlan, results);
    } catch (error) {
        report = { schemaVersion: 1, kind: 'desktop-installed-report', status: 'failed', candidateSha: testPlan.report.plan.candidateSha, testRunId: testPlan.testRunId, testToolingSha: testPlan.testToolingSha, packageRunId: testPlan.packageRunId, error: error.message };
        process.exitCode = 1;
    }
    await fs.writeFile('qa-installed-report.json', JSON.stringify(report, null, 2) + '\n');
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `## Installed-app validation: ${report.status}\n\nCandidate: ${report.candidateSha}\n\n${report.error || `${report.results.length} required platform/scenario checks passed with real updates and preserved fixture data.`}\n`);
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { validateResults };
