const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { resolveTag, validateOriginRun, download, verifyAttestation, assertUnchanged, readManifestArtifact, uploadFile } = require('./production-release-api.cjs');
const { evidenceNames, artifactIdentity, validateEvidence, preflightDraft, recoverIncompleteEvidence, ensureProductionTag, evidenceEnvelope, decodeEnvelope, attachEvidence } = require('./production-evidence.cjs');
const { expectedFiles } = require('./production-audit-contract.cjs');
const { prepareAudit, validateInspection, collectAudit, isLegacyBaseline } = require('./audit-production-draft.cjs');

const sourceSha = 'a'.repeat(40), baselineSha = 'b'.repeat(40);
const hash = value => createHash('sha256').update(value).digest('hex');
async function temporary(t) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifi-production-audit-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    return directory;
}

function fixture() {
    const version = '0.17.0-beta', baselineVersion = '0.16.4-beta';
    const payloads = new Map();
    let id = 100;
    const filesFor = value => expectedFiles(value).map(name => {
        const bytes = Buffer.from(`original uploaded ${name}`);
        const asset = { id: id++, name, size: bytes.length, digest: `sha256:${hash(bytes)}`, sha256: hash(bytes), state: 'uploaded' };
        payloads.set(asset.id, bytes);
        return asset;
    });
    const targetFiles = filesFor(version), baselineFiles = filesFor(baselineVersion);
    const runId = 901, runAttempt = 1;
    const packages = ['windows', 'mac', 'linux'].map(platform => {
        const belongs = name => platform === 'windows' ? name.endsWith('.exe') || name.endsWith('.exe.blockmap') || name === 'latest.yml' : platform === 'mac' ? /\.(dmg|zip)(\.blockmap)?$/.test(name) || name === 'latest-mac.yml' : /\.AppImage$|\.tar\.gz$/.test(name) || name === 'latest-linux.yml';
        const artifact = suffix => ({ id: id++, name: `release-${platform}-${suffix}`, digest: `sha256:${'c'.repeat(64)}`, workflow_run: { id: runId, head_sha: sourceSha } });
        return { artifact: artifact('artifact'), manifestArtifact: artifact('manifest'), manifest: {
            schemaVersion: 1, kind: 'desktop-package', platform, role: 'production', sourceSha, workflowSha: sourceSha,
            version, sourceVersion: version, electronVersion: '39.8.10', qa: false, qaInstrumentation: null,
            configurationSha256: 'd'.repeat(64), runner: { os: platform, arch: platform === 'mac' ? 'ARM64' : 'X64', image: 'recorded', imageVersion: 'recorded' },
            verification: platform === 'windows' ? { platform, verified: true, signature: true, publisher: 'Production Publisher' } : platform === 'mac' ? { platform, verified: true, signature: true, universal: true, notarization: 'Accepted', stapling: { app: true, dmg: true, zip: true } } : { platform, verified: true, metadata: true },
            files: targetFiles.filter(file => belongs(file.name)).map(({ name, size, sha256 }) => ({ name, size, sha256 }))
        } };
    });
    const evidence = { schemaVersion: 1, kind: 'desktop-production-evidence', repository: 'ORNL-AMO/VERIFI', releaseId: 50, tag: `v${version}`, version, sourceSha, workflowSha: sourceSha, run: { id: runId, attempt: runAttempt }, packages, assets: targetFiles.map(({ id, name, size, sha256 }) => ({ id, name, size, sha256 })) };
    const names = evidenceNames(runId, runAttempt);
    const attachment = (name, bytes) => {
        const asset = { id: id++, name, size: bytes.length, digest: `sha256:${hash(bytes)}`, state: 'uploaded' };
        payloads.set(asset.id, bytes); return asset;
    };
    const assets = [...targetFiles, attachment(names.evidence, Buffer.from(JSON.stringify(evidenceEnvelope(JSON.stringify(evidence), '{"signed":"verified by injected verifier"}'))))];
    const target = { id: 50, tag_name: `v${version}`, draft: true, prerelease: false };
    const baseline = { id: 40, tag_name: `v${baselineVersion}`, draft: false, prerelease: false };
    const run = { id: runId, run_attempt: 1, head_sha: sourceSha, head_branch: 'master', path: '.github/workflows/main.yml', event: 'push', status: 'completed', conclusion: 'success' };
    const sourcePackage = { name: 'verifi', version, main: 'main.js', build: { appId: 'gov.ornl.amo', productName: 'VERIFI' } };
    const api = async route => {
        if (route === '/releases/50') return structuredClone(target);
        if (route === '/releases/latest') return structuredClone(baseline);
        if (route.startsWith('/releases/50/assets')) return structuredClone(assets);
        if (route.startsWith('/releases/40/assets')) return structuredClone(baselineFiles);
        if (route === `/actions/runs/${runId}`) return structuredClone(run);
        if (route.startsWith('/git/ref/tags/')) return { object: { type: 'commit', sha: route.endsWith(encodeURIComponent(target.tag_name)) ? sourceSha : baselineSha } };
        if (route.startsWith('/contents/package.json?ref=')) return { type: 'file', encoding: 'base64', content: Buffer.from(JSON.stringify(route.endsWith(sourceSha) ? sourcePackage : { ...sourcePackage, version: baselineVersion })).toString('base64') };
        if (route === `/contents/main.js?ref=${sourceSha}`) return { type: 'file', encoding: 'base64', content: Buffer.from('original main entrypoint').toString('base64') };
        throw new Error(`Unexpected route ${route}`);
    };
    const legacyPolicy = { schemaVersion: 1, repository: 'ORNL-AMO/VERIFI', legacyBaselines: [{ releaseId: baseline.id, tag: baseline.tag_name, sourceSha: baselineSha }] };
    return { evidence, assets, targetFiles, baselineFiles, target, baseline, run, sourcePackage, payloads, api, legacyPolicy, client: { repository: 'ORNL-AMO/VERIFI', token: 'test-token', api } };
}

test('resolves annotated tags to immutable commits and refuses cycles or noncommit tags', async () => {
    const client = { api: async route => route.startsWith('/git/ref/') ? { object: { type: 'tag', sha: baselineSha } } : { object: { type: 'commit', sha: sourceSha } } };
    assert.equal(await resolveTag(client, 'v0.17.0-beta'), sourceSha);
    client.api = async () => ({ object: { type: 'tag', sha: sourceSha } });
    await assert.rejects(resolveTag(client, 'v0.17.0-beta'), /Cyclic/);
    client.api = async () => ({ object: { type: 'tree', sha: sourceSha } });
    await assert.rejects(resolveTag(client, 'v0.17.0-beta'), /commit/);
});

test('accepts only the exact production workflow, source and successful origin or current packaging attempt', () => {
    const { run } = fixture();
    validateOriginRun(run, sourceSha);
    for (const change of [{ head_sha: baselineSha }, { head_branch: 'develop' }, { path: '.github/workflows/desktop_prerelease.yml' }, { event: 'pull_request' }, { conclusion: 'failure' }]) assert.throws(() => validateOriginRun({ ...run, ...change }, sourceSha));
    validateOriginRun({ ...run, status: 'in_progress', conclusion: null }, sourceSha, { currentRunId: run.id, currentRunAttempt: 1 });
    assert.throws(() => validateOriginRun({ ...run, status: 'in_progress' }, sourceSha, { currentRunId: run.id, currentRunAttempt: 2 }));
});

test('downloads exact asset IDs, validates bytes and never forwards the token to blob storage', async t => {
    const directory = await temporary(t), bytes = Buffer.from('final signed installer');
    const requests = [];
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        requests.push({ url, options });
        return requests.length % 2 === 1 ? new Response(null, { status: 302, headers: { location: 'https://release-assets.githubusercontent.com/signed-blob' } }) : new Response(bytes);
    });
    const client = { repository: 'ORNL-AMO/VERIFI', token: 'secret-token' };
    const file = await download(client, '/releases/assets/123', path.join(directory, 'installer.exe'), { size: bytes.length, digest: `sha256:${hash(bytes)}` });
    assert.equal(file.sha256, hash(bytes));
    assert.equal(requests[0].options.headers.Authorization, 'Bearer secret-token');
    assert.equal(requests[1].options.headers, undefined);
    await assert.rejects(download(client, '/releases/assets/123', path.join(directory, 'corrupt.exe'), { size: bytes.length, digest: `sha256:${'0'.repeat(64)}` }), /digest mismatch/);
    await assert.rejects(download(client, '/releases/assets/123', path.join(directory, 'too-large.exe'), { size: 1 }), /recorded size/);
    await assert.rejects(download(client, '//other.example', path.join(directory, 'no-file')), /route/);
});

test('constrains verified attestations to the exact repository, reusable workflow, source and invocation', async () => {
    const policy = { workflow: '.github/workflows/release_desktop.yml', sourceSha, sourceRef: 'refs/heads/master', runId: 901, runAttempt: 1 };
    const statement = invocationId => JSON.stringify([{ verificationResult: { statement: { predicate: { runDetails: { metadata: { invocationId } } } } } }]);
    const invocation = 'https://github.com/ORNL-AMO/VERIFI/actions/runs/901/attempts/1';
    await verifyAttestation('evidence.json', 'bundle.json', policy, async (command, args) => {
        assert.equal(command, 'gh');
        assert.equal(args[args.indexOf('--signer-digest') + 1], sourceSha);
        assert.equal(args[args.indexOf('--source-ref') + 1], 'refs/heads/master');
        assert.equal(args[args.indexOf('--signer-workflow') + 1], 'ORNL-AMO/VERIFI/.github/workflows/release_desktop.yml');
        return { stdout: statement(invocation) };
    });
    await assert.rejects(verifyAttestation('evidence.json', 'bundle.json', policy, async () => ({ stdout: statement(`${invocation}0`) })), /another workflow invocation/);
    await assert.rejects(verifyAttestation('evidence.json', 'bundle.json', policy, async () => { throw new Error('signature verification failed'); }), /signature verification failed/);
});

test('durable native evidence rejects substituted artifacts, QA roles and file mutations', () => {
    const { evidence } = fixture();
    validateEvidence(evidence, { releaseId: 50, sourceSha, version: '0.17.0-beta', runId: 901 });
    for (const mutate of [value => value.packages[0].artifact.workflow_run.id++, value => value.packages[0].manifest.qa = true, value => value.assets[0].sha256 = '0'.repeat(64), value => value.packages[0].manifest.verification.publisher = '', value => value.sourceSha = baselineSha]) {
        const altered = structuredClone(evidence); mutate(altered);
        assert.throws(() => validateEvidence(altered));
    }
    assert.throws(() => artifactIdentity({ ...evidence.packages[0].artifact, expired: true }, 901, sourceSha));
});

test('only digest-matching original manifest archives can supply native verification evidence', async t => {
    const directory = await temporary(t);
    const zip = new (require('jszip'))();
    zip.file('package-manifest.json', JSON.stringify({ kind: 'desktop-package', verified: true }));
    const bytes = await zip.generateAsync({ type: 'nodebuffer' });
    const artifact = { id: 10, expired: false, digest: `sha256:${hash(bytes)}` };
    t.mock.method(globalThis, 'fetch', async () => new Response(bytes));
    const client = { repository: 'ORNL-AMO/VERIFI', token: 'test-token' };
    assert.equal((await readManifestArtifact(client, artifact, directory)).kind, 'desktop-package');
    await assert.rejects(readManifestArtifact(client, { ...artifact, id: 11, digest: `sha256:${'0'.repeat(64)}` }, directory), /digest mismatch/);
    const other = new (require('jszip'))(); other.file('unexpected.json', '{}');
    const otherBytes = await other.generateAsync({ type: 'nodebuffer' });
    t.mock.method(globalThis, 'fetch', async () => new Response(otherBytes));
    await assert.rejects(readManifestArtifact(client, { ...artifact, id: 12, digest: `sha256:${hash(otherBytes)}` }, directory), /archive contents/);
});

test('evidence uploads are idempotent for identical files and never overwrite conflicting evidence', async t => {
    const directory = await temporary(t), file = path.join(directory, 'production-evidence-901-1.json');
    const bytes = Buffer.from('{"immutable":"evidence"}'); await fs.writeFile(file, bytes);
    const existing = { id: 5, name: path.basename(file), size: bytes.length, digest: `sha256:${hash(bytes)}` };
    const client = { repository: 'ORNL-AMO/VERIFI', token: 'test-token', api: async () => [existing] };
    let requests = 0;
    t.mock.method(globalThis, 'fetch', async () => { requests++; throw new Error('No replacement upload is permitted'); });
    assert.equal((await uploadFile(client, 50, file)).id, existing.id);
    existing.digest = `sha256:${'0'.repeat(64)}`;
    await assert.rejects(uploadFile(client, 50, file), /never overwrite/);
    assert.equal(requests, 0);
});

test('preflight refuses published or foreign-tag releases before distribution upload', async () => {
    const version = require('../../package.json').version;
    const env = { GITHUB_REF: 'refs/heads/master', GITHUB_SHA: sourceSha };
    const client = { api: async route => route.startsWith('/releases?') ? [{ id: 50, tag_name: `v${version}`, draft: false, prerelease: false }] : { object: { type: 'commit', sha: baselineSha } } };
    await assert.rejects(preflightDraft(client, env), /already published/);
    client.api = async route => route.startsWith('/releases?') ? [{ id: 50, tag_name: `v${version}`, draft: true, prerelease: false }] : route.startsWith('/git/matching-refs/') ? [{ ref: `refs/tags/v${version}` }] : { object: { type: 'commit', sha: baselineSha } };
    await assert.rejects(preflightDraft(client, env), /another commit/);
    await assert.rejects(preflightDraft(client, { ...env, GITHUB_REF: 'refs/heads/develop' }), /Only master/);
});

test('creates a real immutable version tag before a new draft and never moves an existing foreign tag', async () => {
    let created = false;
    const requests = [];
    const client = { api: async (route, options) => {
        requests.push({ route, options });
        if (route.startsWith('/git/matching-refs/')) return created ? [{ ref: 'refs/tags/v0.17.0-beta' }] : [];
        if (route === '/git/refs') { assert.equal(options.method, 'POST'); assert.deepEqual(JSON.parse(options.body), { ref: 'refs/tags/v0.17.0-beta', sha: sourceSha }); created = true; return {}; }
        assert(created, 'GitHub has no draft tag until it is explicitly created');
        return { object: { type: 'commit', sha: sourceSha } };
    } };
    await ensureProductionTag(client, '0.17.0-beta', sourceSha);
    await ensureProductionTag(client, '0.17.0-beta', sourceSha);
    assert.equal(requests.filter(request => request.options?.method === 'POST').length, 1);
    client.api = async route => route.startsWith('/git/matching-refs/') ? [{ ref: 'refs/tags/v0.17.0-beta' }] : { object: { type: 'commit', sha: baselineSha } };
    await assert.rejects(ensureProductionTag(client, '0.17.0-beta', sourceSha), /never move/);
});

test('a single evidence envelope retains exact signed subject and bundle bytes without orphan attachments', () => {
    const { evidence } = fixture();
    const subject = JSON.stringify(evidence, null, 2) + '\n', bundle = '{"signed":"bundle bytes"}\n';
    const envelope = evidenceEnvelope(subject, bundle);
    const decoded = decodeEnvelope(JSON.parse(JSON.stringify(envelope)));
    assert.equal(decoded.subject, subject); assert.equal(decoded.bundle, bundle);
    assert.deepEqual(decoded.evidence, evidence);
    assert.throws(() => decodeEnvelope({ ...envelope, bundle: '' }), /Missing evidence/);
});

test('legacy permission is bound to the approved historical release ID, tag and source', () => {
    const policy = require('./production-audit-policy.json');
    const [legacy] = policy.legacyBaselines;
    const release = { id: legacy.releaseId, tag_name: legacy.tag, sourceSha: legacy.sourceSha };
    assert.equal(isLegacyBaseline(release), true);
    for (const change of [{ id: legacy.releaseId + 1 }, { tag_name: 'v0.16.3-beta' }, { sourceSha }]) assert.equal(isLegacyBaseline({ ...release, ...change }), false);
});

test('a failed envelope upload can retry without leaving a separately uploaded orphan subject', async t => {
    const directory = await temporary(t), data = fixture(), names = evidenceNames(901, 1);
    const subject = path.join(directory, names.evidence), bundle = path.join(directory, names.bundle);
    await fs.writeFile(subject, JSON.stringify(data.evidence)); await fs.writeFile(bundle, '{"verified":"bundle"}');
    const client = { ...data.client, api: async route => route.startsWith('/releases/50/assets') ? structuredClone(data.targetFiles) : data.api(route) };
    const uploads = []; let fail = true;
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(new URL(url).hostname, 'uploads.github.com'); assert.equal(options.method, 'POST');
        const envelope = JSON.parse(options.body.toString('utf8'));
        assert.equal(decodeEnvelope(envelope).evidence.releaseId, 50);
        uploads.push(new URL(url).searchParams.get('name'));
        return fail ? new Response('{}', { status: 500 }) : new Response('{"id":999}', { status: 201 });
    });
    await assert.rejects(attachEvidence(client, 50, subject, bundle, async () => {}), /Cannot attach/);
    fail = false;
    await attachEvidence(client, 50, subject, bundle, async () => {});
    assert.deepEqual(uploads, [names.evidence, names.evidence]);
});

test('the production writer recovers only empty starter evidence from a failed matching trusted attempt', async () => {
    const starter = { id: 500, name: 'production-evidence-901-1.json', state: 'starter', size: 0, uploader: { login: 'github-actions[bot]' } };
    const assets = [starter, { ...starter, id: 501, name: 'VERIFI.exe' }, { ...starter, id: 502, state: 'uploaded', size: 50 }, { ...starter, id: 503, uploader: { login: 'someone' } }];
    const deleted = [];
    const origin = { id: 901, run_attempt: 1, head_sha: sourceSha, head_branch: 'master', path: '.github/workflows/main.yml', event: 'push', status: 'completed', conclusion: 'failure' };
    const client = { api: async (route, options) => {
        if (route.startsWith('/releases/50/assets')) return assets;
        if (route === '/actions/runs/901/attempts/1') return origin;
        assert.equal(options?.method, 'DELETE'); deleted.push(route);
    } };
    await recoverIncompleteEvidence(client, 50, sourceSha);
    assert.deepEqual(deleted, ['/releases/assets/500']);
    for (const change of [{ head_sha: baselineSha }, { head_branch: 'develop' }, { conclusion: 'success' }, { run_attempt: 2 }, { path: '.github/workflows/desktop_prerelease.yml' }]) {
        Object.assign(origin, { id: 901, run_attempt: 1, head_sha: sourceSha, head_branch: 'master', path: '.github/workflows/main.yml', event: 'push', status: 'completed', conclusion: 'failure' }, change);
        await assert.rejects(recoverIncompleteEvidence(client, 50, sourceSha), /inspect it manually/);
    }
    assert.equal(deleted.length, 1);
});

test('evidence attachment keeps its prepared release ID/tag and production flags pinned', async t => {
    const directory = await temporary(t), data = fixture(), names = evidenceNames(901, 1);
    const subject = path.join(directory, names.evidence), bundle = path.join(directory, names.bundle);
    await fs.writeFile(subject, JSON.stringify(data.evidence)); await fs.writeFile(bundle, '{"verified":"bundle"}');
    const client = { ...data.client, api: async route => route.startsWith('/releases/50/assets') ? structuredClone(data.targetFiles) : data.api(route) };
    let uploads = 0;
    t.mock.method(globalThis, 'fetch', async () => { uploads++; throw new Error('Changed draft must never receive evidence.'); });
    const original = structuredClone(data.target);
    for (const change of [{ tag_name: 'v0.17.0-beta-alias' }, { prerelease: true }, { draft: false }, { id: 51 }]) {
        Object.assign(data.target, original, change);
        await assert.rejects(attachEvidence(client, 50, subject, bundle, async () => {}), /Draft identity/);
    }
    assert.equal(uploads, 0);
});

test('an older public release without evidence cannot silently become an unapproved legacy baseline', async t => {
    const directory = await temporary(t), data = fixture();
    t.mock.method(globalThis, 'fetch', async url => new Response(data.payloads.get(Number(url.split('/').at(-1)))));
    await assert.rejects(prepareAudit(data.client, 50, 901, directory, { GITHUB_RUN_ID: '1000', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: baselineSha }, async () => {}), /not an approved legacy/);
});

test('read-only preparation audits exact bytes with a legacy public baseline after packaging artifacts expire', async t => {
    const directory = await temporary(t), data = fixture(), requests = [];
    t.mock.method(globalThis, 'fetch', async url => {
        requests.push(url);
        const id = Number(url.split('/').at(-1));
        assert(data.payloads.has(id));
        return new Response(data.payloads.get(id));
    });
    let attestations = 0;
    const plan = await prepareAudit(data.client, 50, 901, directory, { GITHUB_RUN_ID: '1000', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: baselineSha }, async () => { attestations++; }, data.legacyPolicy);
    assert.equal(plan.mode, 'preview'); assert.equal(plan.baseline.legacy, true);
    assert.equal(plan.baseline.selection, 'public-latest');
    assert.equal(plan.target.assets.length, 11); assert.equal(plan.baseline.assets.length, 11);
    assert.equal(attestations, 1); assert.equal(requests.length, 23);
    assert(!requests.some(url => url.includes('/actions/artifacts/')));
    assert.equal((await fs.readdir(path.join(directory, 'windows'))).length, 4);
    for (const platform of ['windows', 'mac', 'linux']) assert.equal(JSON.parse(await fs.readFile(path.join(directory, platform, 'audit-plan.json'))).origin.sourceSha, sourceSha);
});

test('preparation refuses replaced uploaded bytes even when their names and sizes are unchanged', async t => {
    const data = fixture(), directory = await temporary(t);
    const originalBytes = data.payloads.get(data.assets[0].id);
    data.assets[0].id += 500;
    data.payloads.set(data.assets[0].id, originalBytes);
    t.mock.method(globalThis, 'fetch', async url => new Response(data.payloads.get(Number(url.split('/').at(-1)))));
    await assert.rejects(prepareAudit(data.client, 50, 901, directory, { GITHUB_RUN_ID: '1000', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: baselineSha }, async () => {}), /inventory|mismatch|changed|asset/i);
});

test('unknown attachments cannot disappear from the inspected draft inventory', async t => {
    const data = fixture(), directory = await temporary(t);
    data.assets.push({ id: 8000, name: 'untracked-release-document.pdf', size: 50, state: 'uploaded' });
    t.mock.method(globalThis, 'fetch', async url => new Response(data.payloads.get(Number(url.split('/').at(-1)))));
    await assert.rejects(prepareAudit(data.client, 50, 901, directory, { GITHUB_RUN_ID: '1000', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: baselineSha }, async () => {}), /unknown|unexpected|inventory|untracked/i);
});

test('preparation fails if attested evidence is invalid, target source differs or latest is unsuitable', async t => {
    for (const variant of ['attestation', 'source', 'baseline']) {
        const data = fixture(), directory = await temporary(t);
        if (variant === 'source') data.run.head_sha = baselineSha;
        if (variant === 'baseline') data.baseline.id = 50;
        t.mock.method(globalThis, 'fetch', async url => new Response(data.payloads.get(Number(url.split('/').at(-1)))));
        await assert.rejects(prepareAudit(data.client, 50, 901, directory, { GITHUB_RUN_ID: '1000', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: baselineSha }, async () => { if (variant === 'attestation') throw new Error('invalid signature'); }));
        t.mock.restoreAll();
    }
});

test('a replaced asset or publication during verification cannot pass the final draft check', async () => {
    const data = fixture(), release = { ...data.target, sourceSha };
    await assertUnchanged(data.client, release, data.assets);
    await assert.rejects(assertUnchanged(data.client, release, data.assets.map((asset, index) => index ? asset : { ...asset, id: 9999 })), /assets changed/);
    data.target.draft = false;
    await assert.rejects(assertUnchanged(data.client, release, data.assets), /Draft identity/);
});

test('a preview cannot silently pass with missing, failed or foreign inspection results', async t => {
    const data = fixture(), directory = await temporary(t);
    t.mock.method(globalThis, 'fetch', async url => new Response(data.payloads.get(Number(url.split('/').at(-1)))));
    const plan = await prepareAudit(data.client, 50, 901, directory, { GITHUB_RUN_ID: '1000', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: baselineSha }, async () => {}, data.legacyPolicy);
    const result = { schemaVersion: 1, kind: 'desktop-production-inspection', platform: 'windows', status: 'passed', target: plan.target, origin: plan.origin, audit: plan.audit, checks: { metadata: true, packagedConfiguration: true }, distributions: [{ name: data.targetFiles.find(file => file.name.endsWith('.exe')).name }] };
    validateInspection(plan, result, 'windows');
    assert.throws(() => validateInspection(plan, { ...result, status: 'failed' }, 'windows'));
    assert.throws(() => validateInspection(plan, { ...result, audit: { ...plan.audit, runId: 9000 } }, 'windows'), /invocation/);
    const results = path.join(directory, 'results'); await fs.mkdir(path.join(results, 'windows'), { recursive: true });
    await fs.writeFile(path.join(results, 'windows/inspection.json'), JSON.stringify(result));
    await assert.rejects(collectAudit(data.client, directory, results));
    const report = JSON.parse(await fs.readFile(path.join(directory, 'audit-preview.json')));
    assert.equal(report.status, 'failed'); assert.equal(report.publicationEligible, false); assert.equal(report.mode, 'preview');
});

test('a complete preview passes only while the exact draft and pinned production latest remain unchanged', async t => {
    const data = fixture(), directory = await temporary(t);
    t.mock.method(globalThis, 'fetch', async url => new Response(data.payloads.get(Number(url.split('/').at(-1)))));
    const plan = await prepareAudit(data.client, 50, 901, directory, { GITHUB_RUN_ID: '1000', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: baselineSha }, async () => {}, data.legacyPolicy);
    const results = path.join(directory, 'results');
    for (const { manifest } of data.evidence.packages) {
        const output = path.join(results, manifest.platform); await fs.mkdir(output, { recursive: true });
        const result = { schemaVersion: 1, kind: 'desktop-production-inspection', platform: manifest.platform, status: 'passed', target: plan.target, origin: plan.origin, audit: plan.audit, checks: { metadata: true, packagedConfiguration: true }, distributions: manifest.files.filter(file => /\.(exe|dmg|zip|AppImage|tar\.gz)$/.test(file.name)).map(file => ({ name: file.name })) };
        await fs.writeFile(path.join(output, 'inspection.json'), JSON.stringify(result));
    }
    const report = await collectAudit(data.client, directory, results);
    assert.equal(report.status, 'passed'); assert.equal(report.publicationEligible, false);
    const pinnedTag = data.target.tag_name;
    data.target.tag_name = 'v0.17.0-beta-alias';
    await assert.rejects(collectAudit(data.client, directory, results), /Draft identity/);
    data.target.tag_name = pinnedTag;
    data.target.prerelease = true;
    await assert.rejects(collectAudit(data.client, directory, results), /Draft identity/);
    data.target.prerelease = false;
    data.baseline.id = 41;
    await assert.rejects(collectAudit(data.client, directory, results), /Production latest changed/);
    assert.equal(JSON.parse(await fs.readFile(path.join(directory, 'audit-preview.json'))).status, 'failed');
});

test('production workflow retains attested evidence while the staged preview has no release write or publishing path', async () => {
    const yaml = require('js-yaml');
    const root = path.join(__dirname, '../..');
    const load = async file => yaml.load(await fs.readFile(path.join(root, '.github/workflows', file), 'utf8'));
    const main = await load('main.yml'), release = await load('release_desktop.yml'), audit = await load('audit_production_draft.yml');
    assert.deepEqual(main.jobs.desktop.needs, ['release_policy', 'test']);
    assert.match(main.jobs.web_deploy.if, /needs\.desktop\.result == 'success'/);
    assert.equal(release.jobs.release.permissions['attestations'], 'write');
    const steps = release.jobs.release.steps;
    assert(steps.findIndex(step => step.run?.includes('production-evidence.cjs preflight')) < steps.findIndex(step => step.id === 'release'));
    assert(steps.findIndex(step => step.run?.includes('production-evidence.cjs ensure-tag')) < steps.findIndex(step => step.id === 'release'));
    assert(steps.findIndex(step => step.id === 'evidence') > steps.findIndex(step => step.id === 'release'));
    assert(steps.some(step => step.uses === 'actions/attest@v4'));
    assert(!Object.values(release.jobs).some(job => job.uses?.includes('audit_production_draft')));
    assert(audit.on.workflow_dispatch); assert.equal(audit.on.release, undefined);
    for (const job of Object.values(audit.jobs)) {
        assert(!Object.values(job.permissions).includes('write'));
        for (const step of job.steps || []) assert(!/gh release|production-evidence\.cjs attach|dist-nopublish|sign_windows|quitAndInstall/.test(step.run || ''));
    }
    assert.equal(audit.jobs.inspect.strategy['fail-fast'], false);
    assert.deepEqual(audit.jobs.inspect.strategy.matrix.include.map(item => item.platform).sort(), ['linux', 'mac', 'windows']);
    assert.match(audit.jobs.summarize.if, /always\(\)/);
});
