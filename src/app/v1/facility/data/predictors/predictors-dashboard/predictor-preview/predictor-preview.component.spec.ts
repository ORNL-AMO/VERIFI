import { TestBed } from '@angular/core/testing';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { PredictorPreviewComponent } from './predictor-preview.component';

describe('Predictor monthly preview', () => {
  it('keeps available history in the caption and supports bounded zoom and an empty state', () => {
    vi.spyOn(EChartsChartDirective.prototype, 'ngAfterViewInit').mockImplementation(() => {});
    TestBed.configureTestingModule({ imports: [PredictorPreviewComponent] });
    const fixture = TestBed.createComponent(PredictorPreviewComponent);
    fixture.componentRef.setInput('rows', [{ periodKey: '1', periodLabel: 'Jan 2025', sortValue: 1, values: { value: 0 } }, { periodKey: '2', periodLabel: 'Feb 2025', sortValue: 2, values: { value: -2 } }]);
    const zoom = vi.fn(); fixture.componentInstance.zoomChanged.subscribe(zoom); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Jan 2025 – Feb 2025'); fixture.componentInstance.changeZoom(.6); expect(zoom).toHaveBeenCalledWith({ start: 20, end: 80 });
    fixture.componentRef.setInput('rows', []); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('No predictors match'); vi.restoreAllMocks();
  });
});
