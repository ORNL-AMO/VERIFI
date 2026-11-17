import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ExplorationModule } from '../exploration.module';
import { ExplorationChartComponent } from './exploration-chart.component';
import { explorationFixture } from '@domain/visualizations/testing/exploration-fixtures';
import { prepareExploration } from '@domain/visualizations/visualization-exploration';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';

// Rendering is covered in Chromium; this regression protects the chart-only UI.
describe('exploration chart-only presentation', () => {
  beforeEach(() => vi.spyOn(EChartsChartDirective.prototype, 'ngAfterViewInit').mockImplementation(() => {}));
  afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); });
  it.each(['correlation', 'heatmap'] as const)('omits inspection, tables, reset controls and local validation for %s', async kind => {
    TestBed.configureTestingModule({ imports: [ExplorationModule] });
    const input = explorationFixture(3, kind === 'heatmap' ? { kind, dimension: 'series-period', scale: 'linear' } : { kind, statistic: 'r', scale: 'raw', view: 'matrix' });
    const model = await prepareExploration(input.definition, [input.evidence], new AbortController().signal);
    const fixture = TestBed.createComponent(ExplorationChartComponent);
    fixture.componentRef.setInput('model', { ...model, warnings: ['Chart-local data validation detail'] }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table, select, button, .inspection')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Chart-local data validation detail');
    expect(fixture.debugElement.query(By.directive(EChartsChartDirective))).not.toBeNull();
    fixture.destroy();
  });
});
