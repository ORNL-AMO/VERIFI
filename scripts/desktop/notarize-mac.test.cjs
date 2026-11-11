const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

async function fixture(t, status = 'Accepted') {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifi-mac-notary-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const source = path.join(directory, 'source'), bin = path.join(directory, 'bin'), temporary = path.join(directory, 'temporary');
    await fs.mkdir(bin); await fs.mkdir(temporary);
    const app = path.join(source, 'output/mac-universal/VERIFI QA.app');
    await fs.mkdir(path.join(app, 'Contents/MacOS'), { recursive: true });
    await fs.writeFile(path.join(source, 'output/VERIFI QA.dmg'), 'signed DMG');
    await fs.writeFile(path.join(source, 'output/VERIFI QA.zip'), 'original ZIP');
    const shim = `#!/usr/bin/env node
const fs=require('node:fs'), path=require('node:path');
const tool=path.basename(process.argv[1]), args=process.argv.slice(2);
fs.appendFileSync(process.env.COMMAND_LOG,JSON.stringify([tool,...args])+'\\n');
if(tool==='plutil')process.stdout.write('VERIFI QA');
if(tool==='codesign'&&args.includes('-dv'))process.stderr.write('Authority=Developer ID Application: Test\\nTeamIdentifier=TESTTEAM\\n');
if(tool==='xcrun'&&args[0]==='notarytool')process.stdout.write(JSON.stringify({status:process.env.NOTARY_STATUS}));
if(tool==='xcrun'&&args[0]==='stapler'&&args[1]==='staple'&&args[2].endsWith('.app'))fs.writeFileSync(path.join(args[2],'Contents/ticket'),'stapled app ticket');
if(tool==='ditto')fs.writeFileSync(args.at(-1),fs.readFileSync(path.join(args.at(-2),'Contents/ticket')));
`;
    for (const name of ['plutil', 'lipo', 'codesign', 'xcrun', 'ditto']) await fs.writeFile(path.join(bin, name), shim, { mode: 0o755 });
    const env = { ...process.env, PATH: bin + path.delimiter + process.env.PATH, RUNNER_TEMP: temporary, APPLE_TEAM_ID: 'TESTTEAM', APPLE_ID: 'fixture', APPLE_APP_SECRET: 'fixture', NOTARY_STATUS: status, COMMAND_LOG: path.join(directory, 'commands.jsonl') };
    return { source, app, env, log: env.COMMAND_LOG };
}

test('rebuilds the ZIP from the stapled app before reporting all Mac distributions verified', async t => {
    const f = await fixture(t);
    execFileSync('bash', [path.join(__dirname, 'notarize-mac.sh'), f.source], { env: f.env, stdio: 'pipe' });
    assert.equal(await fs.readFile(path.join(f.source, 'output/VERIFI QA.zip'), 'utf8'), 'stapled app ticket');
    const calls = (await fs.readFile(f.log, 'utf8')).trim().split('\n').map(JSON.parse);
    const staple = calls.findIndex(call => call[0] === 'xcrun' && call[1] === 'stapler' && call[2] === 'staple' && call[3] === f.app);
    const zip = calls.findIndex(call => call[0] === 'ditto');
    assert(staple >= 0 && zip > staple);
    assert(calls[zip].includes('--keepParent'));
    const verification = JSON.parse(await fs.readFile(path.join(f.source, 'desktop-verification.json'), 'utf8'));
    assert.deepEqual(verification.stapling, { app: true, dmg: true, zip: true });
});

test('notarization rejection retains the original ZIP and never reports verified packages', async t => {
    const f = await fixture(t, 'Invalid');
    assert.throws(() => execFileSync('bash', [path.join(__dirname, 'notarize-mac.sh'), f.source], { env: f.env, stdio: 'pipe' }), /Invalid/);
    assert.equal(await fs.readFile(path.join(f.source, 'output/VERIFI QA.zip'), 'utf8'), 'original ZIP');
    await assert.rejects(fs.access(path.join(f.source, 'desktop-verification.json')));
});
