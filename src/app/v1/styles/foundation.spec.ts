import { readFileSync } from 'fs';
import { join } from 'path';

describe('v1 foundation button semantics', () => {
  const foundationCss = readFileSync(join(__dirname, 'foundation.css'), 'utf8');

  it('uses action color only for action buttons and content-control color for navigation buttons', () => {
    expect(ruleFor('.v1-btn--action')).toContain('background: var(--v1-action)');
    expect(ruleFor('.v1-btn--action')).not.toContain('background: var(--v1-content-control)');
    expect(ruleFor('.v1-btn--secondary')).toContain('background: var(--v1-content-control)');
    expect(ruleFor('.v1-btn--blue')).toContain('background: var(--v1-content-control)');
  });

  it('provides shared data breadcrumb styles for dashboard and workbench screens', () => {
    expect(ruleFor('.v1-root .v1-data-context-breadcrumb ol')).toContain('display: flex');
    expect(ruleFor('.v1-root .v1-data-context-breadcrumb > ol > li > a')).toContain('color: var(--v1-link)');
    expect(ruleFor('.v1-root .v1-data-workbench-breadcrumb ol')).toContain('display: flex');
  });

  function ruleFor(selector: string): string {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = foundationCss.match(new RegExp(`${escaped}[^{]*\\{([^}]+)\\}`));
    if (!match) {
      throw new Error(`Missing CSS rule for ${selector}.`);
    }
    return match[1];
  }
});
