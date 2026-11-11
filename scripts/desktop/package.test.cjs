const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { packageConfig } = require('./package.cjs');
const { QA_IDENTITY } = require('./qa-contract.cjs');

test('QA packaging isolates identity/feed/version while production retains its entrypoint and rejects QA contamination', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifi-qa-config-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    await fs.writeFile(path.join(directory, 'package.json'), JSON.stringify({ main: 'main.js', version: '0.16.4-beta' }));
    const production = await packageConfig(directory, 'mac');
    assert.equal(production.extraMetadata, undefined);
    assert.equal(production.appId, undefined);
    assert.equal(production.publish[0].provider, 'github');
    const before = { source: process.env.DESKTOP_SOURCE_SHA, workflow: process.env.DESKTOP_WORKFLOW_SHA };
    process.env.DESKTOP_SOURCE_SHA = 'a'.repeat(40); process.env.DESKTOP_WORKFLOW_SHA = 'b'.repeat(40);
    t.after(() => {
        for (const [key, value] of [['DESKTOP_SOURCE_SHA', before.source], ['DESKTOP_WORKFLOW_SHA', before.workflow]]) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value;
        }
    });
    const qa = await packageConfig(directory, 'mac', '0.0.32');
    const { validateConfiguration } = require('app-builder-lib/out/util/config/config');
    const debug = { isEnabled: false, add() {} };
    await validateConfiguration(production, debug);
    await validateConfiguration(qa, debug);
    assert.equal(qa.extraMetadata.main, 'desktop-qa-bootstrap.cjs');
    assert.equal(qa.extraMetadata.name, QA_IDENTITY.name);
    assert.equal(qa.extraMetadata.version, '0.0.32');
    assert.equal(qa.appId, QA_IDENTITY.appId);
    assert.equal(qa.publish[0].url, QA_IDENTITY.feed);
    assert.equal(qa.publish[0].provider, 'generic');
    assert.match(qa.extraMetadata.verifiQa.wrapperSha256, /^[a-f0-9]{64}$/);
    await assert.rejects(packageConfig(directory, 'mac'), /production package/);
    await assert.rejects(packageConfig(directory, 'mac', '1.0.0'), /QA version/);
});

test('QA bootstrap confines profile/debugging to QA and invokes the original application unchanged', async () => {
    const calls = [];
    const app = { setName: value => calls.push(['name', value]), getPath: () => '/disposable/appdata', setPath: (...args) => calls.push(['path', ...args]), setAppUserModelId: value => calls.push(['id', value]), commandLine: { appendSwitch: (...args) => calls.push(['switch', ...args]) } };
    const source = await fs.readFile(path.join(__dirname, 'qa-bootstrap.cjs'), 'utf8');
    const execute = (config, platform = 'darwin') => vm.runInNewContext(source, { process: { platform }, require: name => {
        if (name === 'electron') return { app };
        if (name === 'node:path') return path;
        if (name === './desktop-qa-config.json') return config;
        assert.equal(name, './main.js'); calls.push(['original-main']);
    } });
    execute(QA_IDENTITY);
    assert(calls.some(value => value[0] === 'path' && value[2] === path.join('/disposable/appdata', QA_IDENTITY.name)));
    assert(calls.some(value => value[1] === 'remote-debugging-address' && value[2] === '127.0.0.1'));
    assert(!calls.some(value => JSON.stringify(value).includes('no-sandbox')));
    assert.deepEqual(calls.at(-1), ['original-main']);
    assert(!calls.some(value => value[0] === 'id'));
    execute(QA_IDENTITY, 'win32');
    assert(calls.some(value => value[0] === 'id' && value[1] === QA_IDENTITY.appId));
    assert.throws(() => execute({ ...QA_IDENTITY, appId: 'gov.ornl.amo' }), /Invalid desktop QA/);
});

test('production publication remains downstream of all package verification and draft creation', async () => {
    const yaml = require('js-yaml');
    const root = path.join(__dirname, '../..');
    const load = async file => yaml.load(await fs.readFile(path.join(root, '.github/workflows', file), 'utf8'));
    const main = await load('main.yml'), release = await load('release_desktop.yml'), packaging = await load('package_desktop.yml'), qa = await load('desktop_prerelease.yml');
    assert.match(main.jobs.desktop.if, /master/);
    assert.match(main.jobs.web_deploy.if, /needs\.desktop\.result == 'success'/);
    assert.deepEqual(main.jobs.desktop.needs, ['release_policy', 'test']);
    assert.equal(release.jobs.release.needs, 'package');
    const publish = release.jobs.release.steps.find(step => step.uses?.startsWith('softprops/action-gh-release'));
    assert.equal(publish.with.draft, true); assert.equal(publish.with.target_commitish, '${{ github.sha }}');
    assert.deepEqual(packaging.jobs.sign_windows.needs, 'native');
    assert.deepEqual(packaging.jobs.finalize_windows.needs, 'sign_windows');
    assert.equal(qa.jobs.approve.environment, 'desktop-qa-signing');
    assert.deepEqual(qa.jobs.package.needs, ['resolve', 'approve']);
    assert.equal(qa.jobs.package.with['retention-days'], 14);
    assert(!Object.values(qa.jobs).some(job => job.steps?.some(step => step.uses?.startsWith('softprops/action-gh-release'))));
});
