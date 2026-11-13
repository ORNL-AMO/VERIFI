const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync, statSync } = require('node:fs');
const { dirname, extname, isAbsolute, relative, resolve, sep } = require('node:path');

const WORD_LIMITS = Object.freeze({
  'AGENTS.md': 1000,
  'docs/agents/context-index.md': 700,
  'docs/unified-ux-migration.md': 800,
});

function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

// Keep newlines intact so diagnostics refer to the original document.
function withoutExamples(text) {
  let fence;
  return text.split(/\r?\n/u).map(line => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/u);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length &&
          line.slice(marker[0].length).trim() === '') fence = undefined;
      return '';
    }
    if (marker) {
      fence = marker[1];
      return '';
    }
    return line;
  }).join('\n').replace(/<!--[\s\S]*?-->/gu, comment => comment.replace(/[^\n]/gu, ' '));
}

function headingAnchors(markdown) {
  const lines = withoutExamples(markdown).split('\n');
  const anchors = new Set();
  const addHeading = heading => {
    const plain = heading
      .replace(/!\[([^\]]*)\]\([^)]*\)/gu, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/gu, '$1')
      .replace(/<[^>]*>/gu, '')
      .replace(/&amp;/gu, '&')
      .replace(/&(?:lt|gt|quot|apos);/gu, '')
      .replace(/[`*_~]/gu, character => character === '_' ? '_' : '')
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}_\-\s]/gu, '')
      .replace(/\s/gu, '-');
    let slug = plain;
    let suffix = 0;
    while (anchors.has(slug)) slug = `${plain}-${++suffix}`;
    anchors.add(slug);
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const atx = line.match(/^ {0,3}#{1,6}(?:\s+(.+?)\s*#*\s*|\s*)$/u);
    if (atx) addHeading(atx[1] || '');
    else if (index + 1 < lines.length && line.trim() &&
             /^ {0,3}(?:=+|-+)\s*$/u.test(lines[index + 1])) {
      addHeading(line.trim());
      index++;
    }
    for (const match of line.matchAll(/\b(?:id|name)=["']([^"']+)["']/gu)) anchors.add(match[1]);
  }
  return anchors;
}

function referenceKey(label) {
  return label.trim().replace(/\s+/gu, ' ').toLowerCase();
}

function escaped(text, index) {
  let slashes = 0;
  while (index > 0 && text[--index] === '\\') slashes++;
  return slashes % 2 === 1;
}

function destination(text, start) {
  let index = start;
  while (/\s/u.test(text[index] || '') && index < text.length) index++;
  if (text[index] === '<') {
    const end = text.indexOf('>', index + 1);
    return end < 0 ? undefined : text.slice(index + 1, end);
  }
  const begin = index;
  let depth = 0;
  for (; index < text.length; index++) {
    if (escaped(text, index)) continue;
    const character = text[index];
    if (character === '(') depth++;
    else if (character === ')') {
      if (depth === 0) break;
      depth--;
    } else if (/\s/u.test(character) && depth === 0) break;
  }
  return text.slice(begin, index).replace(/\\([\\()<> ])/gu, '$1');
}

function markdownLinks(markdown) {
  const text = withoutExamples(markdown).replace(/(`+)([^`]|(?!\1)`)*?\1/gu,
    code => code.replace(/[^\n]/gu, ' '));
  const definitions = new Map();
  const definitionLines = new Set();
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index++) {
    const definition = lines[index].match(/^ {0,3}\[([^\]]+)\]:\s*/u);
    if (!definition) continue;
    definitions.set(referenceKey(definition[1]), destination(lines[index], definition[0].length));
    definitionLines.add(index + 1);
  }

  const links = [];
  const label = /\[([^\]\n]*)\](?:\[([^\]\n]*)\])?/gu;
  for (const match of text.matchAll(label)) {
    if (escaped(text, match.index)) continue;
    const line = text.slice(0, match.index).split('\n').length;
    if (definitionLines.has(line)) continue;
    const next = match.index + match[0].length;
    if (text[next] === '(' && match[2] === undefined) {
      const target = destination(text, next + 1);
      if (target !== undefined) links.push({ target, line });
    } else {
      const key = referenceKey(match[2] || match[1]);
      if (definitions.has(key)) links.push({ target: definitions.get(key), line });
      else if (match[2] !== undefined) links.push({ reference: key, line });
    }
  }
  return links;
}

function checkDocuments(root, files, limits = WORD_LIMITS) {
  root = resolve(root);
  const documents = new Map();
  const errors = [];
  const sizes = [];
  const anchors = new Map();
  for (const file of [...new Set(files)].sort()) {
    if (!/\.md$/iu.test(file)) continue;
    const full = resolve(root, file);
    if (!existsSync(full)) continue; // Deleted tracked files are absent before staging.
    const text = readFileSync(full, 'utf8');
    documents.set(file, text);
    const words = wordCount(text);
    sizes.push({ file, words, limit: limits[file] });
    if (limits[file] !== undefined && words > limits[file]) {
      errors.push({ file, message: `${words} words exceeds the ${limits[file]}-word limit` });
    }
  }

  for (const [file, text] of documents) {
    for (const link of markdownLinks(text)) {
      const fail = message => errors.push({ file, line: link.line, message });
      if (link.reference !== undefined) {
        fail(`Undefined link reference: ${link.reference}`);
        continue;
      }
      if (!link.target || /^(?:[a-z][a-z\d+.-]*:|\/\/)/iu.test(link.target)) continue;
      const hashIndex = link.target.indexOf('#');
      const rawPath = (hashIndex < 0 ? link.target : link.target.slice(0, hashIndex)).split('?')[0];
      let targetPath;
      let fragment;
      try {
        targetPath = decodeURIComponent(rawPath);
        fragment = hashIndex < 0 ? '' : decodeURIComponent(link.target.slice(hashIndex + 1));
      } catch {
        fail(`Invalid URL encoding: ${link.target}`);
        continue;
      }
      const full = targetPath
        ? resolve(targetPath.startsWith('/') ? root : dirname(resolve(root, file)), targetPath.replace(/^\//u, ''))
        : resolve(root, file);
      const local = relative(root, full).split(sep).join('/');
      if (local.startsWith('../') || isAbsolute(local)) {
        fail(`Link leaves the repository: ${link.target}`);
        continue;
      }
      if (!existsSync(full)) {
        fail(`Missing local target: ${link.target}`);
        continue;
      }
      if (!fragment || !statSync(full).isFile() || !/\.md$/iu.test(extname(full))) continue;
      if (!anchors.has(full)) anchors.set(full, headingAnchors(readFileSync(full, 'utf8')));
      if (!anchors.get(full).has(fragment)) fail(`Missing heading target: ${link.target}`);
    }
  }
  return { errors, sizes };
}

function repositoryMarkdown(root) {
  return execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '*.md'],
    { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
}

function main(root = resolve(__dirname, '../..')) {
  const result = checkDocuments(root, repositoryMarkdown(root));
  for (const size of result.sizes) console.log(`${String(size.words).padStart(6)} words  ${size.file}${size.limit ? ` (limit ${size.limit})` : ''}`);
  console.log(`${result.sizes.length} documents; ${result.sizes.reduce((sum, size) => sum + size.words, 0)} words total.`);
  for (const error of result.errors) console.error(`${error.file}${error.line ? `:${error.line}` : ''}: ${error.message}`);
  if (result.errors.length) console.error(`Documentation check failed: ${result.errors.length} issue(s).`);
  else console.log('Documentation links, heading targets, and word limits passed.');
  return result.errors.length ? 1 : 0;
}

module.exports = { WORD_LIMITS, wordCount, withoutExamples, headingAnchors, markdownLinks, checkDocuments, repositoryMarkdown, main };
if (require.main === module) process.exitCode = main(process.argv[2]);
