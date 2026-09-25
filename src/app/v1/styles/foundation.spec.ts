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

  it('provides shared data breadcrumb styles for dashboard and workbench screens', () => {
    expect(ruleFor('.v1-root .v1-data-context-breadcrumb ol')).toContain('display: flex');
    expect(ruleFor('.v1-root .v1-data-context-breadcrumb > ol > li > a')).toContain('color: var(--v1-link)');
    expect(ruleFor('.v1-root .v1-data-workbench-breadcrumb ol')).toContain('display: flex');
  });

  it('anchors the skyline artwork at the bottom of the shared v1 background', () => {
    const rule = ruleFor('.v1-background-skyline-rocket,\n.v1-background-skyline-green,\n.v1-background-skyline-neon');

    expect(rule).toContain('background-position: center, center bottom, 0 0, 1.75rem 2.25rem, center');
    expect(rule).toContain('background-repeat: no-repeat, no-repeat, repeat, repeat, no-repeat');
    expect(rule).toContain('background-size: 100% 100%, var(--v1-skyline-art-size), 7rem 5rem, 11rem 8rem, 100% 100%');
  });

  it('scopes the workspace skyline to the central scroll pane', () => {
    const rule = ruleFor('.v1-root:is(.v1-background-skyline-rocket, .v1-background-skyline-green, .v1-background-skyline-neon) .v1-workspace .v1-workspace__main');

    expect(rule).toContain('background-image: var(--v1-skyline-background)');
    expect(rule).toContain('background-position: center, center bottom, 0 0, 1.75rem 2.25rem, center');
  });

  it('uses the refitted night skyline and continuing star field in dark mode', () => {
    const rule = ruleFor('.v1-theme-dark.v1-background-skyline-rocket');

    expect(rule).toContain("--v1-skyline-art: url('../../../assets/images/skylines/skyline-rocket-night.png')");
    expect(rule).toContain('--v1-skyline-sky: linear-gradient(90deg, #021936 0%');
    expect(rule).toContain('--v1-skyline-stars-primary: radial-gradient');
    expect(rule).toContain('--v1-skyline-stars-secondary: radial-gradient');
  });

  it('maps the green and neon skyline options to their artwork', () => {
    expect(ruleFor('.v1-root.v1-background-skyline-green'))
      .toContain("url('../../../assets/images/skylines/skyline-green.png')");
    expect(ruleFor('.v1-root.v1-background-skyline-neon'))
      .toContain("url('../../../assets/images/skylines/skyline-neon.png')");
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
