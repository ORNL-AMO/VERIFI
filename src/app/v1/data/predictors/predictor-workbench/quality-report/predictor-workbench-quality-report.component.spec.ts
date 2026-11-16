import { WritableSignal, signal } from '@angular/core';
import { DataQualityDotPlotComponent } from '@app/v1/shared/data-quality/data-quality-dot-plot/data-quality-dot-plot.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PredictorQualityPresentationComponent } from '@app/v1/shared/data-quality/predictor-quality-presentation/predictor-quality-presentation.component';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { makeFinding, StatusItem } from '@app/v1/status/status.models';
import { presentFinding } from '@app/v1/status/status.catalog';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { vi } from 'vitest';
import { PREDICTOR_QUALITY_CONTEXT } from '../../predictor-quality-context';
import { PredictorWorkbenchQualityReportComponent } from './predictor-workbench-quality-report.component';

describe('PredictorWorkbenchQualityReportComponent', () => {
  afterEach(() => vi.restoreAllMocks());
  it.each(['Standard', 'Weather'] as const)('adds a distribution with existing flags and units for %s predictors', predictorType => {
    const fixture = setup({ selectedPredictor: predictor({ predictorType, weatherDataType: 'HDD', unit: 'units' }),
      readings: [10, 10, 11, 12, 100].map((amount, index) => reading({ guid: `r-${index}`, month: index + 1, amount })) });
    const plot = distribution(fixture)!;
    expect(plot.heading()).toBe('Predictor value distribution');
    expect(plot.headingLevel()).toBe(2);
    expect(plot.data().unit).toBe('units');
    expect(plot.view().points.filter(point => point.outlier)).toHaveLength(1);
    expect(plot.chartFileName()).toBe('production-value-distribution');
  });
  it('replaces source data, retains zero-MAD behavior, and clears distributions for unusable or empty readings', () => {
    const fixture = setup();
    const context = TestBed.inject(PREDICTOR_QUALITY_CONTEXT);
    (context.predictor as WritableSignal<IdbPredictor>).set(predictor({ guid: 'predictor-b', name: 'Other production' }));
    (context.readings as WritableSignal<IdbPredictorData[]>).set([10, 10, 10, 100].map((amount, index) =>
      reading({ guid: `r-${index}`, predictorId: 'predictor-b', month: index + 1, amount })));
    const plot = distribution(fixture)!;
    expect(plot.idPrefix()).toContain('predictor-b');
    expect(plot.chartFileName()).toBe('other-production-value-distribution');
    expect(plot.view().points.every(point => !point.outlier)).toBe(true);
    expect(plot.data().notice).toContain('MAD is zero');
    (context.readings as WritableSignal<IdbPredictorData[]>).set([reading({ amount: NaN })]);
    expect(distribution(fixture)).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('No usable values');
    (context.readings as WritableSignal<IdbPredictorData[]>).set([]);
    expect(distribution(fixture)).toBeUndefined();
  });
  it.each(['ready', 'evaluating', 'error'] as const)('retains outlier details but suppresses range alerts in %s state', statusState => {
    const fixture = setup({ statusState, expectedRangeEnabled: false,
      readings: [10, 10, 11, 12, 100].map((amount, index) => reading({ guid: `r${index}`, month: index + 1, amount }))
    });
    expect(fixture.componentInstance.report()?.outlierCount).toBe(1);
    expect(fixture.componentInstance.findings().some(finding => finding.code === 'predictor.quality.outlier')).toBe(false);
    expect(presentation(fixture).accessibleChartRows().some(row => row.expectedRangeLabel === 'Outlier')).toBe(true);
    expect(JSON.stringify(presentation(fixture).qualityChartOption())).toContain('Outliers');
    expect(distribution(fixture)!.view().points.some(point => point.outlier)).toBe(true);
  });

  it('renders an empty state and routes users to Readings', () => {
    const fixture = setup({ readings: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No readings found');
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.v1-btn')?.click();
    expect(TestBed.inject(PREDICTOR_QUALITY_CONTEXT).openReadings).toHaveBeenCalled();
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
      expect(element.textContent).toContain('Predictor consumption statistics');
      expect(element.textContent).toContain('Median Absolute Deviation');
      expect(element.textContent).toContain('Readings over time');
      expect(element.textContent).not.toContain('Histogram');
      expect(element.textContent).not.toContain('Number of bins');

      const option = presentation(fixture).qualityChartOption() as Record<string, any>;
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
      const chart = fixture.debugElement.query(By.directive(EChartsChartDirective)).injector.get(EChartsChartDirective);
      expect(chart.downloadPng).toHaveBeenCalledWith('production-data-quality-readings');
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

function setup(options: {
  selectedPredictor?: IdbPredictor;
  readings?: IdbPredictorData[];
  copyTable?: ReturnType<typeof vi.fn>;
  expectedRangeEnabled?: boolean;
  statusState?: 'idle' | 'evaluating' | 'ready' | 'error';
  statusFindings?: StatusItem[];
  discardWarning?: ReturnType<typeof vi.fn>;
} = {}): ComponentFixture<PredictorWorkbenchQualityReportComponent> {
  // Canvas rendering is covered in Chromium; keep this suite focused on workbench behavior.
  vi.spyOn(EChartsChartDirective.prototype, 'ngAfterViewInit').mockImplementation(() => {});
  vi.spyOn(EChartsChartDirective.prototype, 'ngOnChanges').mockImplementation(() => {});
  vi.spyOn(EChartsChartDirective.prototype, 'downloadPng').mockImplementation(() => {});
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
    imports: [PredictorWorkbenchQualityReportComponent],
    providers: [
      {
        provide: PREDICTOR_QUALITY_CONTEXT,
        useValue: {
          predictor: signal(selectedPredictor),
          readings: signal(readings),
          findings: signal(statusFindings),
          expectedRangeEnabled: signal(options.expectedRangeEnabled ?? true),
          idPrefix: signal('predictor-quality'),
          settingsLabel: 'Open Settings',
          openReadings: vi.fn(),
          openSettings: vi.fn()
        }
      },
      { provide: CopyTableService, useValue: { copyTable: options.copyTable ?? vi.fn() } },
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

function presentation(fixture: ComponentFixture<PredictorWorkbenchQualityReportComponent>): PredictorQualityPresentationComponent {
  fixture.detectChanges();
  return fixture.debugElement.query(By.directive(PredictorQualityPresentationComponent)).componentInstance;
}
function distribution(fixture: ComponentFixture<PredictorWorkbenchQualityReportComponent>): DataQualityDotPlotComponent | undefined {
  fixture.detectChanges();
  return fixture.debugElement.query(By.directive(DataQualityDotPlotComponent))?.componentInstance;
}
