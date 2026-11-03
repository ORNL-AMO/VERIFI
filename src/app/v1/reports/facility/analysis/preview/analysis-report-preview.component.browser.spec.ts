import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import * as echarts from 'echarts/core';
import { FacilityReportsModule } from '../../facility-reports.module';
import { FacilityAnalysisReportService } from '../analysis-report.service';
import { facilityAnalysisReportFixture } from '../testing/analysis-report-test-fixtures';
import { AnalysisReportPreviewComponent } from './analysis-report-preview.component';

describe('continuous report with multiple groups in Chromium', () => {
  afterEach(async () => { TestBed.resetTestingModule(); await page.viewport(1280, 900); });

  it('exposes every section immediately and initializes deep charts only when scrolled into view', async () => {
    const source = facilityAnalysisReportFixture(), first = source.analysis.groups[0];
    const second = { ...first, idbGroupId: 'second-group' }, analysis = { ...source.analysis, groups: [first, second] };
    const report = structuredClone(source.report);
    Object.assign(report.analysisReportSettings, { facilityGroupContributions: true,
      facilityGroupContributionsTable: true, facilityGroupContributionsGraphs: true });
    const before = structuredClone(report);
    const results = { ...source.results, groupSummaries: [{ ...source.results.groupSummaries[0], group: second }, source.results.groupSummaries[0]] };
    const labels = signal({ [first.idbGroupId]: 'Primary production group', 'second-group': 'Secondary process with a long descriptive group name' });
    const service = { context: { report: () => report, facility: () => source.facility, workspace: { facilityAnalyses: () => [analysis] } },
      state: signal({ state: 'ready', value: { results, checks: [] } }), groupNames: labels, setupRoute: () => ['/setup'] };
    TestBed.configureTestingModule({ imports: [FacilityReportsModule], providers: [provideRouter([]), { provide: FacilityAnalysisReportService, useValue: service }] });
    const fixture = TestBed.createComponent(AnalysisReportPreviewComponent);
    const root = fixture.nativeElement as HTMLElement;
    root.className = 'v1-root v1-palette-blueprint';
    root.style.cssText = 'height:650px;min-height:0;width:100%;overflow:auto';
    fixture.detectChanges();
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    const papers = root.querySelectorAll<HTMLElement>('article.report-document');
    expect(papers).toHaveLength(7);
    expect(root.querySelectorAll('app-analysis-report-results-table')).toHaveLength(9);
    const annualTables = root.querySelectorAll<HTMLTableElement>('.v1-analysis-results-table:not(.v1-analysis-results-table--monthly)');
    expect(annualTables).toHaveLength(3);
    for (const table of annualTables) {
      expect(table.caption).toBeNull();
      expect(table.getAttribute('aria-label')).toBe(table.closest('#analysis-report-facility-annual') ? 'Facility annual results' : 'Group annual results');
      expect(table.closest('[role=region]')?.getAttribute('aria-label')).toBe(table.getAttribute('aria-label'));
    }
    const monthlyTables = root.querySelectorAll<HTMLTableElement>('.v1-analysis-results-table--monthly');
    expect(Array.from(monthlyTables).map(table => table.caption?.textContent?.trim())).toEqual([
      'Baseline year — 2022', 'Report year — 2023', 'Baseline year — 2022', 'Report year — 2023', 'Baseline year — 2022', 'Report year — 2023'
    ]);
    for (const table of monthlyTables) {
      expect(getComputedStyle(table.caption!).display).toBe('table-caption');
      expect(getComputedStyle(table.caption!).visibility).toBe('visible');
      expect(table.caption!.getBoundingClientRect().height).toBeGreaterThan(0);
    }
    expect(root.querySelector('[role=tablist], [role=tabpanel], select')).toBeNull();
    const contributions = root.querySelector<HTMLElement>('#analysis-report-facility-group-contributions')!;
    expect(Array.from(root.querySelectorAll('.document-section-title')).slice(0, 4).map(heading => heading.textContent)).toEqual([
      'Annual facility analysis', 'Monthly facility analysis', 'Group contributions', 'Primary production group — Annual results'
    ]);
    expect(contributions.querySelector('table.v1-analysis-contributions-table tbody tr')).not.toBeNull();
    expect(contributions.querySelectorAll('.v1-contribution-heatmap__accessible-data tbody tr')).toHaveLength(1);
    expect(contributions.querySelector('h2, button[aria-label^="Download"]')).toBeNull();
    expect(contributions.querySelector('app-contribution-heatmap h2, app-contribution-heatmap h4')).toBeNull();
    const accessibleTable = contributions.querySelector<HTMLTableElement>('.v1-contribution-heatmap__accessible-data')!;
    const accessibleWrapper = accessibleTable.parentElement!;
    expect(accessibleWrapper.classList.contains('v1-sr-only')).toBe(true);
    expect(getComputedStyle(accessibleWrapper).position).toBe('absolute');
    expect(getComputedStyle(accessibleWrapper).display).not.toBe('none');
    expect(getComputedStyle(accessibleWrapper).visibility).not.toBe('hidden');
    expect(accessibleTable.closest('[aria-hidden="true"], [hidden]')).toBeNull();
    const contributionCanvas = contributions.querySelector<HTMLElement>('.v1-contribution-heatmap__chart')!;
    expect(contributionCanvas.querySelector('canvas')).toBeNull();
    const last = papers[papers.length - 1], canvas = last.querySelector<HTMLElement>('.v1-meter-results-chart__chart')!;
    expect(last.querySelectorAll('.v1-meter-results-chart__accessible-data tbody tr')).toHaveLength(48);
    expect(canvas.querySelector('canvas')).toBeNull();
    expect(last.querySelector('.document-section-title')?.textContent).toContain('Secondary process');
    canvas.scrollIntoView({ block: 'center' });
    await vi.waitFor(() => expect(canvas.querySelector('canvas')).not.toBeNull());
    const chart = echarts.getInstanceByDom(canvas)!;
    labels.update(value => ({ ...value, 'second-group': 'Renamed process group' })); fixture.detectChanges();
    expect(last.querySelector('.document-section-title')?.textContent).toContain('Renamed process group');
    expect(echarts.getInstanceByDom(canvas)).toBe(chart);
    expect(contributions.querySelector('table.v1-analysis-contributions-table')?.textContent).toContain('Renamed process group');
    contributionCanvas.scrollIntoView({ block: 'center' });
    await vi.waitFor(() => expect(contributionCanvas.querySelector('canvas')).not.toBeNull());
    const contributionChart = echarts.getInstanceByDom(contributionCanvas)!;

    const scroll = last.querySelector<HTMLElement>('app-analysis-report-results-table .v1-table-scroll')!;
    scroll.focus();
    await userEvent.keyboard('{ArrowRight}');
    await vi.waitFor(() => expect(scroll.scrollLeft).toBeGreaterThan(0));
    expect(document.activeElement).toBe(scroll);
    for (const classes of ['', ' v1-theme-dark', ' v1-theme-dark v1-contrast-strong']) {
      root.className = 'v1-root v1-palette-blueprint' + classes;
      for (const width of [1440, 640, 390]) {
        await page.viewport(width, 900); await new Promise(requestAnimationFrame);
        expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
        expect(contributionCanvas.getBoundingClientRect().width).toBeGreaterThan(0);
        expect(contributions.getBoundingClientRect().width).toBeLessThanOrEqual(root.clientWidth);
        expect(accessibleWrapper.getBoundingClientRect().width).toBeLessThanOrEqual(1);
        expect(accessibleWrapper.getBoundingClientRect().height).toBeLessThanOrEqual(1);
        expect(papers[1].getBoundingClientRect().top - papers[0].getBoundingClientRect().bottom)
          .toBeCloseTo(2 * parseFloat(getComputedStyle(document.documentElement).fontSize), 0);
      }
    }
    const contributionScroll = contributions.querySelector<HTMLElement>('.v1-table-scroll[role=region]')!;
    expect(contributionScroll.getAttribute('aria-label')).toBe('Group contributions by fiscal year');
    contributionScroll.scrollIntoView({ block: 'center' }); contributionScroll.focus();
    await userEvent.keyboard('{ArrowRight}');
    await vi.waitFor(() => expect(contributionScroll.scrollLeft).toBeGreaterThan(0));
    expect(document.activeElement).toBe(contributionScroll);
    contributionScroll.scrollLeft = 0;
    contributions.querySelector<HTMLElement>('.v1-contribution-heatmap__scroll')!.scrollLeft = 0;
    const rootStyle = root.style.cssText;
    root.style.height = 'auto'; root.style.overflow = 'visible';
    root.className = 'v1-root v1-palette-blueprint';
    await page.viewport(1440, 1100); contributions.scrollIntoView({ block: 'start' });
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    await page.screenshot({ element: contributions, path: './__screenshots__/facility-analysis-contributions-desktop-light.png' });
    root.className = 'v1-root v1-palette-blueprint v1-theme-dark';
    await page.viewport(390, 1100); contributions.scrollIntoView({ block: 'start' });
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    await page.screenshot({ element: contributions, path: './__screenshots__/facility-analysis-contributions-narrow-dark.png' });
    root.style.cssText = rootStyle;
    expect(report).toEqual(before);
    fixture.destroy();
    expect(chart.isDisposed()).toBe(true);
    expect(contributionChart.isDisposed()).toBe(true);
  });
});
