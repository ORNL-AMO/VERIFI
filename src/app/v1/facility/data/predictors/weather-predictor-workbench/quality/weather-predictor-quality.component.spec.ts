import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorWorkbenchQualityReportComponent } from '../../predictor-workbench/quality-report/predictor-workbench-quality-report.component';
import { WeatherPredictorQualityComponent } from './weather-predictor-quality.component';

@Component({
  selector: 'app-predictor-workbench-quality-report',
  template: '<p>{{ predictor?.name }}</p>',
  standalone: true
})
class QualityReportStubComponent {
  @Input() predictor?: { guid: string; name: string };
  @Input() readings: readonly unknown[] = [];
  @Input() findings: readonly unknown[] = [];
  @Input() idPrefix = '';
  @Input() embedded = false;
  @Output() readingsRequested = new EventEmitter<void>();
  @Output() setupRequested = new EventEmitter<void>();
}

describe('WeatherPredictorQualityComponent', () => {
  it('shows only the report selected by the predictor quality route', () => {
    const routeParameters = new BehaviorSubject<ParamMap>(convertToParamMap({ predictorGuid: 'weather-b' }));
    const predictors = [
      { guid: 'weather-a', name: 'HDD 65', predictorType: 'Weather' },
      { guid: 'weather-b', name: 'CDD 70', predictorType: 'Weather' }
    ];
    TestBed.configureTestingModule({
      imports: [WeatherPredictorQualityComponent],
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: routeParameters,
            snapshot: { paramMap: routeParameters.value }
          }
        },
        {
          provide: WorkspaceNavigationService,
          useValue: { facilityWeatherPredictorRoute: vi.fn(() => ['/weather']) }
        },
        {
          provide: FacilityPredictorsWorkspaceService,
          useValue: {
            facility: signal({ guid: 'facility-a' }),
            selectedWeatherGroup: signal({ routeKey: 'station:KORD', statusFindings: [] }),
            selectedWeatherPredictors: signal(predictors),
            selectedWeatherReadings: signal([
              { guid: 'reading-a', predictorId: 'weather-a' },
              { guid: 'reading-b', predictorId: 'weather-b' }
            ])
          }
        }
      ]
    });
    TestBed.overrideComponent(WeatherPredictorQualityComponent, {
      remove: { imports: [PredictorWorkbenchQualityReportComponent] },
      add: { imports: [QualityReportStubComponent] }
    });
    const fixture = TestBed.createComponent(WeatherPredictorQualityComponent);
    fixture.detectChanges();

    let reports = fixture.debugElement.queryAll(By.directive(QualityReportStubComponent));
    expect(reports).toHaveLength(1);
    expect(reports[0].componentInstance.predictor.guid).toBe('weather-b');
    expect(reports[0].componentInstance.readings).toEqual([
      { guid: 'reading-b', predictorId: 'weather-b' }
    ]);

    routeParameters.next(convertToParamMap({ predictorGuid: 'weather-a' }));
    fixture.detectChanges();

    reports = fixture.debugElement.queryAll(By.directive(QualityReportStubComponent));
    expect(reports).toHaveLength(1);
    expect(reports[0].componentInstance.predictor.guid).toBe('weather-a');
  });
});
