import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PredictorWorkbenchQualityReportComponent } from '../../predictor-workbench/quality-report/predictor-workbench-quality-report.component';
import { WeatherPredictorQualityComponent } from './weather-predictor-quality.component';

@Component({
  selector: 'app-predictor-workbench-quality-report',
  template: '<p>Route-owned quality report</p>',
  standalone: true
})
class QualityReportStubComponent { }

describe('WeatherPredictorQualityComponent', () => {
  it('hosts the route-owned quality report without entity bindings', () => {
    TestBed.configureTestingModule({ imports: [WeatherPredictorQualityComponent] });
    TestBed.overrideComponent(WeatherPredictorQualityComponent, {
      remove: { imports: [PredictorWorkbenchQualityReportComponent] },
      add: { imports: [QualityReportStubComponent] }
    });

    const fixture = TestBed.createComponent(WeatherPredictorQualityComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Route-owned quality report');
  });
});
