const fs = require('node:fs/promises');
const path = require('node:path');
const { assert, positiveInteger, sha } = require('./qa-contract.cjs');
const { paginate } = require('./github-api.cjs');
const { expectedFiles, validateProductionManifests, validateSnapshot } = require('./production-audit-contract.cjs');
const { releaseClient, inventory, resolveTag, validateOriginRun, describe, readManifestArtifact, assertUnchanged, uploadFile, verifyAttestation } = require('./production-release-api.cjs');

function evidenceNames(runId, attempt) {
    const stem = `production-evidence-${positiveInteger(runId, 'origin run ID')}-${positiveInteger(attempt, 'origin attempt')}`;
    return { evidence: `${stem}.json`, bundle: `${stem}.sigstore.json` };
}

function artifactIdentity(artifact, runId, sourceSha) {
    assert(artifact && !artifact.expired && /^sha256:[a-f0-9]{64}$/.test(artifact.digest) && artifact.workflow_run?.id === runId && artifact.workflow_run?.head_sha === sourceSha, 'Missing, expired or mismatched production packaging artifact.');
    return { id: positiveInteger(artifact.id, 'packaging artifact ID'), name: artifact.name, digest: artifact.digest, workflow_run: { id: runId, head_sha: sourceSha } };
}

function validateEvidence(value, { releaseId, sourceSha, version, runId } = {}) {
    assert(value.schemaVersion === 1 && value.kind === 'desktop-production-evidence' && value.repository === 'ORNL-AMO/VERIFI', 'Unsupported production packaging evidence.');
    sha(value.sourceSha); sha(value.workflowSha);
    assert(value.workflowSha === value.sourceSha && value.tag === `v${value.version}`, 'Production evidence source/version mismatch.');
    positiveInteger(value.releaseId, 'evidence release ID');
    positiveInteger(value.run?.id, 'evidence origin run ID'); positiveInteger(value.run?.attempt, 'evidence origin run attempt');
    if (releaseId !== undefined) assert(value.releaseId === releaseId, 'Evidence belongs to another release.');
    if (sourceSha !== undefined) assert(value.sourceSha === sourceSha, 'Evidence source commit mismatch.');
    if (version !== undefined) assert(value.version === version, 'Evidence version mismatch.');
    if (runId !== undefined) assert(value.run.id === runId, 'Evidence belongs to another production run.');
    assert(Array.isArray(value.packages) && value.packages.length === 3, 'Incomplete production platform evidence.');
    const files = validateProductionManifests(value.packages, value);
    for (const item of value.packages) {
        const platform = item.manifest.platform;
        for (const [key, suffix] of [['artifact', 'artifact'], ['manifestArtifact', 'manifest']]) {
            const artifact = artifactIdentity({ ...item[key], expired: false }, value.run.id, value.sourceSha);
            assert(artifact.name === `release-${platform}-${suffix}`, 'Packaging artifact name/platform mismatch.');
        }
    }
    validateSnapshot({ id: value.releaseId, tag_name: value.tag }, value.assets, files);
    return value;
}

async function preflightDraft(client, env = process.env) {
    assert(env.GITHUB_REF === 'refs/heads/master', 'Only master may upload production releases.');
    const sourceSha = sha(env.GITHUB_SHA);
    const version = JSON.parse(await fs.readFile('package.json', 'utf8')).version;
    const releases = await paginate(client.api, '/releases');
    const matching = releases.filter(release => release.tag_name === `v${version}`);
    assert(matching.length <= 1, 'Duplicate production release tags.');
    if (matching.length) {
        assert(matching[0].draft === true && matching[0].prerelease === false, 'Never replace files on an already published production release.');
        const refs = await paginate(client.api, `/git/matching-refs/tags/${encodeURIComponent(matching[0].tag_name)}`);
        if (refs.some(ref => ref.ref === `refs/tags/${matching[0].tag_name}`)) assert(await resolveTag(client, matching[0].tag_name) === sourceSha, 'Existing draft tag belongs to another commit.');
        else assert(matching[0].target_commitish === sourceSha, 'An untagged draft must target this immutable production commit.');
        await recoverIncompleteEvidence(client, matching[0].id, sourceSha);
    }
}

async function recoverIncompleteEvidence(client, releaseId, sourceSha) {
    for (const asset of await inventory(client, releaseId)) {
        const match = /^production-evidence-([1-9][0-9]*)-([1-9][0-9]*)\.json$/.exec(asset.name);
        if (!match || asset.state !== 'starter' || asset.size !== 0 || asset.uploader?.login !== 'github-actions[bot]') continue;
        const runId = positiveInteger(match[1], 'incomplete evidence run ID'), attempt = positiveInteger(match[2], 'incomplete evidence attempt');
        const run = await client.api(`/actions/runs/${runId}/attempts/${attempt}`);
        assert(run.id === runId && run.run_attempt === attempt && run.head_sha === sourceSha && run.head_branch === 'master' && run.path === '.github/workflows/main.yml' && ['push', 'workflow_dispatch'].includes(run.event) && run.status === 'completed' && ['failure', 'cancelled'].includes(run.conclusion), 'Incomplete evidence does not belong to a failed matching production attempt; inspect it manually.');
        // GitHub can leave a zero-byte starter on failed uploads. Never delete uploaded evidence or installers.
        await client.api(`/releases/assets/${positiveInteger(asset.id, 'incomplete evidence asset ID')}`, { method: 'DELETE' });
    }
}

async function ensureProductionTag(client, version, sourceSha) {
    sha(sourceSha);
    expectedFiles(version);
    const tag = `v${version}`, ref = `refs/tags/${tag}`;
    const existing = await paginate(client.api, `/git/matching-refs/tags/${encodeURIComponent(tag)}`);
    if (!existing.some(item => item.ref === ref)) {
        try { await client.api('/git/refs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, sha: sourceSha }) }); }
        catch (error) {
            // A concurrent creation or a lost response is safe only if the exact ref now matches.
            if (await resolveTag(client, tag).catch(() => undefined) !== sourceSha) throw error;
        }
    }
    assert(await resolveTag(client, tag) === sourceSha, 'Production version tag belongs to another commit; never move release tags.');
}

async function prepareEvidence(client, releaseId, directory, env = process.env) {
    const runId = positiveInteger(env.GITHUB_RUN_ID, 'production run ID');
    const attempt = positiveInteger(env.GITHUB_RUN_ATTEMPT, 'production run attempt');
    const sourceSha = sha(env.GITHUB_SHA);
    assert(env.GITHUB_REF === 'refs/heads/master', 'Only master may retain production packaging evidence.');
    const run = await client.api(`/actions/runs/${runId}`);
    validateOriginRun(run, sourceSha, { currentRunId: runId, currentRunAttempt: attempt });
    const release = await client.api(`/releases/${positiveInteger(releaseId, 'release ID')}`);
    assert(release.draft === true && release.prerelease === false && await resolveTag(client, release.tag_name) === sourceSha, 'Production draft/tag does not match this run.');
    release.sourceSha = sourceSha;
    const version = JSON.parse(await fs.readFile('package.json', 'utf8')).version;
    assert(release.tag_name === `v${version}`, 'Draft version mismatch.');
    const assets = await inventory(client, release.id);
    const artifacts = await paginate(client.api, `/actions/runs/${runId}/artifacts`, 'artifacts');
    await fs.mkdir(directory, { recursive: true });
    const packages = [];
    for (const platform of ['windows', 'mac', 'linux']) {
        const find = suffix => {
            const matches = artifacts.filter(item => item.name === `release-${platform}-${suffix}`);
            assert(matches.length === 1, `Missing or duplicate ${platform} ${suffix}.`);
            return matches[0];
        };
        const artifact = find('artifact'), manifestArtifact = find('manifest');
        packages.push({ artifact: artifactIdentity(artifact, runId, sourceSha), manifestArtifact: artifactIdentity(manifestArtifact, runId, sourceSha), manifest: await readManifestArtifact(client, manifestArtifact, directory) });
    }
    const files = validateProductionManifests(packages, { sourceSha, workflowSha: sourceSha, version });
    const recorded = [];
    for (const name of expectedFiles(version)) {
        const matches = assets.filter(item => item.name === name);
        assert(matches.length === 1, `Missing or duplicate uploaded distribution: ${name}`);
        const actual = await describe(path.join('release', name));
        const expected = files.find(file => file.name === name);
        assert(actual.size === expected.size && actual.sha256 === expected.sha256 && matches[0].size === actual.size && matches[0].digest === `sha256:${actual.sha256}`, `Uploaded distribution does not match packaging evidence: ${name}`);
        recorded.push({ id: matches[0].id, ...actual });
    }
    const evidence = validateEvidence({ schemaVersion: 1, kind: 'desktop-production-evidence', repository: client.repository, releaseId: release.id, tag: release.tag_name, version, sourceSha, workflowSha: sourceSha, run: { id: runId, attempt }, packages, assets: recorded });
    await assertUnchanged(client, release, assets);
    const names = evidenceNames(runId, attempt);
    const subjects = path.join(directory, 'subjects');
    await fs.mkdir(subjects, { recursive: true });
    await fs.writeFile(path.join(subjects, names.evidence), JSON.stringify(evidence, null, 2) + '\n');
    if (env.GITHUB_OUTPUT) await fs.appendFile(env.GITHUB_OUTPUT, `evidence=${path.join(subjects, names.evidence)}\nbundle=${path.join(subjects, names.bundle)}\n`);
    return evidence;
}

function evidenceEnvelope(subject, bundle) {
    assert(typeof subject === 'string' && typeof bundle === 'string' && subject.length > 0 && bundle.length > 0, 'Missing evidence subject or attestation bundle.');
    validateEvidence(JSON.parse(subject));
    return { schemaVersion: 1, kind: 'desktop-production-evidence-envelope', subject, bundle };
}

function decodeEnvelope(value) {
    assert(value?.schemaVersion === 1 && value.kind === 'desktop-production-evidence-envelope', 'Unsupported production evidence envelope.');
    evidenceEnvelope(value.subject, value.bundle);
    return { subject: value.subject, bundle: value.bundle, evidence: validateEvidence(JSON.parse(value.subject)) };
}

async function attachEvidence(client, releaseId, evidenceFile, bundleFile, verify = verifyAttestation) {
    const evidence = validateEvidence(JSON.parse(await fs.readFile(evidenceFile, 'utf8')), { releaseId: positiveInteger(releaseId, 'release ID') });
    const names = evidenceNames(evidence.run.id, evidence.run.attempt);
    assert(path.basename(evidenceFile) === names.evidence && path.basename(bundleFile) === names.bundle, 'Evidence filenames do not match their invocation.');
    await verify(evidenceFile, bundleFile, { workflow: '.github/workflows/release_desktop.yml', sourceSha: evidence.workflowSha, sourceRef: 'refs/heads/master', runId: evidence.run.id, runAttempt: evidence.run.attempt });
    const release = { id: evidence.releaseId, tag_name: evidence.tag, sourceSha: evidence.sourceSha };
    const assets = await inventory(client, release.id);
    for (const expected of evidence.assets) {
        const asset = assets.find(item => item.id === expected.id);
        assert(asset?.name === expected.name && asset.size === expected.size && asset.digest === `sha256:${expected.sha256}`, 'Draft assets changed before evidence attachment.');
    }
    await assertUnchanged(client, release, assets);
    // The subject and its verification bundle share one atomic release attachment.
    const envelope = evidenceEnvelope(await fs.readFile(evidenceFile, 'utf8'), await fs.readFile(bundleFile, 'utf8'));
    const outputDirectory = path.join(path.dirname(evidenceFile), 'sealed');
    await fs.mkdir(outputDirectory, { recursive: true });
    const output = path.join(outputDirectory, names.evidence);
    await fs.writeFile(output, JSON.stringify(envelope, null, 2) + '\n');
    await uploadFile(client, release.id, output);
}

if (require.main === module) {
    const [command, releaseId, first, second] = process.argv.slice(2);
    const main = async () => {
        const client = releaseClient();
        if (command === 'preflight') await preflightDraft(client);
        else if (command === 'ensure-tag') await ensureProductionTag(client, JSON.parse(await fs.readFile('package.json', 'utf8')).version, process.env.GITHUB_SHA);
        else if (command === 'prepare' && releaseId && first) await prepareEvidence(client, releaseId, first);
        else if (command === 'attach' && releaseId && first && second) await attachEvidence(client, releaseId, first, second);
        else throw new Error('Usage: production-evidence.cjs prepare <release-id> <output-directory> | attach <release-id> <evidence.json> <bundle.json>');
    };
    main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { evidenceNames, artifactIdentity, validateEvidence, preflightDraft, recoverIncompleteEvidence, ensureProductionTag, prepareEvidence, evidenceEnvelope, decodeEnvelope, attachEvidence };
