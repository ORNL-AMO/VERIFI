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
    const report = structuredClone(source.report), before = structuredClone(report);
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
    expect(papers).toHaveLength(6);
    expect(root.querySelectorAll('app-analysis-report-results-table')).toHaveLength(9);
    expect(root.querySelector('[role=tablist], [role=tabpanel], select')).toBeNull();
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
        expect(papers[1].getBoundingClientRect().top - papers[0].getBoundingClientRect().bottom)
          .toBeCloseTo(2 * parseFloat(getComputedStyle(document.documentElement).fontSize), 0);
      }
    }
    expect(report).toEqual(before);
    fixture.destroy();
    expect(chart.isDisposed()).toBe(true);
  });
});
