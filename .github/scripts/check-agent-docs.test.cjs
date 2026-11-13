const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { dirname, join } = require('node:path');
const test = require('node:test');
const { checkDocuments, headingAnchors, markdownLinks, wordCount } = require('./check-agent-docs.cjs');

function fixture(t, contents) {
  const root = mkdtempSync(join(tmpdir(), 'verifi-docs-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [file, text] of Object.entries(contents)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  return root;
}

test('resolves local files, directories, root paths, and current-document headings', t => {
  const contents = {
    'README.md': '# Start\n\n[Guide](docs/guide.md#data-and-units) [Here](#start) [Dir](docs/) [Root](/docs/guide.md)\n',
    'docs/guide.md': '# Data and units\n\n[Back](../README.md#start)\n',
  };
  assert.deepEqual(checkDocuments(fixture(t, contents), Object.keys(contents), {}).errors, []);
});

test('reports missing files and headings at their source lines', t => {
  const contents = { 'README.md': '# Start\n[Missing](absent.md)\n[Wrong](#absent)\n' };
  const result = checkDocuments(fixture(t, contents), Object.keys(contents), {});
  assert.deepEqual(result.errors.map(error => [error.line, error.message]), [
    [2, 'Missing local target: absent.md'], [3, 'Missing heading target: #absent'],
  ]);
});

test('retains code and Unicode heading text and assigns collision-free duplicate slugs', () => {
  assert.deepEqual([...headingAnchors('# A `value` and café!\n## Duplicate\n## Duplicate\n## Duplicate-1\nTitle\n=====\n')],
    ['a-value-and-café', 'duplicate', 'duplicate-1', 'duplicate-1-1', 'title']);
});

test('ignores fenced, commented, escaped, and inline-code examples and external destinations', t => {
  const text = '# Real\n```markdown\n[Bad](missing.md)\n# Fake\n```\n~~~\n[Bad](missing.md)\n~~~\n' +
    '`[Bad](missing.md)`\n<!-- [Bad](missing.md) -->\n\\[Bad](missing.md)\n' +
    '[Web](https://example.com/no#heading) [Mail](mailto:team@example.com) [Protocol](//example.com)\n';
  const root = fixture(t, { 'README.md': text });
  assert.deepEqual(checkDocuments(root, ['README.md'], {}).errors, []);
  assert.deepEqual([...headingAnchors(text)], ['real']);
});

test('parses angle destinations, encoded spaces, balanced parentheses, titles, and image targets', t => {
  const contents = {
    'docs/guide.md': '[Space](<../My Report.md#detail>) [Encoded](../My%20Report.md) [Nested](../plan(v2).md "Title") ![Image](../image.png)\n',
    'My Report.md': '# Detail\n',
    'plan(v2).md': '# Plan\n',
    'image.png': 'binary fixture',
  };
  assert.deepEqual(checkDocuments(fixture(t, contents), Object.keys(contents), {}).errors, []);
});

test('resolves full, collapsed, and shortcut reference links without checking unused definitions', t => {
  const contents = {
    'README.md': '[Guide][target] [Target][] [target]\n\n[target]: docs/guide.md#details "Guide"\n[unused]: absent.md\n',
    'docs/guide.md': '# Details\n',
  };
  const root = fixture(t, contents);
  assert.deepEqual(checkDocuments(root, Object.keys(contents), {}).errors, []);
  assert.equal(markdownLinks(contents['README.md']).length, 3);
});

test('reports undefined explicit references and malformed URL encodings', t => {
  const root = fixture(t, { 'README.md': '[Broken][unknown]\n[Broken](bad%encoding.md)\n' });
  assert.deepEqual(checkDocuments(root, ['README.md'], {}).errors.map(error => error.message), [
    'Undefined link reference: unknown', 'Invalid URL encoding: bad%encoding.md',
  ]);
});

test('rejects local paths outside the repository', t => {
  const root = fixture(t, { 'README.md': '[Outside](../outside.md)\n' });
  assert.equal(checkDocuments(root, ['README.md'], {}).errors[0].message,
    'Link leaves the repository: ../outside.md');
});

test('counts whitespace-separated words and enforces only configured document limits', t => {
  const contents = { 'AGENTS.md': 'one two\nthree', 'docs/guide.md': 'one two three four' };
  const root = fixture(t, contents);
  assert.equal(wordCount(' \n\t'), 0);
  assert.deepEqual(checkDocuments(root, Object.keys(contents), { 'AGENTS.md': 2 }).errors, [
    { file: 'AGENTS.md', message: '3 words exceeds the 2-word limit' },
  ]);
  assert.deepEqual(checkDocuments(root, Object.keys(contents), { 'AGENTS.md': 3 }).errors, []);
});

test('allows unstaged deletion and reports each document size once', t => {
  const root = fixture(t, { 'README.md': '# Present\n' });
  const result = checkDocuments(root, ['README.md', 'README.md', 'deleted.md'], {});
  assert.equal(result.sizes.length, 1);
  assert.deepEqual(result.errors, []);
});
