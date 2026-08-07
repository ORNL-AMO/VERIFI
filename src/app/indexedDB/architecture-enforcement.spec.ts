/**
 * Architecture-enforcement tests for the workspace write boundary.
 *
 * These tests scan production TypeScript source to verify that:
 * - No component or feature service imports DbChangesService.
 * - No component or feature service calls IndexedDB write methods directly.
 * - Approved infrastructure paths are the only callers of repository writes.
 *
 * A failing test means a direct write path was introduced outside the boundary.
 * Correct the production file by routing through WorkspaceCommandBoundary or
 * a domain handler, then re-run this suite.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const APP_ROOT = join(__dirname, '..');

/** Collect all *.ts files under a directory, excluding spec files. */
function collectSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectSourceFiles(full, files);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts') && !entry.endsWith('.browser.spec.ts')) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Infrastructure allowlist — repository write calls are permitted in these paths.
 * Match against the file path suffix relative to src/app/.
 */
const WRITE_ALLOWLIST_PATTERNS: RegExp[] = [
  // IndexedDB object-store services own their writes
  /indexedDB\//,
  // Domain command handlers are the permitted write delegation layer
  /account-workspace\/handlers\//,
  // Workspace command boundary orchestrates handlers
  /account-workspace\/workspace-command-boundary/,
  // Cascade delete is infrastructure used by FacilityCommandHandler
  /indexedDB\/indexed-db-cascade-delete/,
  // Transaction adapter is a low-level primitive
  /indexedDB\/indexed-db-transaction/,
  // Data migrations run outside normal write flows
  /indexedDB\/data-migrations\//,
  // Application lifecycle manages startup/catalog writes
  /application-lifecycle\//,
  // Backup data service is called inside boundary persist functions
  /shared\/helper-services\/backup-data\.service/,
  // Spreadsheet upload service is called inside boundary persist functions
  /data-management\/data-management-import\/import-services\/upload-data\.service/,
  // AccountWorkspaceService and loader are infrastructure
  /account-workspace\/account-workspace\.service/,
  /account-workspace\/account-workspace-loader\.service/,
  // Analytics data service is observational, not account-workspace data
  /analytics\/analytics\.service/,
  // Electron backups db service writes are Electron-only metadata, not workspace data
  /electron\/automatic-backups\.service/,
];

const DB_WRITE_PATTERN = /\.(addWithObservable|updateWithObservable|deleteWithObservable|deleteIndexWithObservable)\(/;

function isAllowlisted(filePath: string): boolean {
  const normalised = filePath.replace(/\\/g, '/');
  return WRITE_ALLOWLIST_PATTERNS.some(p => p.test(normalised));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('workspace write boundary architecture', () => {
  const allSourceFiles = collectSourceFiles(APP_ROOT);

  it('no production source file imports DbChangesService', () => {
    const violators = allSourceFiles.filter(f => {
      const content = readFileSync(f, 'utf8');
      return /import[^;]+DbChangesService/.test(content);
    });

    expect(violators, formatViolations(violators, 'imports DbChangesService')).toHaveLength(0);
  });

  it('no component or feature service calls a repository write method directly', () => {
    const violators = allSourceFiles
      .filter(f => !isAllowlisted(f))
      .filter(f => {
        const content = readFileSync(f, 'utf8');
        // Ignore commented-out lines
        const uncommented = content
          .split('\n')
          .filter(line => !line.trimStart().startsWith('//'))
          .join('\n');
        return DB_WRITE_PATTERN.test(uncommented);
      });

    expect(violators, formatViolations(violators, 'calls repository write methods directly')).toHaveLength(0);
  });
});

function formatViolations(files: string[], label: string): string {
  if (files.length === 0) { return ''; }
  const paths = files.map(f => f.replace(APP_ROOT, 'src/app')).join('\n  ');
  return `Files that ${label}:\n  ${paths}`;
}
