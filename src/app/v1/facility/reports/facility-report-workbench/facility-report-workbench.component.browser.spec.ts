import { page } from 'vitest/browser';
import { setupReportWorkbench } from '../testing/report-workbench-test-setup';
import { reportFixture } from '../testing/report-test-fixtures';

describe('facility report workbench browser layout', () => {
  afterEach(async () => { await page.viewport(1280, 720); });
  it.each([
    ['light', [], 960], ['dark', ['v1-theme-dark'], 760],
    ['high-contrast', ['v1-theme-dark', 'v1-contrast-strong'], 420]
  ] as const)('keeps connected content, themed controls, and usable navigation in %s', async (_theme, classes, width) => {
    await page.viewport(width, 800);
    const { open, harness } = await setupReportWorkbench([
      reportFixture({ name: 'A long facility report name that should remain readable in a narrow desktop window without pushing navigation out of view' }),
      reportFixture({ id: 20, guid: 'report-b', name: 'Another report', facilityReportType: 'overview' })
    ]);
    await open();
    const host = harness.fixture.nativeElement as HTMLElement;
    host.classList.add('v1-root', ...classes);
    Object.assign(host.style, { display: 'block', width: `${width}px`, height: '700px', overflow: 'auto' });
    // Production wraps the workbench in a workspace shell; avoid the root-only outlet overflow rule in this isolated fixture.
    Object.assign((host.querySelector('app-facility-report-workbench') as HTMLElement).style,
      { display: 'flex', overflow: 'visible', minHeight: '100%' });
    harness.detectChanges();
    const input = host.querySelector<HTMLInputElement>('#report-workbench-name')!;
    input.focus();
    expect(document.activeElement).toBe(input);
    expect(getComputedStyle(input).color).toBe(getComputedStyle(host).color);
    const panels = [...host.querySelectorAll<HTMLElement>('.report-section')];
    expect(panels).toHaveLength(1);
    expect(getComputedStyle(panels[0]).borderTopLeftRadius).toBe('0px');
    expect(getComputedStyle(panels.at(-1)!).borderBottomLeftRadius).not.toBe('0px');
    const header = host.querySelector<HTMLElement>('header')!;
    const stages = host.querySelector<HTMLElement>('app-analysis-stage-navigation')!;
    expect(panels[0].getBoundingClientRect().top).toBeCloseTo(stages.getBoundingClientRect().bottom, 0);
    expect(header.querySelector('.report-facts')).not.toBeNull();
    expect(host.scrollWidth).toBeLessThanOrEqual(width + 1);
    const footer = host.querySelector('footer')!;
    expect(footer.querySelectorAll('a')).toHaveLength(2);
    const sticky = host.querySelector<HTMLElement>('.report-workbench-sticky')!;
    expect(getComputedStyle(sticky).borderTopLeftRadius).toBe(getComputedStyle(header).borderTopLeftRadius);
    expect(getComputedStyle(sticky).borderTopLeftRadius).not.toBe('0px');
    const extra = document.createElement('div');
    extra.style.height = '800px';
    host.querySelector('main')!.append(extra);
    host.scrollTop = 300;
    expect(sticky.getBoundingClientRect().top).toBeCloseTo(host.getBoundingClientRect().top, 0);
    extra.remove();
    host.scrollTop = 0;
  });
});
