const { assert } = require('./qa-contract.cjs');

function githubApi(repository = process.env.GITHUB_REPOSITORY, token = process.env.GH_TOKEN) {
    assert(typeof repository === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository), 'Invalid repository.');
    assert(token, 'A GitHub token is required.');
    return async (route, options = {}) => {
        assert(route.startsWith('/') && !route.startsWith('//') && !route.split('?')[0].split('/').includes('..'), 'Invalid API route.');
        const response = await fetch(`https://api.github.com/repos/${repository}${route}`, {
            ...options,
            headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...options.headers },
            signal: AbortSignal.timeout(60000)
        });
        if (!response.ok) throw new Error(`GitHub API ${response.status}: ${route.split('?')[0]}`);
        return response.status === 204 ? undefined : response.json();
    };
}

async function paginate(api, route, key) {
    const all = [];
    for (let page = 1; page <= 1000; page++) {
        const response = await api(`${route}${route.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
        const values = key ? response[key] : response;
        assert(Array.isArray(values), 'Invalid GitHub list response.');
        all.push(...values);
        if (values.length < 100) return all;
    }
    throw new Error('GitHub inventory exceeded the bounded pagination limit.');
}

module.exports = { githubApi, paginate };
