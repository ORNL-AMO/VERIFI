import { readFileSync } from 'fs';
import { join } from 'path';

describe('v1 foundation styles', () => {
  const foundationCss = readFileSync(join(__dirname, 'foundation.css'), 'utf8');

  it('uses action color only for action buttons and content-control color for navigation buttons', () => {
    expect(ruleFor('.v1-btn--action')).toContain('background: var(--v1-action)');
    expect(ruleFor('.v1-btn--action')).not.toContain('background: var(--v1-content-control)');
    expect(ruleFor('.v1-btn--secondary')).toContain('background: var(--v1-content-control)');
    expect(ruleFor('.v1-btn--blue')).toContain('background: var(--v1-content-control)');
  });

  it('uses the theme-aware warning color for deactivate actions', () => {
    expect(ruleFor('.v1-btn--deactivate')).toContain('var(--v1-warning)');
    expect(ruleFor('.v1-theme-dark')).toContain('--v1-warning: #d4a24a');
  });

  it('gives disabled settings controls a readable theme-aware surface instead of fading them', () => {
    const disabledControlRule = ruleFor(".v1-root .v1-settings-panel input:disabled:not([type='checkbox']):not([type='radio'])");

    expect(disabledControlRule).toContain('background-color: var(--v1-disabled-control-surface) !important');
    expect(disabledControlRule).toContain('color: var(--v1-disabled-control-text) !important');
    expect(disabledControlRule).toContain('-webkit-text-fill-color: var(--v1-disabled-control-text)');
    expect(disabledControlRule).toContain('opacity: 1');
  });

  it('provides shared breadcrumb and status-note styles for data workbenches', () => {
    expect(ruleFor('.v1-root .v1-data-context-breadcrumb ol')).toContain('display: flex');
    expect(ruleFor('.v1-root .v1-data-context-breadcrumb > ol > li > a')).toContain('color: var(--v1-link)');
    expect(ruleFor('.v1-root .v1-data-workbench-breadcrumb ol')).toContain('display: flex');
    expect(ruleFor('.v1-root .v1-data-workbench-status-notes')).toContain('display: grid');
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
