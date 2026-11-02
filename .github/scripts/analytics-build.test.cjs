const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const workflow = name => readFileSync(resolve(__dirname, '../workflows', name), 'utf8');
const template = workflow('template_build.yml');
const main = workflow('main.yml');
const qa = workflow('release_qa.yml');
const webBuild = main.slice(main.indexOf('\n  web_build:'), main.indexOf('\n  desktop:'));

// Exercise the actual build-step shell with npm replaced by a recording function.
const buildStep = template.match(/      - name: Build\n[\s\S]*?        run: \|\n([\s\S]*?)(?=      - name:)/)[1];
function selectedCommand(configuration, branch) {
  return spawnSync('bash', ['-c', 'npm() { printf "%s\\n" "$*"; }\n' + buildStep], {
    encoding: 'utf8',
    env: { ...process.env, BUILD_CONFIGURATION: configuration, GITHUB_REF_NAME: branch }
  });
}

function callerConfiguration(job, branch) {
  const value = job.match(/^      build-configuration: (.+)$/m)[1];
  if (value === 'dev-srv') return value;
  assert.equal(value, "${{ github.ref_name == 'master' && 'production' || 'dev-srv' }}");
  return branch === 'master' ? 'production' : 'dev-srv';
}

test('requires callers to explicitly choose a build configuration', () => {
  assert.match(template, /build-configuration:\n        required: true\n        type: string/);
  assert.match(template, /BUILD_CONFIGURATION: \$\{\{ inputs.build-configuration \}\}/);
});

for (const branch of ['master', 'develop', 'unified-ux']) {
  test(`QA on ${branch} always runs the analytics-disabled build`, () => {
    const result = selectedCommand(callerConfiguration(qa, branch), branch);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'run build-dev-srv');
  });
}

for (const [branch, command] of [['master', 'build-prod'], ['develop', 'build-dev-srv']]) {
  test(`release web build on ${branch} runs ${command}`, () => {
    const result = selectedCommand(callerConfiguration(webBuild, branch), branch);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), `run ${command}`);
  });
}

test('rejects missing and unsupported configurations instead of defaulting to production', () => {
  for (const configuration of ['', 'unknown']) {
    const result = selectedCommand(configuration, 'master');
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Unsupported build configuration/);
    assert.doesNotMatch(result.stdout, /run build-/);
  }
});
