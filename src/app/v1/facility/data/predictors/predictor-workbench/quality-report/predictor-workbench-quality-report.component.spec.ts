import { Directive, EventEmitter, Input, Output, forwardRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { EChartsChartDirective, V1EChartsDataZoomRange, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { makeFinding, StatusItem } from '@app/v1/status/status.models';
import { presentFinding } from '@app/v1/status/status.catalog';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { vi } from 'vitest';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorWorkbenchQualityReportComponent } from './predictor-workbench-quality-report.component';

describe('PredictorWorkbenchQualityReportComponent', () => {
  it('renders an empty state and routes users to Readings', () => {
    const fixture = setup({ readings: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No readings found');
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.v1-btn')?.click();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([
      '/v1', 'workspace', 'facility', 'facility-a', 'data', 'predictors', 'predictor-a', 'readings'
    ]);
  });

  it('renders findings, month details, statistics, chart annotations, copy, and download actions', () => {
    vi.useFakeTimers();
    try {
      const copyTable = vi.fn();
      const fixture = setup({
        statusState: 'evaluating',
        copyTable,
        selectedPredictor: predictor({ predictorType: 'Weather', weatherDataType: 'CDD', unit: '' }),
        readings: [
          reading({ guid: 'jan-negative', month: 1, amount: -1, weatherDataWarning: true }),
          reading({ guid: 'jan-duplicate', month: 1, amount: 10 }),
          reading({ guid: 'feb', month: 2, amount: 10 }),
          reading({ guid: 'apr', month: 4, amount: 11 }),
          reading({ guid: 'may', month: 5, amount: 12 }),
          reading({ guid: 'jun-outlier', month: 6, amount: 100, weatherDataChanged: true })
        ]
      });

      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      expect(element.textContent).toContain('Data quality findings');
      expect(element.textContent).toContain('Resolve duplicate predictor data');
      expect(element.textContent).toContain('Fill missing predictor data');
      expect(element.textContent).toContain('Review negative predictor data');
      expect(element.textContent).toContain('Review weather data');
      expect(element.textContent).toContain('Review predictor outliers');
      expect(element.textContent).toContain('Jan 2026 (2)');
      expect(element.textContent).toContain('Mar 2026');
      expect(element.textContent).toContain('Negative values are not permitted');
      expect(element.textContent).toContain('Incomplete source data');
      expect(element.textContent).toContain('Revised source data');
      expect(element.textContent).toContain('Predictor statistics');
      expect(element.textContent).toContain('Median Absolute Deviation');
      expect(element.textContent).toContain('Readings over time');
      expect(element.textContent).not.toContain('Histogram');
      expect(element.textContent).not.toContain('Number of bins');

      const option = fixture.componentInstance.qualityChartOption() as Record<string, any>;
      expect(option.yAxis.name).toBe('Production (days)');
      expect(option.series.map((series: { name: string }) => series.name)).toEqual([
        'Predictor values', 'Outliers', 'Weather warnings', 'Revised weather data', 'Missing months'
      ]);
      expect(option.series[0].markArea.data).toBeDefined();

      const accessibleTable = element.querySelector('.predictor-quality__accessible-data');
      expect(accessibleTable?.textContent).toContain('Outlier');
      expect(accessibleTable?.textContent).toContain('Incomplete source data');
      expect(accessibleTable?.textContent).toContain('Revised source data');

      element.querySelector<HTMLButtonElement>('.predictor-quality__footer button')?.click();
      vi.runOnlyPendingTimers();
      expect(copyTable).toHaveBeenCalledOnce();

      element.querySelector<HTMLButtonElement>('[aria-label="Download Predictor readings chart as PNG"]')?.click();
      const chart = fixture.debugElement.query(By.directive(EChartsStubDirective)).injector.get(EChartsStubDirective);
      expect(chart.downloadPng).toHaveBeenCalledWith('predictor-data-quality-readings');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows raw permitted negatives and ignored Weather source flags without active findings', () => {
    const fixture = setup({
      selectedPredictor: predictor({
        predictorType: 'Weather', weatherDataType: 'relativeHumidity', canBeNegative: true,
        ignoreWeatherDataWarning: true, unit: undefined
      }),
      statusFindings: [],
      readings: [
        reading({ month: 1, amount: -1, weatherDataWarning: true }),
        reading({ guid: 'reading-b', month: 2, amount: 10, weatherDataChanged: true })
      ]
    });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Data quality findings');
    expect(text).toContain("Negative values are permitted by this Predictor's settings");
    expect(text).toContain('currently ignored in workspace status');
    expect(text).toContain('(%)');
  });

  it('renders a no-usable-values state for non-finite data', () => {
    const fixture = setup({ readings: [reading({ amount: Number.NaN })] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No usable values');
    expect(fixture.nativeElement.querySelector('.predictor-quality__chart')).toBeNull();
  });

  it('discards active quality warnings through workspace status', async () => {
    const discardWarning = vi.fn(async () => true);
    const fixture = setup({ discardWarning });
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[aria-label="Discard Review predictor outliers"]')?.click();
    await fixture.whenStable();

    expect(discardWarning).toHaveBeenCalledWith(expect.objectContaining({ code: 'predictor.quality.outlier' }));
  });
});

@Directive({
  selector: '[appV1ECharts]',
  standalone: true,
  providers: [{ provide: EChartsChartDirective, useExisting: forwardRef(() => EChartsStubDirective) }]
})
class EChartsStubDirective {
  @Input('appV1ECharts') option?: V1EChartsOption;
  @Output() dataZoomChanged = new EventEmitter<V1EChartsDataZoomRange>();
  readonly downloadPng = vi.fn();
}

function setup(options: {
  selectedPredictor?: IdbPredictor;
  readings?: IdbPredictorData[];
  copyTable?: ReturnType<typeof vi.fn>;
  statusState?: 'idle' | 'evaluating' | 'ready' | 'error';
  statusFindings?: StatusItem[];
  discardWarning?: ReturnType<typeof vi.fn>;
} = {}): ComponentFixture<PredictorWorkbenchQualityReportComponent> {
  const selectedPredictor = options.selectedPredictor ?? predictor();
  const readings = options.readings ?? [
    reading({ amount: 10 }),
    reading({ guid: 'reading-b', month: 2, amount: 12 })
  ];
  const entity = {
    kind: 'predictor' as const,
    guid: selectedPredictor.guid,
    name: selectedPredictor.name,
    accountGuid: selectedPredictor.accountId,
    facilityGuid: selectedPredictor.facilityId
  };
  const statusFindings = options.statusFindings ?? [
    presentFinding(makeFinding('predictor.quality.outlier', 'warning', 'quality', entity, { count: 1, periods: ['2026-02'] }))
  ];

  TestBed.configureTestingModule({
    imports: [PredictorWorkbenchQualityReportComponent, EChartsStubDirective],
    providers: [
      {
        provide: FacilityPredictorsWorkspaceService,
        useValue: {
          facility: signal({ guid: 'facility-a', name: 'Facility A' }),
          selectedPredictor: signal(selectedPredictor),
          selectedReadings: signal(readings)
        }
      },
      { provide: CopyTableService, useValue: { copyTable: options.copyTable ?? vi.fn() } },
      { provide: Router, useValue: { navigate: vi.fn() } },
      {
        provide: WorkspaceNavigationService,
        useValue: {
          facilityPredictorRoute: (facilityGuid: string, predictorGuid: string, tab: string) => [
            '/v1', 'workspace', 'facility', facilityGuid, 'data', 'predictors', predictorGuid, tab
          ]
        }
      },
      {
        provide: WorkspaceStatusService,
        useValue: {
          state: signal(options.statusState ?? 'ready'),
          predictorFindings: vi.fn(() => statusFindings),
          warningActionError: signal(undefined),
          canManageWarnings: signal(true),
          discardWarning: options.discardWarning ?? vi.fn(async () => true)
        }
      }
    ]
  }).overrideComponent(PredictorWorkbenchQualityReportComponent, {
    remove: { imports: [EChartsChartDirective] },
    add: { imports: [EChartsStubDirective] }
  });

  return TestBed.createComponent(PredictorWorkbenchQualityReportComponent);
}

function predictor(overrides: Partial<IdbPredictor> = {}): IdbPredictor {
  return {
    guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production',
    predictorType: 'Standard', production: true, unit: 'tons', canBeNegative: false,
    ignoreDateStatusChecks: false, ignoreWeatherDataWarning: false, ...overrides
  } as IdbPredictor;
}

function reading(overrides: Partial<IdbPredictorData> = {}): IdbPredictorData {
  return {
    guid: 'reading-a', accountId: 'account-a', facilityId: 'facility-a', predictorId: 'predictor-a',
    month: 1, year: 2026, amount: 10, weatherDataWarning: false, weatherDataChanged: false,
    weatherOverride: false, ...overrides
  } as IdbPredictorData;
}
