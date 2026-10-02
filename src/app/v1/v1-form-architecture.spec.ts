/**
 * Production-v1 form boundary guard.
 *
 * Form values belong to typed Angular controls or explicit typed component
 * commands. Browser Event objects must not become application payloads.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const V1_ROOT = __dirname;
const ANALYSIS_ROOT = join(V1_ROOT, 'facility', 'analysis');
const TEMPLATE_DRIVEN_ALLOWLIST = new Set([
  'account/imports/import-wizard/steps/footprint-facility/import-footprint-facility-step.component.html',
  'account/imports/import-wizard/steps/mapping/import-mapping-step.component.html',
  'account/imports/import-wizard/steps/meters/import-meters-step.component.html',
  'account/imports/import-wizard/steps/predictors/import-predictors-step.component.html',
  'account/imports/import-wizard/steps/worksheet/import-worksheet-step.component.html',
  'shell/section-nav/facility-picker/facility-picker.component.html'
]);

function collectFiles(directory: string, extensions: readonly string[], files: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) collectFiles(path, extensions, files);
    else if (extensions.some(extension => entry.endsWith(extension)) && !entry.endsWith('.spec.ts')) files.push(path);
  }
  return files;
}

function source(path: string): string { return readFileSync(path, 'utf8'); }
function v1Path(path: string): string { return relative(V1_ROOT, path).replace(/\\/g, '/'); }
function violationMessage(paths: readonly string[], rule: string): string {
  return paths.length ? `${rule}:\n  ${paths.map(v1Path).join('\n  ')}` : '';
}

describe('production v1 form architecture', () => {
  const productionFiles = collectFiles(V1_ROOT, ['.ts', '.html']);
  const productionTypeScript = productionFiles.filter(path => path.endsWith('.ts'));

  it('does not read form values through DOM event targets', () => {
    const forbiddenTargetRead = /(?:\$any\s*\(\s*\$event\.target\s*\)|\$event\.target|\bevent\.target\b)/;
    const violators = productionFiles.filter(path => forbiddenTargetRead.test(source(path)));
    expect(violators, violationMessage(violators, 'DOM target reads are not typed form boundaries')).toHaveLength(0);
  });

  it('does not expose raw DOM Events from component outputs', () => {
    const rawEventOutput = /@Output(?:\([^)]*\))?\s+[\w$]+\s*=\s*new\s+EventEmitter\s*<\s*Event\s*>/;
    const violators = productionTypeScript.filter(path => rawEventOutput.test(source(path)));
    expect(violators, violationMessage(violators, 'Component outputs must expose typed application values')).toHaveLength(0);
  });

  it('does not accept DOM Events in facades or services', () => {
    const eventParameter = /\([^)]*\b\w+\s*:\s*Event\b[^)]*\)/;
    const violators = productionTypeScript
      .filter(path => /\.(?:facade|service)\.ts$/.test(path))
      .filter(path => eventParameter.test(source(path)));
    expect(violators, violationMessage(violators, 'Facades and services must receive typed domain values')).toHaveLength(0);
  });

  it('keeps facility-analysis controls on reactive form bindings', () => {
    const analysisTemplates = collectFiles(ANALYSIS_ROOT, ['.html']);
    const manuallySynchronizedControl = /<(?:input|select|textarea)\b(?=[^>]*\[(?:value|checked|selected)\])(?=[^>]*\((?:input|change)\))[^>]*>/s;
    const violators = analysisTemplates.filter(path => manuallySynchronizedControl.test(source(path)));
    expect(violators, violationMessage(violators, 'Facility analysis controls must use reactive forms')).toHaveLength(0);
  });

  it('does not add template-driven forms outside the recorded debt allowlist', () => {
    const templates = productionFiles.filter(path => path.endsWith('.html'));
    const templateDriven = templates.filter(path => /\b(?:ngModel|ngModelChange)\b/.test(source(path)));
    const unexpected = templateDriven.filter(path => !TEMPLATE_DRIVEN_ALLOWLIST.has(v1Path(path)));
    const missingRecordedDebt = [...TEMPLATE_DRIVEN_ALLOWLIST]
      .filter(path => !templateDriven.some(template => v1Path(template) === path));
    expect(unexpected, violationMessage(unexpected, 'New template-driven forms are not allowed in production v1')).toHaveLength(0);
    expect(missingRecordedDebt, `Remove resolved files from TEMPLATE_DRIVEN_ALLOWLIST:\n  ${missingRecordedDebt.join('\n  ')}`).toHaveLength(0);
  });
});
