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

  it('fills the shared v1 background with bottom-anchored skyline artwork', () => {
    const rule = ruleFor('.v1-background-skyline-rocket,\n.v1-background-skyline-rocket-night,\n.v1-background-skyline-green,\n.v1-background-skyline-neon,\n.v1-background-skyline-aurora,\n.v1-background-skyline-blueprint,\n.v1-background-skyline-steel');

    expect(rule).toContain('background-position: center, center bottom');
    expect(rule).toContain('background-repeat: no-repeat');
    expect(rule).toContain('background-size: 100% 100%, cover');
  });

  it('scopes the workspace skyline to the central scroll pane', () => {
    const rule = ruleFor('.v1-root:is(.v1-background-skyline-rocket, .v1-background-skyline-rocket-night, .v1-background-skyline-green, .v1-background-skyline-neon, .v1-background-skyline-aurora, .v1-background-skyline-blueprint, .v1-background-skyline-steel) .v1-workspace .v1-workspace__main');

    expect(rule).toContain('background-image: var(--v1-skyline-background)');
    expect(rule).toContain('background-position: center, center bottom');
    expect(rule).toContain('background-size: 100% 100%, cover');
  });

  it('uses the complete night artwork in dark mode without a generated sky layer', () => {
    const rule = ruleFor('.v1-theme-dark.v1-background-skyline-rocket');

    expect(rule).toContain("--v1-skyline-art: url('../../../assets/images/skylines/skyline-rocket-night.png')");
    expect(rule).not.toContain('--v1-skyline-sky');
    expect(rule).not.toContain('--v1-skyline-stars');
    expect(ruleFor('.v1-root.v1-background-skyline-rocket-night'))
      .toContain("url('../../../assets/images/skylines/skyline-rocket-night.png')");
  });

  it('maps each palette skyline option to its artwork', () => {
    expect(ruleFor('.v1-root.v1-background-skyline-green'))
      .toContain("url('../../../assets/images/skylines/skyline-green.png')");
    expect(ruleFor('.v1-root.v1-background-skyline-neon'))
      .toContain("url('../../../assets/images/skylines/skyline-neon.png')");
    expect(ruleFor('.v1-root.v1-background-skyline-aurora'))
      .toContain("url('../../../assets/images/skylines/skyline-aurora.png')");
    expect(ruleFor('.v1-root.v1-background-skyline-blueprint'))
      .toContain("url('../../../assets/images/skylines/skyline-engineering-sketch.png')");
    expect(ruleFor('.v1-root.v1-background-skyline-steel'))
      .toContain("url('../../../assets/images/skylines/skyline-steel-cnc.png')");
  });

  it('retains the generated blueprint grid and steel hatch backgrounds', () => {
    expect(ruleFor('.v1-background-blueprint-grid')).toContain('linear-gradient');
    expect(ruleFor('.v1-background-blueprint-grid')).toContain('background-size: 1.5rem 1.5rem');
    expect(ruleFor('.v1-background-steel-hatch')).toContain('repeating-linear-gradient');
    expect(ruleFor('.v1-background-steel-hatch')).toContain('radial-gradient');
  });

  it('uses the portrait skyline artwork on narrow screens', () => {
    expect(foundationCss).toContain("url('../../../assets/images/skylines/skyline-rocket-mobile.png')");
    expect(foundationCss).toContain("url('../../../assets/images/skylines/skyline-rocket-night-mobile.png')");
    expect(foundationCss).toContain("url('../../../assets/images/skylines/skyline-green-mobile.png')");
    expect(foundationCss).toContain("url('../../../assets/images/skylines/skyline-neon-mobile.png')");
    expect(foundationCss).toContain("url('../../../assets/images/skylines/skyline-aurora-mobile.png')");
    expect(foundationCss).toContain("url('../../../assets/images/skylines/skyline-engineering-sketch-mobile.png')");
    expect(foundationCss).toContain("url('../../../assets/images/skylines/skyline-steel-cnc-mobile.png')");
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
