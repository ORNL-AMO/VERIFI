const fs = require('node:fs/promises');
const path = require('node:path');
const { githubApi, paginate } = require('./github-api.cjs');
const { loadRetainedRun } = require('./retained-qa.cjs');
const { assert, validatePlan, PLATFORMS } = require('./qa-contract.cjs');

function packageEntry(plan, build, platform, manifest, artifact) {
    assert(manifest.schemaVersion === 1 && manifest.kind === 'desktop-package' && manifest.qa === true, 'Expected a QA package manifest.');
    assert(manifest.platform === platform && manifest.role === build.role && manifest.sourceSha === build.sourceSha && manifest.version === build.version && manifest.workflowSha === plan.workflowSha, 'Package manifest provenance mismatch.');
    assert(manifest.verification?.verified === true && manifest.qaInstrumentation?.sourceSha === build.sourceSha && manifest.qaInstrumentation?.workflowSha === plan.workflowSha, 'Missing QA instrumentation/verification evidence.');
    for (const key of ['wrapperSha256', 'configSha256']) assert(/^[a-f0-9]{64}$/.test(manifest.qaInstrumentation[key]), 'Invalid QA instrumentation hash.');
    assert(artifact && !artifact.expired && /^sha256:[a-f0-9]{64}$/.test(artifact.digest), 'Package upload is missing, expired, or has an invalid digest.');
    return { role: build.role, platform, sourceSha: build.sourceSha, version: build.version, verified: true,
        artifactId: artifact.id, artifactName: artifact.name, artifactDigest: artifact.digest, artifactRunId: plan.runId, manifest };
}

async function collect(plan, directory, artifacts, previous) {
    validatePlan(plan);
    const packages = [];
    for (const build of plan.builds) for (const platform of PLATFORMS) {
        if (build.reuseRunId) {
            const entry = previous.packages.find(item => item.role === build.reuseRole && item.platform === platform);
            assert(entry?.sourceSha === build.sourceSha && entry?.version === build.version, 'Reused baseline source/version mismatch.');
            packages.push({ ...entry, role: build.role, originalRole: entry.role });
        } else {
            const prefix = `desktop-qa-${build.role}-${platform}`;
            const manifest = JSON.parse(await fs.readFile(path.join(directory, `${prefix}-manifest`, 'package-manifest.json'), 'utf8'));
            const matches = artifacts.filter(item => item.name === `${prefix}-artifact`);
            assert(matches.length === 1, 'Missing or duplicate package artifact.');
            packages.push(packageEntry(plan, build, platform, manifest, matches[0]));
        }
    }
    return { schemaVersion: 1, kind: 'desktop-qa-packages', stage: 'packaging-only', status: 'passed', runId: plan.runId, plan, packages };
}

async function main() {
    const plan = validatePlan(JSON.parse(await fs.readFile('qa-plan.json', 'utf8')));
    const api = githubApi();
    const artifacts = await paginate(api, `/actions/runs/${plan.runId}/artifacts`, 'artifacts');
    const reused = plan.builds.find(build => build.reuseRunId);
    const previous = reused ? await loadRetainedRun(api, reused.reuseRunId, plan.repository) : undefined;
    const report = await collect(plan, 'package-manifests', artifacts, previous);
    await fs.writeFile('qa-run.json', JSON.stringify(report, null, 2) + '\n');
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `## Signed QA packages verified\n\nCandidate: ${plan.candidateSha}\n\n${report.packages.map(item => `- ${item.role} / ${item.platform}: ${item.version}, artifact ${item.artifactId}`).join('\n')}\n\nPackaging-only evidence. Installed-app/update acceptance has not run. Retention: 14 days; test-only reruns must use the retained artifacts.\n`);
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { packageEntry, collect };
