#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const modeIndex = args.indexOf('--mode');
const mode = modeIndex >= 0 ? args[modeIndex + 1] : 'plan';
const help = args.includes('--help') || args.includes('-h');
const explicitFiles = args
  .filter((arg, index) => index !== modeIndex && index !== modeIndex + 1)
  .filter(arg => !arg.startsWith('--'));

if (help) {
  console.log(`Usage: npm run validate:agent -- [--mode plan|run] [files...]

Prints or runs a risk-based validation plan for VERIFI changes.
When files are omitted, changed tracked files from HEAD and untracked files are inspected.`);
  process.exit(0);
}

if (!['plan', 'run'].includes(mode)) {
  console.error(`Unsupported --mode "${mode}". Use "plan" or "run".`);
  process.exit(1);
}

const files = unique(explicitFiles.length > 0 ? explicitFiles : changedFiles())
  .map(normalizePath)
  .filter(Boolean);
const plan = buildValidationPlan(files);

printPlan(plan);

if (mode === 'run') {
  const failed = runCommands(plan.commands);
  process.exit(failed ? 1 : 0);
}

function changedFiles() {
  const tracked = runGit(['diff', '--name-only', 'HEAD']);
  const untracked = runGit(['ls-files', '--others', '--exclude-standard']);
  return [...tracked, ...untracked];
}

function runGit(gitArgs) {
  const result = spawnSync('git', gitArgs, { encoding: 'utf8' });
  if (result.status !== 0) {
    return [];
  }
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

function buildValidationPlan(paths) {
  const reasons = [];
  const manual = [];
  const commands = [];
  const focusedSpecs = findFocusedSpecs(paths);
  const hasDocsOnly = paths.length > 0 && paths.every(isDocsOnly);
  const hasAppSource = paths.some(path =>
    path.startsWith('src/') && /\.(ts|html|css|scss)$/.test(path)
  );
  const hasTypeScriptSource = paths.some(path =>
    (path.startsWith('src/') && path.endsWith('.ts')) ||
    /^tsconfig.*\.json$/.test(path) ||
    path === 'angular.json'
  );
  const hasBrowserBoundary = paths.some(path =>
    path.startsWith('src/') && (
      path.includes('/indexedDB/') ||
      path.includes('/web-workers/') ||
      path.endsWith('.browser.spec.ts') ||
      /file|worker|indexeddb/i.test(path)
    )
  );
  const hasElectronBoundary = paths.some(path =>
    path === 'main.js' ||
    path === 'preload.js' ||
    path.startsWith('src/app/platform/electron/') ||
    path.includes('environment.electron')
  );
  const hasProductionAngularSurface = paths.some(path =>
    path === 'angular.json' ||
    path === 'src/main.ts' ||
    /^src\/app\/(app\.module|app\.component|main)\.ts$/.test(path) ||
    /^src\/app\/routing\/.*\.(ts|html|css|scss)$/.test(path) ||
    /^src\/app\/(v0|v1|ux-prototypes)\/.*\.(ts|html|css|scss)$/.test(path) ||
    /^src\/app\/platform\/electron\/.*\.(ts|html|css|scss)$/.test(path) ||
    /^src\/styles\/.*\.(css|scss)$/.test(path) ||
    /^src\/environments\/environment(\.prod)?\.ts$/.test(path)
  );

  const hasExplicitBrowserSpec = paths.some(path =>
    path.endsWith('.browser.spec.ts') ||
    (path.startsWith('src/') && /file|worker|indexeddb/i.test(path))
  );

  if (paths.length === 0) {
    reasons.push('No changed files detected; no validation command selected.');
    return { files: paths, commands, manual, reasons };
  }

  if (hasDocsOnly) {
    reasons.push('Only docs/agent guidance changed; validate links and command names by inspection.');
    return { files: paths, commands, manual, reasons };
  }

  if (focusedSpecs.length > 0) {
    commands.push(command(
      'Focused unit specs',
      'npx',
      ['ng', 'test', '--no-watch', '--no-progress', ...focusedSpecs.flatMap(spec => ['--include', spec])],
      'Changed files have nearby fast specs.'
    ));
  } else if (hasAppSource) {
    reasons.push('No nearby fast spec found; add focused coverage or document why automation is disproportionate.');
  }

  if (hasTypeScriptSource) {
    commands.push(command(
      'TypeScript compile',
      'npx',
      ['tsc', '-p', 'tsconfig.app.json', '--noEmit'],
      'TypeScript or app configuration changed.'
    ));
  }

  if (hasBrowserBoundary || hasExplicitBrowserSpec) {
    commands.push(command(
      'Browser boundary suite',
      'npm',
      ['run', 'test:browser:ci'],
      'IndexedDB, Web Worker, File API, or browser-native behavior may be affected.'
    ));
  }

  if (hasProductionAngularSurface) {
    commands.push(command(
      'Production web build',
      'npm',
      ['run', 'build-prod'],
      'Production Angular UI, routing, styles, or build surface changed.'
    ));
  }

  if (hasElectronBoundary) {
    commands.push(command(
      'Production Electron renderer build',
      'npm',
      ['run', 'build-prod-electron'],
      'Electron runtime boundary or Electron environment changed.'
    ));
    manual.push('Run a focused Electron desktop check for the affected IPC, filesystem, dialog, shell, or update behavior.');
  }

  if (paths.some(path => path.startsWith('.agents/skills/') || path === 'AGENTS.md' || path.startsWith('docs/agents/'))) {
    commands.push(command(
      'Agent validation plan',
      'npm',
      ['run', 'validate:agent', '--', '--mode', 'plan'],
      'Agent routing, validation guidance, or validation helper changed.'
    ));
  }

  return { files: paths, commands: uniqueCommands(commands), manual, reasons };
}

function findFocusedSpecs(paths) {
  const specs = [];
  for (const path of paths) {
    if (path.endsWith('.browser.spec.ts')) {
      continue;
    }
    if (path.endsWith('.spec.ts')) {
      specs.push(path);
      continue;
    }
    if (!path.startsWith('src/app/')) {
      continue;
    }
    for (const candidate of specCandidates(path)) {
      if (existsSync(candidate)) {
        specs.push(candidate);
      }
    }
  }
  return unique(specs);
}

function specCandidates(path) {
  const candidates = [];
  if (path.endsWith('.ts')) {
    candidates.push(path.replace(/\.ts$/, '.spec.ts'));
  }
  if (/\.(html|css|scss)$/.test(path)) {
    candidates.push(path.replace(/\.(html|css|scss)$/, '.spec.ts'));
  }
  return candidates.map(normalizePath);
}

function printPlan(plan) {
  console.log('VERIFI agent validation plan');
  console.log('');
  console.log(`Files inspected: ${plan.files.length}`);
  for (const file of plan.files) {
    console.log(`- ${file}`);
  }
  console.log('');

  if (plan.commands.length === 0) {
    console.log('Commands: none selected');
  } else {
    console.log('Commands:');
    for (const item of plan.commands) {
      console.log(`- ${item.label}: ${item.command}`);
      console.log(`  Reason: ${item.reason}`);
    }
  }

  if (plan.manual.length > 0) {
    console.log('');
    console.log('Manual checks:');
    for (const item of plan.manual) {
      console.log(`- ${item}`);
    }
  }

  if (plan.reasons.length > 0) {
    console.log('');
    console.log('Notes:');
    for (const reason of plan.reasons) {
      console.log(`- ${reason}`);
    }
  }
}

function runCommands(commands) {
  let failed = false;
  for (const item of commands) {
    console.log('');
    console.log(`Running: ${item.command}`);
    const result = spawnSync(item.executable, item.args, {
      stdio: 'inherit',
      shell: false
    });
    if (result.status !== 0) {
      failed = true;
      console.log(`Failed: ${item.label} exited with ${result.status ?? 'unknown status'}.`);
      break;
    }
    console.log(`Passed: ${item.label}`);
  }
  return failed;
}

function command(label, executable, args, reason) {
  return {
    label,
    executable,
    args,
    command: [executable, ...args].map(displayArgument).join(' '),
    reason
  };
}

function displayArgument(value) {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}

function isDocsOnly(path) {
  return /\.(md|txt|yml|yaml)$/.test(path) &&
    !path.startsWith('src/') &&
    path !== 'angular.json' &&
    path !== 'package.json';
}

function normalizePath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '');
}

function unique(values) {
  return [...new Set(values)];
}

function uniqueCommands(commands) {
  const seen = new Set();
  return commands.filter(item => {
    if (seen.has(item.command)) {
      return false;
    }
    seen.add(item.command);
    return true;
  });
}
