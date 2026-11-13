const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { assert, positiveInteger } = require('./qa-contract.cjs');
const { expectedFiles, validateSnapshot, compareInventory, validateBaseline, validateProductionManifests } = require('./production-audit-contract.cjs');
const { evidenceNames, validateEvidence, decodeEnvelope } = require('./production-evidence.cjs');
const policy = require('./production-audit-policy.json');
const { releaseClient, inventory, resolveTag, sourceFile, validateOriginRun, downloadAsset, verifyAttestation, assertUnchanged, MAX_EVIDENCE_SIZE } = require('./production-release-api.cjs');
const { finalizeMetadata, darwinMinimum } = require('./update-metadata.cjs');

const PLATFORMS = ['windows', 'mac', 'linux'];
const METADATA = { windows: 'latest.yml', mac: 'latest-mac.yml', linux: 'latest-linux.yml' };

async function readEvidence(client, release, assets, directory, expectedRunId, verify = verifyAttestation) {
    const selected = [];
    const allowed = [];
    const matched = new Set();
    for (const asset of assets) {
        const match = /^production-evidence-([1-9][0-9]*)-([1-9][0-9]*)\.json$/.exec(asset.name);
        if (!match) continue;
        const names = evidenceNames(match[1], match[2]);
        const file = await downloadAsset(client, asset, directory, MAX_EVIDENCE_SIZE);
        const decoded = decodeEnvelope(JSON.parse(await fs.readFile(path.join(directory, file.name), 'utf8')));
        const subjects = path.join(directory, 'subjects', `${match[1]}-${match[2]}`);
        await fs.mkdir(subjects, { recursive: true });
        await fs.writeFile(path.join(subjects, names.evidence), decoded.subject);
        await fs.writeFile(path.join(subjects, names.bundle), decoded.bundle);
        const value = validateEvidence(decoded.evidence, { releaseId: release.id, sourceSha: release.sourceSha, version: release.version });
        assert(value.run.id === Number(match[1]) && value.run.attempt === Number(match[2]), 'Evidence filename/invocation mismatch.');
        await verify(path.join(subjects, names.evidence), path.join(subjects, names.bundle), { workflow: '.github/workflows/release_desktop.yml', sourceSha: value.workflowSha, sourceRef: 'refs/heads/master', runId: value.run.id, runAttempt: value.run.attempt });
        allowed.push(file);
        matched.add(asset.id);
        if (expectedRunId === undefined || value.run.id === expectedRunId) selected.push({ evidence: value, file });
    }
    for (const asset of assets.filter(item => item.name.startsWith('production-evidence-'))) assert(matched.has(asset.id), 'Unpaired or unrecognized production evidence attachment.');
    selected.sort((a, b) => b.evidence.run.id - a.evidence.run.id || b.evidence.run.attempt - a.evidence.run.attempt);
    return { selected: selected[0], allowed };
}

async function releaseIdentity(client, release) {
    const sourceSha = await resolveTag(client, release.tag_name);
    const pkg = JSON.parse((await sourceFile(client, sourceSha, 'package.json')).toString('utf8'));
    assert(release.tag_name === `v${pkg.version}`, 'Release tag does not match its immutable source version.');
    return { ...release, sourceSha, version: pkg.version, sourcePackage: pkg };
}

async function downloadDistributionSet(client, assets, expected, directory) {
    const files = [];
    for (const name of expected) {
        const matches = assets.filter(asset => asset.name === name);
        assert(matches.length === 1, `Missing or duplicate distribution: ${name}`);
        console.log(`Verifying uploaded asset ${matches[0].id}: ${name}`);
        files.push(await downloadAsset(client, matches[0], directory));
    }
    return files;
}

function bindDownloadedAssets(assets, downloaded) {
    // Keep unknown API attachments in the inventory so the contract rejects them.
    return assets.map(asset => ({ ...asset, ...downloaded.find(file => file.id === asset.id) }));
}

function isLegacyBaseline(release, baselinePolicy = policy) {
    assert(baselinePolicy.schemaVersion === 1 && baselinePolicy.repository === 'ORNL-AMO/VERIFI', 'Unsupported legacy baseline policy.');
    return baselinePolicy.legacyBaselines.some(value => value.releaseId === release.id && value.tag === release.tag_name && value.sourceSha === release.sourceSha);
}

async function prepareAudit(client, releaseId, releaseRunId, directory, env = process.env, verify = verifyAttestation, baselinePolicy = policy) {
    releaseId = positiveInteger(releaseId, 'release ID');
    releaseRunId = positiveInteger(releaseRunId, 'release run ID');
    await fs.mkdir(directory, { recursive: true });
    const release = await releaseIdentity(client, await client.api(`/releases/${releaseId}`));
    assert(release.draft === true && release.prerelease === false, 'Audit target must be an unpublished production draft.');
    const run = await client.api(`/actions/runs/${releaseRunId}`);
    validateOriginRun(run, release.sourceSha);
    const assets = await inventory(client, releaseId);
    const evidence = await readEvidence(client, release, assets, path.join(directory, 'evidence'), releaseRunId, verify);
    assert(evidence.selected, 'No attested packaging evidence for the selected production run.');
    const capsule = evidence.selected.evidence;
    assert(capsule.run.attempt <= run.run_attempt, 'Packaging evidence names an unknown run attempt.');
    const manifests = validateProductionManifests(capsule.packages, capsule);
    const targetFiles = await downloadDistributionSet(client, assets, expectedFiles(release.version), path.join(directory, 'target'));
    const target = validateSnapshot(release, bindDownloadedAssets(assets, [...targetFiles, ...evidence.allowed]), manifests, { allowEvidence: evidence.allowed });
    compareInventory(capsule.assets, target.assets);
    Object.assign(target, { sourceSha: release.sourceSha, version: release.version, draft: true, prerelease: false });

    const previous = await releaseIdentity(client, await client.api('/releases/latest'));
    assert(previous.draft === false && previous.prerelease === false && previous.id !== releaseId, 'No public production latest baseline is available.');
    const baselineAssets = await inventory(client, previous.id);
    const baselineEvidence = await readEvidence(client, previous, baselineAssets, path.join(directory, 'baseline-evidence'), undefined, verify);
    assert(baselineEvidence.selected || isLegacyBaseline(previous, baselinePolicy), 'Public latest is missing modern evidence and is not an approved legacy baseline.');
    const baselineFiles = await downloadDistributionSet(client, baselineAssets, expectedFiles(previous.version), path.join(directory, 'baseline'));
    const baseline = validateSnapshot(previous, bindDownloadedAssets(baselineAssets, [...baselineFiles, ...baselineEvidence.allowed]), expectedFiles(previous.version), { allowEvidence: baselineEvidence.allowed });
    if (baselineEvidence.selected) compareInventory(baselineEvidence.selected.evidence.assets, baseline.assets);
    Object.assign(baseline, { sourceSha: previous.sourceSha, version: previous.version, draft: false, prerelease: false, selection: 'public-latest', legacy: !baselineEvidence.selected, selectedAt: new Date().toISOString() });
    validateBaseline(target, baseline);
    await assertUnchanged(client, release, assets);
    await checkPublicBaseline(client, baseline, baselineAssets);
    const plan = {
        schemaVersion: 1, kind: 'desktop-production-audit-plan', mode: 'preview',
        origin: { runId: releaseRunId, runAttempt: capsule.run.attempt, sourceSha: release.sourceSha, workflowSha: capsule.workflowSha },
        audit: { runId: positiveInteger(env.GITHUB_RUN_ID, 'audit run ID'), runAttempt: positiveInteger(env.GITHUB_RUN_ATTEMPT, 'audit run attempt'), toolingSha: env.GITHUB_SHA },
        target, baseline, evidence: evidence.selected, sourcePackage: release.sourcePackage,
        expectedEntrypointSha256: createHash('sha256').update(await sourceFile(client, release.sourceSha, 'main.js')).digest('hex'),
        packages: capsule.packages, inventory: assets, baselineInventory: baselineAssets,
        createdAt: new Date().toISOString()
    };
    await fs.writeFile(path.join(directory, 'audit-plan.json'), JSON.stringify(plan, null, 2) + '\n');
    // Each native job receives only its exact downloaded platform files and a read-only plan.
    for (const platform of PLATFORMS) {
        const output = path.join(directory, platform);
        await fs.mkdir(output, { recursive: true });
        await fs.writeFile(path.join(output, 'audit-plan.json'), JSON.stringify(plan, null, 2) + '\n');
        for (const file of capsule.packages.find(item => item.manifest.platform === platform).manifest.files) await fs.copyFile(path.join(directory, 'target', file.name), path.join(output, file.name));
    }
    return plan;
}

async function checkPublicBaseline(client, baseline, assets) {
    const latest = await client.api('/releases/latest');
    assert(latest.id === baseline.id && latest.tag_name === baseline.tag && latest.draft === false && latest.prerelease === false && await resolveTag(client, latest.tag_name) === baseline.sourceSha, 'Production latest changed; an explicit new baseline selection is required.');
    const after = await inventory(client, baseline.id);
    const identity = values => values.map(({ id, name, size, digest }) => ({ id, name, size, digest })).sort((a, b) => a.id - b.id);
    assert(JSON.stringify(identity(assets)) === JSON.stringify(identity(after)), 'Pinned baseline assets changed.');
}

async function inspectAudit(platform, directory, outputFile, inspect) {
    assert(PLATFORMS.includes(platform), 'Invalid inspection platform.');
    const plan = JSON.parse(await fs.readFile(path.join(directory, 'audit-plan.json'), 'utf8'));
    assert(plan.schemaVersion === 1 && plan.kind === 'desktop-production-audit-plan' && plan.mode === 'preview', 'Invalid preview inspection plan.');
    const manifest = plan.packages.find(item => item.manifest.platform === platform)?.manifest;
    assert(manifest, 'Missing platform inspection manifest.');
    const output = { schemaVersion: 1, kind: 'desktop-production-inspection', platform, status: 'failed', target: plan.target, origin: plan.origin, audit: plan.audit, checks: {} };
    try {
        const { verifyFiles } = require('./qa-contract.cjs');
        await verifyFiles(directory, manifest.files);
        const minimum = platform === 'mac' ? darwinMinimum(plan.sourcePackage.build?.mac?.minimumSystemVersion) : undefined;
        const info = await finalizeMetadata(directory, METADATA[platform], false, minimum, { expectedVersion: plan.target.version });
        assert(info.version === plan.target.version, 'Updater metadata version mismatch.');
        output.checks.metadata = true;
        const inspectPackage = inspect || require('./inspect-production-package.cjs').inspectPackage;
        output.distributions = await inspectPackage({ platform, directory, manifest, sourcePackage: plan.sourcePackage, expectedEntrypointSha256: plan.expectedEntrypointSha256, outputDirectory: `${outputFile}.extracted` });
        output.checks.packagedConfiguration = true;
        output.status = 'passed';
    } catch (error) { output.error = error.message; }
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify(output, null, 2) + '\n');
    assert(output.status === 'passed', output.error || 'Production package inspection failed.');
    return output;
}

function validateInspection(plan, result, platform) {
    assert(result?.schemaVersion === 1 && result.kind === 'desktop-production-inspection' && result.platform === platform && result.status === 'passed' && result.checks?.metadata === true && result.checks?.packagedConfiguration === true, `Missing or failed ${platform} inspection.`);
    assert(JSON.stringify(result.origin) === JSON.stringify(plan.origin) && JSON.stringify(result.audit) === JSON.stringify(plan.audit), 'Inspection invocation/source mismatch.');
    assert(result.target.id === plan.target.id && result.target.sourceSha === plan.target.sourceSha && result.target.version === plan.target.version, 'Inspection target mismatch.');
    compareInventory(plan.target.assets, result.target.assets);
    const manifest = plan.packages.find(item => item.manifest.platform === platform)?.manifest;
    const expected = manifest.files.filter(file => /\.(exe|dmg|zip|AppImage|tar\.gz)$/.test(file.name)).map(file => file.name).sort();
    assert(Array.isArray(result.distributions) && JSON.stringify(result.distributions.map(file => file.name).sort()) === JSON.stringify(expected), 'Incomplete distribution inspection.');
    return result;
}

async function collectAudit(client, directory, resultsDirectory) {
    const plan = JSON.parse(await fs.readFile(path.join(directory, 'audit-plan.json'), 'utf8'));
    assert(plan.kind === 'desktop-production-audit-plan' && plan.mode === 'preview', 'Invalid audit preview plan.');
    const report = { schemaVersion: 1, kind: 'desktop-production-audit', mode: 'preview', publicationEligible: false, status: 'failed', origin: plan.origin, audit: plan.audit, target: plan.target, baseline: plan.baseline, evidence: plan.evidence, inspections: [], createdAt: new Date().toISOString() };
    try {
        for (const platform of PLATFORMS) {
            const result = JSON.parse(await fs.readFile(path.join(resultsDirectory, platform, 'inspection.json'), 'utf8'));
            report.inspections.push(validateInspection(plan, result, platform));
        }
        const release = await client.api(`/releases/${plan.target.id}`);
        release.sourceSha = plan.target.sourceSha;
        await assertUnchanged(client, release, plan.inventory);
        await checkPublicBaseline(client, plan.baseline, plan.baselineInventory);
        report.status = 'passed';
    } catch (error) { report.error = error.message; }
    await fs.writeFile(path.join(directory, 'audit-preview.json'), JSON.stringify(report, null, 2) + '\n');
    const summary = `# Production draft audit preview: ${report.status}\n\nRead-only trial; this report does not authorize publication.\n\n- Draft: ${plan.target.id} (${plan.target.tag})\n- Source: ${plan.target.sourceSha}\n- Origin: run ${plan.origin.runId}, attempt ${plan.origin.runAttempt}\n- Baseline: ${plan.baseline.id} (${plan.baseline.tag})${plan.baseline.legacy ? ' — legacy release, original files hashed' : ''}\n- Inspection platforms passed: ${report.inspections.length}/3\n${report.error ? `\nFailure: ${report.error}\n` : ''}`;
    await fs.writeFile(path.join(directory, 'audit-preview.md'), summary);
    if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    assert(report.status === 'passed', report.error || 'Production draft audit failed.');
    return report;
}

if (require.main === module) {
    const [command, first, second, third] = process.argv.slice(2);
    const main = async () => {
        if (command === 'prepare' && first && second && third) await prepareAudit(releaseClient(), first, second, third);
        else if (command === 'inspect' && first && second && third) await inspectAudit(first, second, third);
        else if (command === 'collect' && first && second) await collectAudit(releaseClient(), first, second);
        else throw new Error('Usage: audit-production-draft.cjs prepare <release-id> <release-run-id> <directory> | inspect <platform> <directory> <result.json> | collect <directory> <results-directory>');
    };
    main().catch(async error => {
        console.error(error.message);
        if (command === 'prepare' && third) {
            await fs.mkdir(third, { recursive: true });
            await fs.writeFile(path.join(third, 'audit-preview.json'), JSON.stringify({ schemaVersion: 1, kind: 'desktop-production-audit', mode: 'preview', publicationEligible: false, status: 'failed', stage: 'prepare', error: error.message }, null, 2) + '\n');
            const summary = `# Production draft audit preview: failed\n\nRead-only preparation failed: ${error.message}\n`;
            await fs.writeFile(path.join(third, 'audit-preview.md'), summary);
            if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
        }
        process.exitCode = 1;
    });
}

module.exports = { readEvidence, releaseIdentity, downloadDistributionSet, isLegacyBaseline, prepareAudit, checkPublicBaseline, inspectAudit, validateInspection, collectAudit };
