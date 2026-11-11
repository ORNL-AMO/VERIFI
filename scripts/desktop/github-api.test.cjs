const { test } = require('node:test');
const assert = require('node:assert/strict');
const { githubApi, paginate } = require('./github-api.cjs');

test('supports GitHub comparison syntax while keeping API requests confined to the repository', async t => {
    const requests = [];
    t.mock.method(globalThis, 'fetch', async (url, options) => { requests.push({ url, options }); return { ok: true, status: 200, json: () => ({ status: 'ahead' }) }; });
    const api = githubApi('ORNL-AMO/VERIFI', 'test-token');
    assert.deepEqual(await api(`/compare/${'a'.repeat(40)}...${'b'.repeat(40)}`), { status: 'ahead' });
    assert.match(requests[0].url, /^https:\/\/api.github.com\/repos\/ORNL-AMO\/VERIFI\/compare\//);
    await assert.rejects(api('//other.example'), /route/);
    await assert.rejects(api('/../another-repository'), /route/);
    assert.equal(requests.length, 1);
});

test('paginates artifact inventories instead of silently omitting platforms beyond the first page', async () => {
    const calls = [];
    const values = await paginate(route => { calls.push(route); return { artifacts: route.endsWith('&page=1') ? Array(100).fill({ id: 1 }) : [{ id: 2 }] }; }, '/actions/runs/100/artifacts', 'artifacts');
    assert.equal(values.length, 101); assert.equal(calls.length, 2);
});
