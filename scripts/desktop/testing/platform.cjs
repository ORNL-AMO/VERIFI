const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execute = promisify(execFile);
const { assert, QA_IDENTITY, QA_INSTRUMENTATION_VERSION, verifyFiles } = require('../qa-contract.cjs');

const platformName = { win32: 'windows', darwin: 'mac', linux: 'linux' }[process.platform];
function profilePath(platform = process.platform, env = process.env) {
    const base = platform === 'win32' ? env.APPDATA : platform === 'darwin' ? path.join(os.homedir(), 'Library/Application Support') : env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    assert(base, 'Cannot locate disposable QA app-data root.');
    return path.join(base, QA_IDENTITY.name);
}

function processAlive(pid) { try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; } }

async function install(item, root, logFile) {
    await verifyFiles(item.directory, item.manifest.files);
    assert(item.manifest.platform === platformName && item.manifest.qa === true && item.manifest.qaInstrumentation?.instrumentationVersion === QA_INSTRUMENTATION_VERSION, 'Package is incompatible with this installed-app harness.');
    const payload = extension => {
        const matches = item.manifest.files.filter(file => file.name.endsWith(extension));
        assert(matches.length === 1, `Expected exactly one ${extension} installer.`);
        return path.join(item.directory, matches[0].name);
    };
    await fs.mkdir(root, { recursive: true });
    let executable;
    if (platformName === 'windows') {
        const target = path.join(root, 'application');
        // NSIS requires /D last and without extra embedded quotes; execFile preserves one argument.
        const result = await execute(payload('.exe'), ['/S', `/D=${target}`], { timeout: 180000, windowsHide: true });
        await fs.appendFile(logFile, result.stdout + result.stderr);
        executable = path.join(target, `${QA_IDENTITY.productName}.exe`);
    } else if (platformName === 'mac') {
        const mount = path.join(root, 'dmg'); await fs.mkdir(mount);
        const result = await execute('hdiutil', ['attach', '-nobrowse', '-readonly', '-mountpoint', mount, payload('.dmg')], { timeout: 120000 });
        await fs.appendFile(logFile, result.stdout + result.stderr);
        const bundle = path.join(root, `${QA_IDENTITY.productName}.app`);
        try { await execute('ditto', [path.join(mount, `${QA_IDENTITY.productName}.app`), bundle], { timeout: 120000 }); }
        finally { await execute('hdiutil', ['detach', mount], { timeout: 120000 }); }
        executable = path.join(bundle, 'Contents/MacOS', QA_IDENTITY.productName);
    } else if (platformName === 'linux') {
        executable = path.join(root, path.basename(payload('.AppImage')));
        await fs.copyFile(payload('.AppImage'), executable); await fs.chmod(executable, 0o755);
    } else throw new Error('Unsupported OS.');
    await fs.access(executable);
    return { executable, launch: async () => {
        const output = await fs.open(logFile, 'a');
        const child = spawn(executable, [], { env: process.env, detached: false, stdio: ['ignore', output.fd, output.fd] });
        await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
        await output.close(); child.unref(); return child.pid;
    } };
}

async function verifyProcess(runtime) {
    assert(processAlive(runtime.pid), 'The recorded application process is not running.');
    let actual;
    if (platformName === 'linux') actual = await fs.readlink(`/proc/${runtime.pid}/exe`);
    else if (platformName === 'mac') actual = (await execute('ps', ['-ww', '-p', String(runtime.pid), '-o', 'comm='])).stdout.trim();
    else {
        const command = `(Get-CimInstance Win32_Process -Filter 'ProcessId=${Number(runtime.pid)}').ExecutablePath`;
        actual = (await execute('pwsh', ['-NoProfile', '-Command', command])).stdout.trim();
    }
    const normalize = value => platformName === 'windows' ? path.resolve(value).toLowerCase() : path.resolve(value);
    assert(normalize(actual) === normalize(runtime.executable), 'Recorded runtime does not match the live installed executable.');
}
module.exports = { platformName, profilePath, processAlive, install, verifyProcess };
