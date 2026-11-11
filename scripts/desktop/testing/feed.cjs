const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { assert, QA_IDENTITY, verifyFiles } = require('../qa-contract.cjs');

async function createFeed(packages, { port = new URL(QA_IDENTITY.feed).port, onRequest = () => {} } = {}) {
    const files = new Map(), metadata = new Map(), requests = [];
    let active;
    for (const item of packages) {
        await verifyFiles(item.directory, item.manifest.files);
        const manifestName = { windows: 'latest.yml', mac: 'latest-mac.yml', linux: 'latest-linux.yml' }[item.manifest.platform];
        metadata.set(item.manifest.version, path.join(item.directory, manifestName));
        for (const file of item.manifest.files) if (!/^latest.*\.yml$/.test(file.name)) {
            const previous = files.get(file.name);
            assert(!previous || previous.hash === file.sha256, 'Conflicting update payload filenames.');
            files.set(file.name, { file: path.join(item.directory, file.name), hash: file.sha256 });
        }
    }
    const server = http.createServer((request, response) => {
        let name;
        try {
            const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
            assert(pathname.startsWith('/updates/'), 'Unknown feed path.');
            name = decodeURIComponent(pathname.slice('/updates/'.length));
            assert(name && !/[\\/]/.test(name) && name !== '.' && name !== '..', 'Invalid feed filename.');
        } catch { response.writeHead(404).end(); return; }
        const file = /^latest.*\.yml$/.test(name) ? metadata.get(active) : files.get(name)?.file;
        if (!file || !['GET', 'HEAD'].includes(request.method)) { response.writeHead(404).end(); return; }
        const size = fs.statSync(file).size;
        let start = 0, end = size - 1;
        const range = request.headers.range;
        if (range && !range.includes(',')) {
            const match = /^bytes=(\d*)-(\d*)$/.exec(range);
            if (!match || (!match[1] && !match[2])) { response.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return; }
            start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
            end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
            if (start >= size || start > end) { response.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return; }
        }
        const partial = Boolean(range && !range.includes(','));
        const record = { time: new Date().toISOString(), method: request.method, name, range: range || null, version: active, status: partial ? 206 : 200, bytes: 0 };
        const headers = { 'Content-Type': name.endsWith('.yml') ? 'text/yaml' : 'application/octet-stream', 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
        if (partial) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
        response.writeHead(record.status, headers);
        response.on('close', () => { requests.push(record); onRequest(record); });
        if (request.method === 'HEAD') response.end();
        else {
            const stream = fs.createReadStream(file, { start, end });
            stream.on('data', data => { record.bytes += data.length; });
            stream.on('error', error => response.destroy(error));
            response.on('close', () => stream.destroy());
            stream.pipe(response);
        }
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(Number(port), '127.0.0.1', resolve); });
    return { requests, port: server.address().port,
        offer(version) { assert(metadata.has(version), 'Unknown feed version.'); active = version; },
        close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}
module.exports = { createFeed };
