const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const { assert, describe, sha } = require('./qa-contract.cjs');

async function prepareManifest(source, platform, destination, env = process.env) {
    const requireSource = createRequire(path.join(source, 'package.json'));
    const pkg = requireSource('./package.json');
    const config = JSON.parse(await fs.readFile(path.join(source, 'desktop-package-config.json'), 'utf8'));
    const verification = JSON.parse(await fs.readFile(path.join(source, 'desktop-verification.json'), 'utf8'));
    assert(verification.platform === platform && verification.verified === true, 'Platform verification is required before artifact publication.');
    if (platform === 'windows') assert(verification.signature === true && typeof verification.publisher === 'string' && verification.publisher.length > 0, 'Windows signature/publisher verification is required.');
    if (platform === 'mac') assert(verification.signature === true && verification.universal === true && verification.notarization === 'Accepted' && verification.stapling === true, 'Mac signing/universal/notarization/stapling verification is required.');
    if (platform === 'linux') assert(verification.metadata === true, 'Linux metadata verification is required.');
    await fs.mkdir(destination, { recursive: true });
    const output = path.join(source, 'output');
    const extensions = { windows: /\.(exe|blockmap)$|^latest\.yml$/, linux: /\.AppImage$|\.tar\.gz$|^latest-linux\.yml$/, mac: /\.(dmg|zip|blockmap)$|^latest-mac\.yml$/ }[platform];
    assert(extensions, 'Invalid package platform.');
    for (const entry of await fs.readdir(output, { withFileTypes: true })) {
        if (entry.isFile() && extensions.test(entry.name)) await fs.copyFile(path.join(output, entry.name), path.join(destination, entry.name));
    }
    const names = await fs.readdir(destination);
    const required = { windows: [/\.exe$/, /^latest\.yml$/, /\.exe\.blockmap$/], linux: [/\.AppImage$/, /\.tar\.gz$/, /^latest-linux\.yml$/], mac: [/\.dmg$/, /\.zip$/, /^latest-mac\.yml$/, /\.zip\.blockmap$/] }[platform];
    required.forEach(pattern => assert(names.some(name => pattern.test(name)), `Missing required ${platform} distribution.`));
    const files = await Promise.all(names.sort().map(name => describe(path.join(destination, name))));
    const wrapper = config.extraMetadata?.verifiQa;
    return { schemaVersion: 1, kind: 'desktop-package', platform, role: env.DESKTOP_ROLE || 'production',
        sourceSha: sha(env.DESKTOP_SOURCE_SHA), workflowSha: sha(env.DESKTOP_WORKFLOW_SHA),
        version: config.extraMetadata?.version || pkg.version, sourceVersion: pkg.version, electronVersion: requireSource('electron/package.json').version,
        qa: Boolean(wrapper), qaInstrumentation: wrapper || null,
        configurationSha256: createHash('sha256').update(JSON.stringify(config)).digest('hex'),
        runner: { os: env.RUNNER_OS, arch: env.RUNNER_ARCH, image: env.ImageOS || null, imageVersion: env.ImageVersion || null },
        verification, files };
}

if (require.main === module) {
    const [sourceArg, platform, destination, manifestPath] = process.argv.slice(2);
    prepareManifest(path.resolve(sourceArg), platform, destination).then(async manifest => {
        await fs.mkdir(path.dirname(manifestPath), { recursive: true });
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { prepareManifest };
