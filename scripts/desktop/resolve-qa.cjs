const fs = require('node:fs/promises');
const { githubApi, paginate } = require('./github-api.cjs');
const { assert, sha, qaVersion, QA_IDENTITY, SCHEMA_VERSION, validateInputs, validatePlan } = require('./qa-contract.cjs');

async function trustedCommit(api, ref, repository) {
    assert(typeof ref === 'string' && ref.length <= 250 && !/[\x00-\x1f]/.test(ref), 'Invalid source ref.');
    const commit = sha((await api(`/commits/${encodeURIComponent(ref)}`)).sha);
    const pulls = await paginate(api, '/pulls?state=open');
    if (pulls.some(pr => pr.head.sha === commit && pr.head.repo?.full_name === repository)) return commit;
    const branches = await paginate(api, '/branches?protected=true');
    for (const branch of branches) {
        if (branch.commit.sha === commit) return commit;
        const comparison = await api(`/compare/${commit}...${sha(branch.commit.sha)}`);
        if (['ahead', 'identical'].includes(comparison.status)) return commit;
    }
    throw new Error('Source must be reachable from a protected branch or be an open same-repository PR head.');
}

async function assertSigningApproval(api) {
    const environment = await api('/environments/desktop-qa-signing');
    assert(environment.protection_rules?.some(rule => rule.type === 'required_reviewers' && rule.reviewers?.length > 0), 'desktop-qa-signing must have a required maintainer reviewer.');
    assert(!environment.protection_rules.some(rule => rule.type === 'required_reviewers' && rule.prevent_self_review), 'The QA signing environment must permit maintainer self-approval.');
}

async function resolvePlan(input, context, api, reusedBaseline) {
    validateInputs(input);
    assert(input.mode !== 'test-only', 'Test-only must load the retained plan.');
    assert(context.ref.startsWith('refs/heads/'), 'Dispatch from a trusted branch.');
    if (context.ref !== 'refs/heads/develop') assert(await trustedCommit(api, context.workflowSha, context.repository) === context.workflowSha, 'Untrusted workflow definition.');
    assert(String(context.attempt) === '1', 'Do not rebuild signed artifacts on rerun; dispatch test-only or start a new build run.');
    const candidateSha = await trustedCommit(api, input.candidate_ref, context.repository);
    const baseline = reusedBaseline || { sourceSha: await trustedCommit(api, input.baseline_ref, context.repository), version: qaVersion(context.runNumber, 0) };
    const builds = [{ role: 'baseline', ...baseline }];
    if (input.scenario === 'electron-upgrade') builds.push({ role: 'candidate-a', sourceSha: candidateSha, version: qaVersion(context.runNumber, 1) });
    builds.push({ role: 'candidate-b', sourceSha: candidateSha, version: qaVersion(context.runNumber, 2) });
    return validatePlan({ schemaVersion: SCHEMA_VERSION, kind: 'desktop-qa-plan', repository: context.repository, workflowSha: sha(context.workflowSha), workflowRef: context.ref, candidateSha, runId: Number(context.runId), scenario: input.scenario, identity: QA_IDENTITY, builds });
}

async function main() {
    const input = validateInputs(JSON.parse(process.env.QA_INPUTS));
    const api = githubApi();
    const context = { repository: process.env.GITHUB_REPOSITORY, ref: process.env.GITHUB_REF, workflowSha: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID, runNumber: process.env.GITHUB_RUN_NUMBER, attempt: process.env.GITHUB_RUN_ATTEMPT };
    const { loadRetainedRun } = require('./retained-qa.cjs');
    let plan;
    if (input.mode === 'test-only') {
        plan = (await loadRetainedRun(api, input.artifact_run_id, context.repository, true)).plan;
        assert(plan.scenario === input.scenario, 'Test-only scenario does not match its original run.');
    } else {
        await assertSigningApproval(api);
        let baseline;
        if (input.baseline_run_id) {
            const previous = await loadRetainedRun(api, input.baseline_run_id, context.repository);
            const build = previous.plan.builds.find(item => item.role === 'candidate-b');
            baseline = { sourceSha: build.sourceSha, version: build.version, reuseRunId: Number(input.baseline_run_id), reuseRole: 'candidate-b' };
        }
        plan = await resolvePlan(input, context, api, baseline);
    }
    await fs.writeFile('qa-plan.json', JSON.stringify(plan, null, 2) + '\n');
    await fs.writeFile('qa-invocation.json', JSON.stringify({ schemaVersion: 1, kind: 'desktop-qa-invocation', runId: Number(context.runId), workflowSha: context.workflowSha,
        workflowRef: context.ref, candidateSha: plan.candidateSha, packageRunId: plan.runId, operation: input.mode, scenario: plan.scenario, testPlatform: input.test_platform || 'all' }, null, 2) + '\n');
    const builds = plan.builds.filter(build => !build.reuseRunId);
    await fs.appendFile(process.env.GITHUB_OUTPUT, `builds=${JSON.stringify(builds)}\ncandidate-sha=${plan.candidateSha}\n`);
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `## Desktop QA plan\n\nCandidate: ${plan.candidateSha}\n\nWorkflow: ${plan.workflowSha}\n\nScenario: ${plan.scenario}\n\n${plan.builds.map(build => `- ${build.role}: ${build.sourceSha} → ${build.version}${build.reuseRunId ? ` (retained run ${build.reuseRunId})` : ''}`).join('\n')}\n\nSigning approval applies to these resolved commits and QA versions.\n`);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { trustedCommit, assertSigningApproval, resolvePlan };
