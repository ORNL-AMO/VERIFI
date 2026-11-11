import { Component, computed, inject } from '@angular/core';
import { IdbPredictor, WeatherDataType } from '@data/models/idbModels/predictor';
import { getConsumptionData } from '@domain/calculations/data-quality/meter-data-quality';
import { predictorDataQualityUnit } from '@domain/calculations/data-quality/predictor-data-quality';
import { DataQualityReportService } from '../data-quality-report.service';
import { DATA_QUALITY_PDF_UNAVAILABLE } from '../data-quality-report-output';

@Component({
  selector: 'app-data-quality-report-preview',
  standalone: false,
  templateUrl: './data-quality-report-preview.component.html',
  styleUrls: ['./data-quality-report-preview.component.css']
})
export class DataQualityReportPreviewComponent {
  readonly results = inject(DataQualityReportService);
  readonly editor = this.results.editor;
  readonly meters = computed(() => this.results.state().value?.meters.map(report => ({
    report, idPrefix: `quality-${report.meter.guid}`,
    annualTotals: this.results.state().value?.annualTotals.find(totals => totals.meterGuid === report.meter.guid),

    costChartIncluded: !isNaN(report.costStats.average) && report.costStats.average !== 0,
    consumptionHistogram: this.histogram(`meter-${report.meter.guid}-consumption`, getConsumptionData([...report.meterData], report.meter)),
    costHistogram: this.histogram(`meter-${report.meter.guid}-cost`, report.meterData.map(reading => reading.totalCost)),
    evidence: [
      ...(report.showConsumption && report.energyOutlierCount ? [`${report.energyOutlierCount} consumption reading(s) outside the expected range.`] : []),
      ...(report.includeCosts && report.costOutlierCount ? [`${report.costOutlierCount} cost reading(s) outside the expected range.`] : []),
      ...(report.duplicateMonths.length ? [`Months with multiple readings: ${report.duplicateMonths.map(month => month.monthYear).join(', ')}.`] : [])
    ]
  })) ?? []);
  readonly predictors = computed(() => this.results.state().value?.predictors.map(report => ({
    report, idPrefix: `predictor-quality-${report.predictor.guid}`,
    weatherDescription: weatherDescription(report.predictor),
    histogram: this.histogram(`predictor-${report.predictor.guid}`, report.readings.map(reading => reading.amount)),
    histogramUnit: report.predictor.predictorType === 'Weather'
      ? predictorDataQualityUnit({ ...report.predictor, unit: undefined }) : report.unit,
    evidence: [
      ...(report.outlierCount ? [`${report.outlierCount} predictor reading(s) outside the expected range.`] : []),
      ...(report.duplicateMonths.length ? [`Months with multiple readings: ${report.duplicateMonths.map(month => month.monthLabel).join(', ')}.`] : []),
      ...(report.missingMonths.length ? [`Missing months: ${report.missingMonths.map(month => month.monthLabel).join(', ')}.`] : []),
      ...(!report.predictor.canBeNegative && report.negativeMonths.length
        ? [`Months with negative values not permitted by predictor settings: ${report.negativeMonths.map(month => month.monthLabel).join(', ')}.`] : []),
      ...(report.predictor.predictorType === 'Weather' && report.weatherWarningMonths.length
        ? [`Incomplete weather source data: ${report.weatherWarningMonths.map(month => month.monthLabel).join(', ')}.`] : []),
      ...(report.predictor.predictorType === 'Weather' && report.weatherChangedMonths.length
        ? [`Revised weather source data: ${report.weatherChangedMonths.map(month => month.monthLabel).join(', ')}.`] : [])
    ]
  })) ?? []);
  readonly pdfUnavailableReason = DATA_QUALITY_PDF_UNAVAILABLE;
  private histogram(key: string, values: readonly unknown[]) {
    return { key, values, binCount: this.results.histogramBinCount(key) };
  }
}

const WEATHER_LABELS: Record<WeatherDataType, string> = {
  HDD: 'Heating Degree Days', CDD: 'Cooling Degree Days', relativeHumidity: 'Relative Humidity',
  dryBulbTemp: 'Dry Bulb Temperature', wetBulbTemp: 'Wet Bulb Temperature',
  dewPointTemp: 'Dew Point Temperature', precipitation: 'Precipitation'
};

function weatherDescription(predictor: IdbPredictor): string | undefined {
  if (predictor.predictorType !== 'Weather') return undefined;
  const label = WEATHER_LABELS[predictor.weatherDataType];
  const base = predictor.weatherDataType === 'HDD' ? predictor.heatingBaseTemperature
    : predictor.weatherDataType === 'CDD' ? predictor.coolingBaseTemperature : undefined;
  return Number.isFinite(base) ? `${label} (Base Temperature: ${base} °F)` : label;
}
