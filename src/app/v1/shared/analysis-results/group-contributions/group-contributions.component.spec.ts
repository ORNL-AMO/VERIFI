import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ContributionHeatmapComponent } from '../contribution-heatmap/contribution-heatmap.component';
import { GroupContributionsComponent } from './group-contributions.component';
import { GroupContributionsModule } from './group-contributions.module';
import { FacilityGroupContributionsView } from './group-contributions.view';

const CONTRIBUTIONS: FacilityGroupContributionsView = {
  groups: [{ groupId: 'electric', groupName: 'Electricity' }, { groupId: 'gas', groupName: 'Natural gas' }],
  years: [{ year: 2024, totalSavings: 100.5, totalSavingsPercent: 10.05, totalContributionPercent: 10.05,
    groups: [{ groupId: 'electric', groupName: 'Electricity', savings: 125.5, savingsPercent: 12.55, contributionPercent: 12.55 },
      { groupId: 'gas', groupName: 'Natural gas', savings: -25, savingsPercent: -5, contributionPercent: -2.5 }] }]
};

describe('shared group contribution presentation', () => {
  beforeEach(() => {
    TestBed.overrideComponent(ContributionHeatmapComponent, { set: { template: '' } });
    TestBed.configureTestingModule({ imports: [GroupContributionsModule] });
  });
  afterEach(() => TestBed.resetTestingModule());

  it('renders matching heatmap percentages and yearly/group savings with the existing default controls', () => {
    const fixture = TestBed.createComponent(GroupContributionsComponent);
    fixture.componentRef.setInput('view', CONTRIBUTIONS); fixture.componentRef.setInput('unit', 'MMBtu'); fixture.detectChanges();
    const heatmap = fixture.debugElement.query(By.directive(ContributionHeatmapComponent)).componentInstance as ContributionHeatmapComponent;
    expect(heatmap.view()).toEqual({ labels: ['Electricity', 'Natural gas'],
      years: [{ year: 2024, totalContributionPercent: 10.05, contributions: [12.55, -2.5] }] });
    expect(heatmap.showChartActions()).toBe(true); expect(heatmap.deferUntilVisible()).toBe(false); expect(heatmap.embedded()).toBe(false);
    const table = fixture.nativeElement.querySelector('table.v1-analysis-contributions-table') as HTMLTableElement;
    expect(table.querySelector('th[scope="rowgroup"]')?.textContent).toContain('2024');
    expect(table.querySelector('thead')?.textContent).toContain('MMBtu');
    expect(table.querySelector('tbody tr:last-child')?.textContent).toContain('-2.5%');
    expect(table.querySelectorAll('tbody tr:last-child td.is-negative')).toHaveLength(3);
  });

  it('supports report chart-only and table-only sections without changing the shared view', () => {
    const fixture = TestBed.createComponent(GroupContributionsComponent);
    fixture.componentRef.setInput('view', CONTRIBUTIONS); fixture.componentRef.setInput('showTable', false);
    fixture.componentRef.setInput('embedded', true); fixture.componentRef.setInput('showChartActions', false);
    fixture.componentRef.setInput('deferUntilVisible', true); fixture.detectChanges();
    const heatmap = fixture.debugElement.query(By.directive(ContributionHeatmapComponent)).componentInstance as ContributionHeatmapComponent;
    expect(heatmap.embedded()).toBe(true); expect(heatmap.showTitle()).toBe(false); expect(heatmap.showChartActions()).toBe(false); expect(heatmap.deferUntilVisible()).toBe(true);
    expect(fixture.nativeElement.querySelector('table.v1-analysis-contributions-table')).toBeNull();
    fixture.componentRef.setInput('showTable', true); fixture.componentRef.setInput('showChart', false); fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(ContributionHeatmapComponent))).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('table.v1-analysis-contributions-table tbody tr')).toHaveLength(3);
    expect(fixture.componentInstance.view()).toBe(CONTRIBUTIONS);
  });

  it('explains baseline-only or unavailable contribution data in an enabled report section', () => {
    const fixture = TestBed.createComponent(GroupContributionsComponent);
    fixture.componentRef.setInput('view', { groups: CONTRIBUTIONS.groups, years: [] });
    fixture.componentRef.setInput('embedded', true); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('Post-baseline results');
    expect(fixture.nativeElement.querySelector('.v1-analysis-contributions__empty-title')?.textContent).toBe('No group contribution results');
    expect(fixture.nativeElement.querySelector('table, app-contribution-heatmap')).toBeNull();
  });
});
