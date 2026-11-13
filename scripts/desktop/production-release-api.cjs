const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createWriteStream } = require('node:fs');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execute = promisify(execFile);
const { assert, positiveInteger, safeName, sha, describe } = require('./qa-contract.cjs');
const { githubApi, paginate } = require('./github-api.cjs');

const REPOSITORY = 'ORNL-AMO/VERIFI';
const API_VERSION = '2022-11-28';
const MAX_EVIDENCE_SIZE = 20_000_000;

function releaseClient(repository = process.env.GITHUB_REPOSITORY, token = process.env.GH_TOKEN) {
    assert(repository === REPOSITORY, 'Production evidence is restricted to ORNL-AMO/VERIFI.');
    const api = githubApi(repository, token);
    return { api, repository, token };
}

function assetIdentity(asset) {
    positiveInteger(asset.id, 'release asset ID');
    safeName(asset.name);
    assert(asset.state === undefined || asset.state === 'uploaded', `Asset upload is incomplete: ${asset.name}`);
    assert(Number.isSafeInteger(asset.size) && asset.size > 0, `Invalid asset size: ${asset.name}`);
    return { id: asset.id, name: asset.name, size: asset.size };
}

async function inventory(client, releaseId) {
    return paginate(client.api, `/releases/${positiveInteger(releaseId, 'release ID')}/assets`);
}

async function resolveTag(client, tag) {
    assert(typeof tag === 'string' && /^v[0-9][^\s/\\]*$/.test(tag), 'Invalid production release tag.');
    let object = (await client.api(`/git/ref/tags/${encodeURIComponent(tag)}`)).object;
    const seen = new Set();
    for (let depth = 0; depth < 10; depth++) {
        sha(object?.sha);
        assert(!seen.has(object.sha), 'Cyclic release tag.');
        seen.add(object.sha);
        if (object.type === 'commit') return object.sha;
        assert(object.type === 'tag', 'Release tag does not resolve to a commit.');
        object = (await client.api(`/git/tags/${object.sha}`)).object;
    }
    throw new Error('Release tag nesting exceeds the supported limit.');
}

async function sourceFile(client, sourceSha, file) {
    sha(sourceSha);
    assert(['package.json', 'main.js'].includes(file), 'Unsupported production source file.');
    const value = await client.api(`/contents/${file}?ref=${sourceSha}`);
    assert(value.type === 'file' && value.encoding === 'base64' && typeof value.content === 'string', 'Invalid immutable source response.');
    const bytes = Buffer.from(value.content, 'base64');
    assert(bytes.length > 0 && bytes.length < MAX_EVIDENCE_SIZE, 'Invalid immutable source size.');
    return bytes;
}

function validateOriginRun(run, sourceSha, { currentRunId, currentRunAttempt } = {}) {
    assert(run.head_sha === sha(sourceSha) && run.head_branch === 'master' && run.path === '.github/workflows/main.yml' && ['push', 'workflow_dispatch'].includes(run.event), 'Evidence must originate in the matching master CI/CD run.');
    const current = run.id === currentRunId && run.run_attempt === currentRunAttempt && run.status === 'in_progress';
    assert(current || (run.status === 'completed' && run.conclusion === 'success'), 'The originating production run has not succeeded.');
    return run;
}

async function download(client, route, destination, { size, digest, maxSize = 2_000_000_000, artifact = false } = {}) {
    assert(/^\/(releases\/assets\/[1-9][0-9]*|actions\/artifacts\/[1-9][0-9]*\/zip)$/.test(route), 'Unsupported download route.');
    const response = await fetch(`https://api.github.com/repos/${client.repository}${route}`, {
        headers: { Authorization: `Bearer ${client.token}`, Accept: artifact ? 'application/vnd.github+json' : 'application/octet-stream', 'X-GitHub-Api-Version': API_VERSION },
        redirect: 'manual', signal: AbortSignal.timeout(60000)
    });
    let body = response;
    if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        assert(location && new URL(location).protocol === 'https:', 'Invalid GitHub download redirect.');
        // A signed blob URL must never receive the repository token.
        body = await fetch(location, { redirect: 'error', signal: AbortSignal.timeout(300000) });
    }
    assert(body.ok && body.body, 'Cannot download exact GitHub asset.');
    const declaredSize = Number(body.headers.get('content-length') || 0);
    assert(declaredSize <= maxSize, 'Download exceeds the allowed size.');
    await fs.mkdir(path.dirname(destination), { recursive: true });
    let length = 0;
    const hash = createHash('sha256');
    async function* bounded(source) {
        for await (const chunk of source) {
            length += chunk.length;
            assert(length <= maxSize && (size === undefined || length <= size), 'Downloaded asset exceeds its recorded size.');
            hash.update(chunk);
            yield chunk;
        }
    }
    await pipeline(bounded(Readable.fromWeb(body.body)), createWriteStream(destination, { flags: 'wx' }));
    const sha256 = hash.digest('hex');
    assert(size === undefined || length === size, 'Downloaded asset size mismatch.');
    assert(!digest || digest === `sha256:${sha256}`, 'Downloaded asset digest mismatch.');
    return { name: path.basename(destination), size: length, sha256 };
}

async function downloadAsset(client, asset, directory, maxSize) {
    const identity = assetIdentity(asset);
    const file = path.join(directory, identity.name);
    const actual = await download(client, `/releases/assets/${identity.id}`, file, { size: identity.size, digest: asset.digest, maxSize });
    return { ...identity, sha256: actual.sha256 };
}

async function readManifestArtifact(client, artifact, directory) {
    assert(!artifact.expired && /^sha256:[a-f0-9]{64}$/.test(artifact.digest), 'Packaging manifest artifact is expired or has no digest.');
    const file = path.join(directory, `${positiveInteger(artifact.id, 'manifest artifact ID')}.zip`);
    await download(client, `/actions/artifacts/${artifact.id}/zip`, file, { digest: artifact.digest, artifact: true, maxSize: MAX_EVIDENCE_SIZE });
    const listing = (await execute('unzip', ['-Z1', file], { maxBuffer: MAX_EVIDENCE_SIZE })).stdout.trim().split('\n');
    assert(listing.length === 1 && listing[0] === 'package-manifest.json', 'Unexpected packaging manifest archive contents.');
    return JSON.parse((await execute('unzip', ['-p', file, 'package-manifest.json'], { maxBuffer: MAX_EVIDENCE_SIZE })).stdout.replace(/^\uFEFF/, ''));
}

async function verifyAttestation(file, bundle, { workflow, sourceSha, sourceRef, runId, runAttempt }, executeCommand = execute) {
    const { stdout } = await executeCommand('gh', ['attestation', 'verify', file, '--bundle', bundle, '--repo', REPOSITORY, '--signer-workflow', `${REPOSITORY}/${workflow}`, '--signer-digest', sha(sourceSha), '--source-digest', sourceSha, '--source-ref', sourceRef, '--format', 'json'], { maxBuffer: MAX_EVIDENCE_SIZE });
    const verified = JSON.parse(stdout);
    assert(Array.isArray(verified) && verified.length > 0, 'No verified workflow attestation.');
    const expectedInvocation = `https://github.com/${REPOSITORY}/actions/runs/${positiveInteger(runId, 'attested run ID')}/attempts/${positiveInteger(runAttempt, 'attested run attempt')}`;
    assert(verified.some(item => item.verificationResult?.statement?.predicate?.runDetails?.metadata?.invocationId === expectedInvocation), 'Attestation belongs to another workflow invocation.');
    return true;
}

async function assertUnchanged(client, release, assets) {
    const latest = await client.api(`/releases/${release.id}`);
    assert(latest.draft === true && latest.tag_name === release.tag_name && await resolveTag(client, latest.tag_name) === release.sourceSha, 'Draft identity or tag changed during verification.');
    const after = await inventory(client, release.id);
    const normalize = values => values.map(asset => ({ ...assetIdentity(asset), digest: asset.digest || null })).sort((a, b) => a.id - b.id);
    assert(JSON.stringify(normalize(assets)) === JSON.stringify(normalize(after)), 'Release assets changed during verification.');
}

async function uploadFile(client, releaseId, file) {
    const name = safeName(path.basename(file));
    const bytes = await fs.readFile(file);
    assert(bytes.length > 0 && bytes.length <= MAX_EVIDENCE_SIZE, 'Invalid evidence attachment size.');
    const existing = (await inventory(client, releaseId)).find(asset => asset.name === name);
    if (existing) {
        assert(existing.size === bytes.length && existing.digest === `sha256:${createHash('sha256').update(bytes).digest('hex')}`, 'An evidence attachment with different bytes already exists; never overwrite evidence.');
        return existing;
    }
    const response = await fetch(`https://uploads.github.com/repos/${client.repository}/releases/${positiveInteger(releaseId, 'release ID')}/assets?name=${encodeURIComponent(name)}`, {
        method: 'POST', headers: { Authorization: `Bearer ${client.token}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': API_VERSION }, body: bytes,
        redirect: 'error', signal: AbortSignal.timeout(60000)
    });
    assert(response.ok, `Cannot attach production evidence (${response.status}).`);
    return response.json();
}

module.exports = { REPOSITORY, MAX_EVIDENCE_SIZE, releaseClient, assetIdentity, inventory, resolveTag, sourceFile, validateOriginRun, download, downloadAsset, readManifestArtifact, verifyAttestation, assertUnchanged, uploadFile, describe };
