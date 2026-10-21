import { Directive, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { GroupVisualizationSession } from './group-visualization-session.service';
import { GroupVisualizationComponent } from './group-visualization.component';
import { visualizationFixture } from './group-visualization.testing';
import { CorrelationChartComponent } from './correlation-chart/correlation-chart.component';

@Directive({ selector: '[appV1ECharts]', standalone: true })
class ChartStub { @Input('appV1ECharts') option: unknown; }

describe('GroupVisualizationComponent controls', () => {
  function setup() {
    const data = visualizationFixture();
    TestBed.overrideComponent(GroupVisualizationComponent, { remove: { imports: [EChartsChartDirective] }, add: { imports: [ChartStub] } });
    TestBed.overrideComponent(CorrelationChartComponent, { remove: { imports: [EChartsChartDirective] }, add: { imports: [ChartStub] } });
    TestBed.configureTestingModule({ imports: [GroupVisualizationComponent], providers: [GroupVisualizationSession,
      { provide: FacilityAnalysisGroupContext, useValue: data.context },
      { provide: WorkspaceCalendarizationService, useValue: data.calendarization }] });
    const fixture = TestBed.createComponent(GroupVisualizationComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const click = (label: string) => {
      const button = [...host.querySelectorAll('button')].find(item => item.textContent?.trim() === label || item.getAttribute('aria-label') === label);
      expect(button, label).toBeDefined();
      button!.click(); fixture.detectChanges();
    };
    return { ...data, fixture, host, click, facade: fixture.componentInstance.facade };
  }

  it('uses the analysis period without date controls and shows both chart types', () => {
    const { fixture, host, facade, context, update } = setup();
    expect(host.querySelector('input[type="month"]')).toBeNull();
    expect(facade.analysisRange()).toEqual({ start: '2024-01', end: '2024-06' });
    expect(host.querySelector('.visualization-time-series')).not.toBeNull();
    expect(host.querySelectorAll('app-correlation-chart')).toHaveLength(1);
    expect(host.querySelector('table')).toBeNull();
    expect(host.querySelector('[aria-label="Visualization view"]')).toBeNull();
    expect(host.querySelector('header')).toBeNull();
    expect(host.textContent).not.toContain('Explore monthly');
    expect(host.textContent).not.toContain('Baseline onward');
    expect(host.textContent).not.toContain('Full history');
    expect(facade.filteredPoints()).toHaveLength(6);
    expect(facade.correlations()[0].summary.pairs).toHaveLength(6);
    expect(host.querySelector('app-correlation-chart')?.textContent).not.toContain('paired months');
    context.autosave.draft.update(analysis => ({ ...analysis, baselineYear: 2025 }));
    fixture.detectChanges();
    expect(host.textContent).toContain('No group data is available in the analysis period');
    expect(host.querySelector('.visualization-time-series')).toBeNull();
    context.autosave.draft.update(analysis => ({ ...analysis, baselineYear: 2024 }));
    fixture.detectChanges();
    expect(facade.filteredPoints()).toHaveLength(6);
    expect(update).not.toHaveBeenCalled();
  });

  it('supports accessible predictor toggles, all-off state, zoom/reset, and restores a recreated page', () => {
    const { fixture, host, facade, click, update } = setup();
    const locked = host.querySelector<HTMLButtonElement>('.visualization-chip--locked')!;
    expect(locked.textContent?.trim()).toBe('Group usage');
    expect(locked.getAttribute('aria-pressed')).toBe('true');
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    locked.click(); fixture.detectChanges();
    expect(facade.preferences().visiblePredictors).toEqual(['predictor-a']);
    const chips = host.querySelectorAll<HTMLButtonElement>('.visualization-chip:not(.visualization-chip--locked)');
    expect(chips[0].textContent?.trim()).toBe('Production');
    expect(chips[1].textContent?.trim()).toBe('Temperature');
    expect(chips[0].getAttribute('aria-pressed')).toBe('true');
    expect(chips[1].getAttribute('aria-pressed')).toBe('false');
    chips[1].click(); fixture.detectChanges();
    expect(host.textContent).not.toContain('Predictors use mixed units');
    click('Zoom in');
    expect(facade.preferences().zoom).toEqual({ start: 20, end: 80 });
    click('Reset zoom');
    expect(facade.preferences().zoom).toEqual({ start: 0, end: 100 });
    chips[0].click(); chips[1].click(); fixture.detectChanges();
    expect(host.textContent).toContain('No predictors selected');
    expect(host.querySelector('.visualization-time-series')).not.toBeNull();
    fixture.destroy();
    const reopened = TestBed.createComponent(GroupVisualizationComponent);
    reopened.detectChanges();
    expect(reopened.componentInstance.facade.preferences()).toMatchObject({ visiblePredictors: [] });
    expect(reopened.nativeElement.querySelector('.visualization-time-series')).not.toBeNull();
    expect(reopened.nativeElement.querySelector('app-correlation-chart')).toBeNull();
    expect(reopened.nativeElement.textContent).not.toContain('Exploratory relationships');
    expect(reopened.nativeElement.querySelector('.visualization-chip--locked')?.getAttribute('aria-pressed')).toBe('true');
    expect(update).not.toHaveBeenCalled();
  });

  it('isolates a predictor on double-click or Shift+Enter without changing group usage, zoom, scale, or analysis', () => {
    const { fixture, host, facade, context, update } = setup();
    const original = structuredClone(context.autosave.draft());
    const chips = host.querySelectorAll<HTMLButtonElement>('.visualization-chip:not(.visualization-chip--locked)');
    const doubleClick = (button: HTMLButtonElement) => {
      button.click(); button.click(); button.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      fixture.detectChanges();
    };
    facade.update({ scale: 'z-score', zoom: { start: 20, end: 80 } });
    // Isolate an initially hidden predictor, then an already visible one.
    doubleClick(chips[1]);
    expect(facade.preferences()).toMatchObject({ visiblePredictors: ['predictor-b'], scale: 'z-score', zoom: { start: 20, end: 80 } });
    expect(host.querySelectorAll('app-correlation-chart')).toHaveLength(1);
    const style = facade.visiblePredictors()[0].style;
    doubleClick(chips[1]);
    expect(facade.preferences().visiblePredictors).toEqual(['predictor-b']);
    expect(facade.visiblePredictors()[0].style).toEqual(style);
    chips[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(facade.preferences().visiblePredictors).toEqual(['predictor-a']);
    expect((fixture.componentInstance.option() as any).series.map((series: any) => series.id)).toEqual(['group-usage', 'predictor-a']);
    expect(host.querySelector('.visualization-chip--locked')?.getAttribute('aria-pressed')).toBe('true');
    chips[1].click(); fixture.detectChanges();
    expect(facade.visiblePredictors()).toHaveLength(2);
    expect(context.autosave.draft()).toEqual(original);
    expect(update).not.toHaveBeenCalled();
  });

  it('renders loading, error/retry, missing-predictor, and empty-group states', () => {
    const { fixture, host, base, calendarization, context, click } = setup();
    base.next({ state: 'evaluating', meters: [] }); fixture.detectChanges();
    expect(host.textContent).toContain('Preparing monthly data');
    expect(host.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]')?.disabled).toBe(true);
    base.next({ state: 'error', meters: [], error: { code: 'calculation-failed', message: 'Calendarization unavailable' } }); fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Calendarization unavailable');
    click('Retry');
    expect(calendarization.retry).toHaveBeenCalledOnce();
    context.workbench.workspace.facilityPredictors.set([]);
    base.next({ state: 'ready', meters: [] }); fixture.detectChanges();
    expect(host.textContent).toContain('No facility predictors');
    expect(host.textContent).toContain('No monthly group data');
  });

  it('switches scale through a typed control, retains zoom and mode across tabs, and keeps raw correlations', () => {
    const { fixture, facade, host, update } = setup();
    expect(fixture.componentInstance.scaleControl.value).toBe('raw');
    const correlation = facade.correlations()[0].summary;
    facade.update({ zoom: { start: 20, end: 80 } });
    host.querySelector<HTMLInputElement>('input[value="z-score"]')!.click(); fixture.detectChanges();
    expect(facade.preferences().scale).toBe('z-score');
    expect((fixture.componentInstance.option() as any).yAxis).toHaveLength(1);
    expect(facade.preferences().zoom).toEqual({ start: 20, end: 80 });
    expect(facade.correlations()[0].summary).toEqual(correlation);
    fixture.destroy();
    const reopened = TestBed.createComponent(GroupVisualizationComponent); reopened.detectChanges();
    expect(reopened.componentInstance.scaleControl.value).toBe('z-score');
    expect((reopened.componentInstance.option() as any).yAxis).toHaveLength(1);
    reopened.nativeElement.querySelector('input[value="raw"]').click(); reopened.detectChanges();
    expect((reopened.componentInstance.option() as any).yAxis).toHaveLength(2);
    expect(update).not.toHaveBeenCalled();
  });

  it('explains a constant series in z-score mode without changing its raw data', () => {
    const { fixture, host, base, meters, facade } = setup();
    const original = meters[0].monthlyData.map(row => ({ ...row, energyUse: 7 }));
    base.next({ state: 'ready', meters: [{ ...meters[0], monthlyData: original }] });
    fixture.componentInstance.scaleControl.setValue('z-score'); fixture.detectChanges();
    expect(host.textContent).toContain('Z-scores unavailable for Group usage');
    expect(facade.filteredPoints().every(point => point.usage === 7)).toBe(true);
    fixture.componentInstance.scaleControl.setValue('raw'); fixture.detectChanges();
    expect(host.textContent).not.toContain('Z-scores unavailable');
    expect((fixture.componentInstance.option() as any).series[0].data.every(value => value === 7)).toBe(true);
  });
});
