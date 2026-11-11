const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { QA_IDENTITY, describe } = require('../qa-contract.cjs');
const { createFeed } = require('./feed.cjs');
const { profilePath, install, verifyProcess, processAlive, platformName } = require('./platform.cjs');
const { createFixture, snapshot, assertRelationships, assertSeededValues } = require('./fixture.cjs');

async function until(label, read, timeout = 120000) {
    const deadline = Date.now() + timeout;
    let lastError;
    while (Date.now() < deadline) {
        try { const value = await read(); if (value) return value; } catch (error) { lastError = error; }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
}

function validateRuntime(runtime, item, profile) {
    assert.equal(runtime.schemaVersion, 1);
    assert.equal(runtime.profile, profile);
    assert.equal(runtime.version, item.manifest.version);
    assert.equal(runtime.electron, item.manifest.electronVersion);
    assert.equal(runtime.packaged, true);
    assert.equal(runtime.provenance.sourceSha, item.manifest.sourceSha);
    assert.equal(runtime.provenance.instrumentationVersion, 2);
    assert.deepEqual(runtime.security, { contextIsolation: true, nodeIntegration: false, sandbox: true });
    assert.match(runtime.archiveSha256, /^[a-f0-9]{64}$/);
    assert(Number.isInteger(runtime.pid) && runtime.pid > 0 && typeof runtime.nonce === 'string');
    return runtime;
}

async function navigate(page, route) {
    await page.evaluate(value => { location.hash = `#${value}`; }, route);
}

async function acknowledgeBackup(page) {
    const modal = page.locator('app-electron-backup-file .popup.open');
    if (await modal.isVisible()) {
        // Only acknowledge a verified up-to-date file, never dismiss a conflict.
        if (await modal.getByText(/up to date with the latest backup file/i).isVisible()) await modal.getByRole('button', { name: 'Do Nothing', exact: true }).click();
    }
}

async function backupAmount(file, predictorGuid) {
    const value = JSON.parse(await fs.readFile(file, 'utf8'));
    return value.predictorDataV2.find(row => row.predictorId === predictorGuid && row.year === 2024 && row.month === 1)?.amount;
}

async function runScenario({ plan, from, to, scenario, evidence, installRoot }) {
    await fs.mkdir(evidence, { recursive: true });
    const profile = profilePath();
    const result = { schemaVersion: 1, kind: 'desktop-installed-test', status: 'failed', platform: platformName, scenario,
        candidateSha: plan.candidateSha, baselineSha: plan.builds[0].sourceSha, packageRunId: plan.runId,
        from: { sourceSha: from.manifest.sourceSha, version: from.manifest.version, artifactId: from.artifactId },
        to: { sourceSha: to.manifest.sourceSha, version: to.manifest.version, artifactId: to.artifactId },
        phases: [], guards: {}, startedAt: new Date().toISOString() };
    const phase = async (name, action) => {
        const record = { name, startedAt: new Date().toISOString(), status: 'running' }; result.phases.push(record);
        try { const value = await action(); record.status = 'passed'; return value; }
        catch (error) { record.status = 'failed'; throw error; }
        finally { record.completedAt = new Date().toISOString(); }
    };
    let feed, browser, page, ownedProfile = false;
    const observedPids = new Map();
    const appLog = path.join(evidence, 'application.log');
    const runtimeFile = path.join(profile, 'desktop-qa-runtime.json');
    const readRuntime = async item => {
        const runtime = validateRuntime(JSON.parse(await fs.readFile(runtimeFile, 'utf8')), item, profile);
        const installedPath = platformName === 'linux' ? runtime.appImage : runtime.executable;
        assert(installedPath && path.resolve(installedPath).startsWith(path.resolve(installRoot) + path.sep), 'Runtime is outside the disposable installation.');
        await verifyProcess(runtime); observedPids.set(runtime.pid, runtime); return runtime;
    };
    const connect = async traceName => {
        browser = await until('packaged Electron debugging endpoint', () => chromium.connectOverCDP(`http://127.0.0.1:${QA_IDENTITY.debugPort}`, { timeout: 2000 }));
        const context = browser.contexts()[0];
        page = await until('application page', () => context.pages().find(candidate => candidate.url().startsWith('file:')));
        page.setDefaultTimeout(30000);
        await context.tracing.start({ screenshots: true, snapshots: true });
        page.on('console', message => { fs.appendFile(path.join(evidence, 'renderer.log'), `${message.type()}: ${message.text()}\n`).catch(() => {}); });
        page.on('pageerror', error => { fs.appendFile(path.join(evidence, 'renderer.log'), `${error.stack}\n`).catch(() => {}); });
        browser.traceName = traceName;
        return page;
    };
    const stopTrace = async () => {
        if (browser?.isConnected()) await browser.contexts()[0].tracing.stop({ path: path.join(evidence, `${browser.traceName}.zip`) });
    };
    const screenshot = name => page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: true });
    const ready = async () => {
        await page.locator('app-loading .windowOverlay').waitFor({ state: 'hidden', timeout: 120000 });
        await page.locator('app-header').getByRole('button', { name: 'QA Update Account', exact: true }).waitFor();
    };
    let expected, before, after;
    try {
        await phase('create-disposable-profile', async () => {
            try { await fs.access(profile); throw new Error('QA profile already exists; refuse to reuse or remove unowned data.'); }
            catch (error) { if (error.code !== 'ENOENT') throw error; }
            await fs.mkdir(path.dirname(profile), { recursive: true });
            await fs.mkdir(profile); ownedProfile = true;
        });
        feed = await phase('start-isolated-feed', () => createFeed([from, to], { onRequest: record => { fs.appendFile(path.join(evidence, 'feed.jsonl'), JSON.stringify(record) + '\n').catch(() => {}); } }));
        feed.offer(from.manifest.version);
        const installed = await phase('install-baseline', () => install(from, installRoot, path.join(evidence, 'installer.log')));
        await phase('launch-baseline', async () => { const pid = await installed.launch(); observedPids.set(pid, { pid, executable: installed.executable }); await until('baseline runtime', () => readRuntime(from)); await connect('fixture-setup'); });
        const backup = path.join(profile, 'backups/account.json');
        await phase('import-fixture-through-ui', async () => {
            const file = path.join(evidence, 'fixture.json'); await fs.writeFile(file, JSON.stringify(createFixture(), null, 2));
            await page.getByRole('button', { name: 'Upload Backup', exact: true }).click();
            await page.locator('app-import-backup-modal input[type=file]').setInputFiles(file);
            await page.locator('app-import-backup-modal .popup.open').getByRole('button', { name: /Import Backup/ }).click();
            await until('imported GUID-linked data and values', async () => assertSeededValues(await snapshot(page)));
            await page.locator('app-loading').getByRole('button', { name: 'Done', exact: true }).click();
            await ready();
        });
        await phase('configure-real-backup', async () => {
            await fs.mkdir(path.dirname(backup), { recursive: true });
            await fs.writeFile(path.join(profile, 'desktop-qa-file-choice.json'), JSON.stringify({ savePath: backup }));
            await navigate(page, '/data-evaluation/account/settings');
            await page.getByRole('button', { name: 'Select Automatic Backup Location', exact: true }).click();
            await until('durable automatic backup', async () => JSON.parse(await fs.readFile(backup, 'utf8')).account.name === 'QA Update Account');
            await page.locator('app-account-settings #never').check();
            expected = await until('committed backup settings', async () => { const data = assertRelationships(await snapshot(page)); return data.accounts[0].dataBackupFilePath === backup && data.accounts[0].archiveOption === 'never' && data; });
            assert.equal(expected.accounts[0].dataBackupFilePath, backup);
            assert.equal(expected.accounts[0].archiveOption, 'never');
            await fs.writeFile(path.join(evidence, 'expected-data.json'), JSON.stringify(expected, null, 2));
            await screenshot('baseline-data');
        });
        await phase('reopen-baseline-with-candidate-feed', async () => {
            const runtime = await readRuntime(from); await stopTrace();
            await page.close(); await until('baseline clean exit', () => !processAlive(runtime.pid));
            feed.offer(to.manifest.version);
            const pid = await installed.launch(); observedPids.set(pid, { pid, executable: installed.executable });
            before = await until('reopened baseline', async () => { const value = await readRuntime(from); return value.nonce !== runtime.nonce && value; });
            await connect('update-controls'); await ready(); await acknowledgeBackup(page);
            assert.deepEqual(assertRelationships(await snapshot(page)), expected);
        });
        const updates = () => page.locator('app-electron-update');
        await phase('download-real-update', async () => {
            if (scenario === 'baseline-update' && from.manifest.qaInstrumentation.updaterContract === 'legacy') {
                await updates().getByText(/^Download update$/i).waitFor();
                await screenshot('update-available'); await stopTrace();
            }
            await updates().getByText(/^Download update$/i).click();
        });
        if (scenario === 'baseline-update' && from.manifest.qaInstrumentation.updaterContract === 'guarded-v1') {
            await phase('restart-downloaded-baseline-update', async () => {
                await updates().getByRole('button', { name: 'Restart and install', exact: true }).waitFor({ timeout: 180000 });
                await screenshot('downloaded-update'); await stopTrace();
                await updates().getByRole('button', { name: 'Restart and install', exact: true }).click();
            });
        }
        if (scenario !== 'baseline-update') {
            await phase('later-keeps-application-usable', async () => {
                await updates().getByRole('button', { name: 'Restart and install', exact: true }).waitFor({ timeout: 180000 });
                await updates().getByRole('button', { name: 'Later', exact: true }).click();
                const reading = expected.predictorData.find(row => row.year === 2024 && row.month === 1);
                await navigate(page, `/data-evaluation/facility/${reading.facilityId}/utility/predictors/predictor/${reading.predictorId}/edit-entry/${reading.guid}`);
                await page.locator('app-edit-predictor-data-entry-form input[type=number]').fill('321.5');
                assert.equal((await readRuntime(from)).nonce, before.nonce);
                result.guards.later = true;
                await page.locator('app-header').getByRole('button', { name: 'Update Available!', exact: true }).click();
            });
            if (scenario === 'backup-recovery') {
                await phase('make-backup-destination-unwritable', async () => {
                    await fs.rename(path.dirname(backup), path.dirname(backup) + '.saved');
                    await fs.writeFile(path.dirname(backup), 'intentional filesystem obstruction');
                });
            }
            const guard = () => page.locator('app-shared-router-guard-modal .popup.open');
            await phase('restart-enters-editor-leave-guard', async () => {
                await updates().getByRole('button', { name: 'Restart and install', exact: true }).click();
                await guard().locator('.popup-header').waitFor();
            });
            if (scenario === 'cancel-save') {
                await phase('cancel-retains-draft-and-running-version', async () => {
                    await guard().locator('.popup-header button').click();
                    await until('leave guard canceled', async () => !await guard().isVisible());
                    assert.equal((await readRuntime(from)).nonce, before.nonce);
                    assert.equal(await page.locator('app-edit-predictor-data-entry-form input[type=number]').inputValue(), '321.5');
                    result.guards.cancel = true;
                    await updates().getByRole('button', { name: 'Restart and install', exact: true }).click();
                    await guard().locator('.popup-header').waitFor();
                });
            }
            await screenshot('leave-decision'); await stopTrace();
            await phase('apply-editor-leave-decision', async () => {
                const decision = scenario === 'discard' ? 'Discard' : 'Save';
                await guard().getByRole('button', { name: decision, exact: true }).click();
                result.guards[decision.toLowerCase()] = true;
                if (decision === 'Save') expected.predictorData.find(row => row.year === 2024 && row.month === 1).amount = 321.5;
            });
            if (scenario === 'backup-recovery') {
                await phase('backup-failure-blocks-installation', async () => {
                    await updates().getByRole('alert').filter({ hasText: /backup/i }).waitFor();
                    assert.equal((await readRuntime(from)).nonce, before.nonce);
                    assert.deepEqual(assertRelationships(await snapshot(page)), expected);
                    result.guards.backupFailure = true;
                    await screenshot('backup-blocked');
                });
                await phase('recover-backup-through-ui', async () => {
                    await fs.unlink(path.dirname(backup)); await fs.rename(path.dirname(backup) + '.saved', path.dirname(backup));
                    await page.locator('app-header [title="Automatic Account Backups Active"]').click();
                    const modal = page.locator('app-electron-backup-file .popup.open');
                    // The restored file keeps its registered dataBackupId. Review
                    // validates it and resumes the queued failed revision; it is
                    // a matching-file review, not a divergent-backup conflict.
                    await modal.getByText(/up to date with the latest backup file/i).waitFor();
                    await modal.getByRole('button', { name: 'Do Nothing', exact: true }).click();
                    const reading = expected.predictorData.find(row => row.year === 2024 && row.month === 1);
                    await until('real backup recovery', async () => (await backupAmount(backup, reading.predictorId)) === 321.5);
                    result.guards.backupRecovery = true;
                    await updates().getByRole('button', { name: 'Restart and install', exact: true }).click();
                });
            }
        }
        await phase('observe-updater-exit-and-relaunch', async () => {
            await until('old application exit', () => !processAlive(before.pid), 240000);
            after = await until('updater-launched replacement', async () => { const runtime = await readRuntime(to); return runtime.nonce !== before.nonce && runtime.pid !== before.pid && runtime; }, 240000);
            assert.notEqual(after.archiveSha256, before.archiveSha256);
            assert(path.resolve(after.executable).startsWith(path.resolve(installRoot) + path.sep) || platformName === 'linux');
            if (platformName === 'linux') {
                assert(after.appImage && path.resolve(after.appImage).startsWith(path.resolve(installRoot) + path.sep));
                const expectedImage = to.manifest.files.find(file => file.name.endsWith('.AppImage'));
                assert.equal((await describe(after.appImage)).sha256, expectedImage.sha256);
            }
            result.runtimeBefore = before; result.runtimeAfter = after;
        });
        await phase('verify-updated-version-data-and-backup', async () => {
            await connect('updated-application'); await ready(); await acknowledgeBackup(page);
            const actual = await until('reopened data', async () => assertRelationships(await snapshot(page)));
            assert.deepEqual(actual, expected);
            const reading = actual.predictorData.find(row => row.year === 2024 && row.month === 1);
            await until('preserved backup values', async () => (await backupAmount(backup, reading.predictorId)) === reading.amount);
            await fs.writeFile(path.join(evidence, 'actual-data.json'), JSON.stringify(actual, null, 2));
            await screenshot('updated-data'); await stopTrace();
            const extension = { windows: '.exe', linux: '.AppImage', mac: '.zip' }[platformName];
            assert(feed.requests.some(request => request.method === 'GET' && request.name.endsWith(extension) && to.manifest.files.some(file => file.name === request.name) && request.bytes > 0), 'No real candidate payload was served.');
            result.dataPreserved = true; result.realUpdate = true;
        });
        result.status = 'passed';
    } catch (error) {
        result.error = error.stack || error.message;
        if (page && browser?.isConnected()) { await screenshot('failure').catch(() => {}); await stopTrace().catch(() => {}); }
    } finally {
        result.completedAt = new Date().toISOString(); result.feedRequests = feed?.requests || [];
        await fs.writeFile(path.join(evidence, 'result.json'), JSON.stringify(result, null, 2));
        for (const runtime of observedPids.values()) { try { await verifyProcess(runtime); process.kill(runtime.pid); } catch {} }
        await browser?.close().catch(() => {}); await feed?.close();
        if (ownedProfile) {
            await fs.cp(path.join(profile, 'logs'), path.join(evidence, 'application-logs'), { recursive: true }).catch(() => {});
            const logs = (after || before)?.logs;
            if (logs && path.basename(logs) === QA_IDENTITY.name) await fs.cp(logs, path.join(evidence, 'native-logs'), { recursive: true }).catch(() => {});
            await fs.rm(profile, { recursive: true, force: true });
        }
    }
    return result;
}
module.exports = { until, validateRuntime, runScenario };
