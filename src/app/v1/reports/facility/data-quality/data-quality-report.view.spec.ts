import { TestBed } from '@angular/core/testing';
import { buildMeterDataQualityReport } from '@domain/calculations/data-quality/meter-data-quality';
import { buildPredictorDataQualityReport } from '@domain/calculations/data-quality/predictor-data-quality';
import { getZeroEmissionsResults } from '@domain/calculations/emissions-calculations/emissions';
import { DataQualityAnnualTotals } from '@domain/reports/data-quality-report-annual-totals';
import {
  meterQualityChartOption, meterQualityStatisticRows
} from '@app/v1/shared/data-quality/meter-quality-presentation/meter-quality-presentation.view';
import {
  predictorQualityChartOption, predictorQualityStatistics
} from '@app/v1/shared/data-quality/predictor-quality-presentation/predictor-quality-presentation.view';
import { dataQualityReportView, dataQualityReportMessages } from './data-quality-report.view';
import { dataQualitySettingsDraft } from './data-quality-report-settings';
import { dataQualityPredictorReadingsSnapshot } from './testing/data-quality-report-test-fixtures';
import { dataQualityAnnualColumns, dataQualityAnnualRows } from './annual-totals/data-quality-annual-totals.view';
import { DataQualityReportModule } from './data-quality-report.module';
import { DataQualityAnnualTotalsComponent } from './annual-totals/data-quality-annual-totals.component';
import { DataQualityReportPreviewComponent } from './preview/data-quality-report-preview.component';
import { DataQualityReportService } from './data-quality-report.service';

function inputs() {
  const snapshot = dataQualityPredictorReadingsSnapshot();
  const settings = dataQualitySettingsDraft(snapshot.facilityReports[0].dataQualityReportSettings);
  const result = {
    meters: snapshot.meters.map(meter => buildMeterDataQualityReport(
      snapshot.meterData.filter(reading => reading.meterId === meter.guid), meter)),
    predictors: snapshot.predictors.map(predictor => buildPredictorDataQualityReport(
      snapshot.predictorData.filter(reading => reading.predictorId === predictor.guid), predictor)),
    annualTotals: [] as DataQualityAnnualTotals[]
  };
  return { snapshot, settings, result };
}

describe('Data Quality report presentation without mounted components', () => {
  it('retains source order, units, evidence, dot-plot readings and existing flags', () => {
    const { settings, result } = inputs();
    const view = dataQualityReportView(result, settings);
    expect(view.meters.map(meter => meter.report.meter.guid)).toEqual(['meter-a', 'meter-b']);
    expect(view.predictors.map(predictor => predictor.report.predictor.guid)).toEqual(['predictor-a', 'predictor-b']);
    expect(view.meters[0].consumptionDotPlot!.readings.map(reading => reading.value)).toEqual([10, 10, 10, 100]);
    expect(view.meters[0].consumptionDotPlot!.readings.filter(reading => reading.outlier)).toHaveLength(1);
    expect(view.meters[0].evidence).toContain('1 consumption reading(s) outside the expected range.');
    expect(view.predictors[0].evidence).toContain('Missing months: Feb 2024.');
    expect(view.predictors[0].dotPlot!.unit).toBe('tons');
    expect(meterQualityStatisticRows(result.meters[0], true)[0].cells[2].valueLabel).toBe('32.5');
    expect(predictorQualityStatistics(result.predictors[0], true)[2].valueLabel).toBe('28.6');
    expect(meterQualityChartOption(result.meters[0], { showExpectedRangeLabel: false })).toBeDefined();
    expect(predictorQualityChartOption(result.predictors[0], false)).toBeDefined();
  });

  it('keeps excluded consumption and unavailable costs separate from annual totals', () => {
    const { settings, result } = inputs();
    const meter = { ...result.meters[0].meter, source: 'Electricity' as const, includeInEnergy: false };
    const report = buildMeterDataQualityReport(
      result.meters[0].meterData.map(row => ({ ...row, totalCost: 0 })), meter);
    settings.includeMeterConsumptionHistogram = true;
    settings.includeMeterCostHistogram = true;
    settings.includeAnnualTotalsTable = true;
    settings.includeMeter = false;
    result.meters = [report];
    result.annualTotals = [{
      meterGuid: meter.guid, columns: [{ key: 'year', label: 'Year' }], rows: []
    }];
    const view = dataQualityReportView(result, settings).meters[0];
    expect(view.content).toMatchObject({ consumptionTimeseries: true, consumptionDotPlot: false,
      costTimeseries: false, costDotPlot: false, excludedConsumption: true,
      costUnavailable: true, annualTotals: true });
    expect(meterQualityStatisticRows(report, true)).toEqual([]);
    expect(meterQualityChartOption(report)).toBeUndefined();
    expect(meterQualityChartOption(report, { includeExcludedConsumption: true })).toBeDefined();
    settings.includeMeterCostTimeseriesGraph = false;
    settings.includeMeterCostHistogram = false;
    expect(dataQualityReportView(result, settings).meters[0].content.costUnavailable).toBe(false);
  });

  it('retains weather descriptions and evidence alongside dot-plot units', () => {
    const { settings, result } = inputs();
    const predictor = { ...result.predictors[0].predictor, predictorType: 'Weather' as const,
      weatherDataType: 'HDD' as const, heatingBaseTemperature: 60, unit: 'custom unit', canBeNegative: false };
    result.predictors = [buildPredictorDataQualityReport(result.predictors[0].readings, predictor)];
    const view = dataQualityReportView(result, settings).predictors[0];
    expect(view.weatherDescription).toBe('Heating Degree Days (Base Temperature: 60 °F)');
    expect(view.dotPlot!.unit).toBe(view.report.unit);
    expect(view.evidence).toContain('Incomplete weather source data: Jan 2024.');
    expect(view.evidence).toContain('Revised weather source data: May 2024.');
  });

  it('formats annual units, currency, precision, and years without changing row order or values', () => {
    const columns: DataQualityAnnualTotals['columns'] = [
      { key: 'year', label: 'Year' }, { key: 'energyUse', label: 'Total Energy', unit: 'MMBtu' },
      { key: 'energyCost', label: 'Total Cost', unit: '$' }
    ];
    const rows = [2025, 2024].map(year => ({ ...getZeroEmissionsResults(), year,
      energyConsumption: 0, energyUse: 1.23456789, energyCost: -25 }));
    const before = structuredClone(rows);
    expect(dataQualityAnnualColumns({ meterGuid: 'meter-a', columns, rows })[1].unitHtml).toBe('MMBtu');
    expect(dataQualityAnnualRows(columns, rows).map(row => row.cells.map(cell => cell.text)))
      .toEqual([['2025', '1.2346', '$-25'], ['2024', '1.2346', '$-25']]);
    expect(rows).toEqual(before);
  });
});

describe('Data Quality annual table presentation', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('keeps interactive sorting in the component while sharing value and unit formatting', () => {
    TestBed.configureTestingModule({ imports: [DataQualityReportModule] });
    const fixture = TestBed.createComponent(DataQualityAnnualTotalsComponent);
    const rows = [2025, 2024].map(year => ({ ...getZeroEmissionsResults(), year,
      energyConsumption: 0, energyUse: 1.23456789, energyCost: year === 2025 ? 25 : 50 }));
    fixture.componentRef.setInput('totals', { meterGuid: 'meter-a', rows, columns: [
      { key: 'year', label: 'Year' }, { key: 'energyUse', label: 'Total Energy', unit: 'MMBtu' },
      { key: 'energyCost', label: 'Total Cost', unit: '$' }
    ] });
    fixture.componentRef.setInput('idPrefix', 'annual');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const years = () => [...root.querySelectorAll('tbody th')].map(cell => cell.textContent?.trim());
    expect(years()).toEqual(['2024', '2025']);
    expect(root.querySelector('thead')!.textContent).toContain('(MMBtu)');
    expect(root.querySelector('tbody')!.textContent).toContain('1.2346');
    const cost = [...root.querySelectorAll('button')].find(button => button.textContent?.includes('Total Cost'))!;
    cost.click(); fixture.detectChanges();
    expect(years()).toEqual(['2025', '2024']);
    cost.click(); fixture.detectChanges();
    expect(years()).toEqual(['2024', '2025']);
    expect(rows.map(row => row.year)).toEqual([2025, 2024]);
    expect(rows[0].energyUse).toBe(1.23456789);
  });
});

describe('Data Quality report notes', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('renders the shared no-content message without obsolete PDF availability text', () => {
    TestBed.configureTestingModule({ imports: [DataQualityReportModule], providers: [
      { provide: DataQualityReportService, useValue: {
        state: () => ({ state: 'ready', value: { meters: [], predictors: [], annualTotals: [] } }),
        editor: { draft: () => ({ name: 'Empty report', settings: {} }) }
      } }
    ] });
    const fixture = TestBed.createComponent(DataQualityReportPreviewComponent);
    const messages = dataQualityReportMessages();
    expect(fixture.componentInstance.messages).toEqual(messages);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(messages.noContent);
    expect(fixture.nativeElement.textContent).not.toContain('PDF export is not available yet.');
  });
});
