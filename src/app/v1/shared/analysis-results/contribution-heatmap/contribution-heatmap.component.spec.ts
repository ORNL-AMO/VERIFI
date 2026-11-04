import { Directive, Input, forwardRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { ContributionHeatmapComponent } from './contribution-heatmap.component';

describe('ContributionHeatmapComponent', () => {
  it.each(['Facility', 'Group'] as const)('labels and downloads the %s heatmap', scopeLabel => {
    const fixture = setup(scopeLabel);
    const region = fixture.nativeElement.querySelector('[role="region"]');
    expect(region.getAttribute('aria-label')).toBe(`Scrollable ${scopeLabel.toLowerCase()} contribution heatmap`);
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(fixture.nativeElement.querySelector('[role="img"]').getAttribute('aria-label')).toContain('Green indicates savings and red indicates losses.');
    expect(fixture.nativeElement.querySelector('h2')?.textContent).toBe(`${scopeLabel} Contributions by Fiscal Year`);
    fixture.nativeElement.querySelector('button').click();
    const chart = fixture.debugElement.query(By.directive(EChartsStubDirective)).injector.get(EChartsStubDirective);
    expect(chart.downloadPng).toHaveBeenCalledWith('test-contributions');
  });

  it('keeps the full chart height as rows and fiscal years are added', () => {
    const fixture = setup('Facility');
    fixture.componentRef.setInput('compact', true);
    fixture.componentRef.setInput('view', { labels: Array.from({ length: 13 }, (_, index) => `Plant ${index}`),
      years: Array.from({ length: 5 }, (_, index) => ({ year: 2020 + index, totalContributionPercent: 0, contributions: Array(13).fill(0) })) });
    fixture.detectChanges();
    const chart = fixture.nativeElement.querySelector('[role="img"]') as HTMLElement;
    expect(chart.style.height).toBe('586px');
    expect(chart.style.minWidth).toBe('760px');
  });

  it('embeds report charts without download actions and keeps accessible data available before deferred drawing', () => {
    const fixture = setup('Group');
    fixture.componentRef.setInput('embedded', true); fixture.componentRef.setInput('showTitle', false); fixture.componentRef.setInput('showChartActions', false);
    fixture.componentRef.setInput('deferUntilVisible', true); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button, h2, h4, .v1-contribution-heatmap__actions')).toBeNull();
    const chart = fixture.debugElement.query(By.directive(EChartsStubDirective)).injector.get(EChartsStubDirective);
    expect(chart.deferUntilVisible).toBe(true);
    const accessible = fixture.nativeElement.querySelector('table.v1-contribution-heatmap__accessible-data') as HTMLTableElement;
    expect(accessible.closest('.v1-sr-only')).not.toBeNull();
    expect(accessible.closest('[aria-hidden=true], [hidden]')).toBeNull();
    expect(accessible.querySelector('thead')?.textContent).toContain('North');
    expect(accessible.querySelector('tbody')?.textContent).toContain('2024');
    expect(accessible.querySelectorAll('tbody td')[1].textContent).toBe('1.25%');
  });
});

@Directive({
  selector: '[appV1ECharts]',
  standalone: true,
  providers: [{ provide: EChartsChartDirective, useExisting: forwardRef(() => EChartsStubDirective) }]
})
class EChartsStubDirective {
  @Input('appV1ECharts') option?: V1EChartsOption;
  @Input() deferUntilVisible = false;
  readonly downloadPng = vi.fn();
}

function setup(scopeLabel: 'Facility' | 'Group') {
  TestBed.overrideComponent(ContributionHeatmapComponent, {
    remove: { imports: [EChartsChartDirective] }, add: { imports: [EChartsStubDirective] }
  });
  TestBed.configureTestingModule({ imports: [ContributionHeatmapComponent] });
  const fixture = TestBed.createComponent(ContributionHeatmapComponent);
  fixture.componentRef.setInput('scopeLabel', scopeLabel);
  fixture.componentRef.setInput('downloadFileName', 'test-contributions');
  fixture.componentRef.setInput('view', { labels: ['North'], years: [
    { year: 2024, totalContributionPercent: 1.25, contributions: [1.25] }
  ] });
  fixture.detectChanges();
  return fixture;
}
