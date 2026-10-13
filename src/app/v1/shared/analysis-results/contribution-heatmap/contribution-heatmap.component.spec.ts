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
});

@Directive({
  selector: '[appV1ECharts]',
  standalone: true,
  providers: [{ provide: EChartsChartDirective, useExisting: forwardRef(() => EChartsStubDirective) }]
})
class EChartsStubDirective {
  @Input('appV1ECharts') option?: V1EChartsOption;
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
