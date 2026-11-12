import type { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import type { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictor, WeatherDataType } from '@data/models/idbModels/predictor';
import { getConsumptionData } from '@domain/calculations/data-quality/meter-data-quality';
import { predictorDataQualityUnit } from '@domain/calculations/data-quality/predictor-data-quality';
import { DEFAULT_QUALITY_HISTOGRAM_BINS } from '@domain/calculations/data-quality/data-quality-histogram';
import type { DataQualityReportResult } from './data-quality-report.service';
import type { DataQualitySettingsDraft } from './data-quality-report-settings';

/** Only structured-cloneable inputs; the shared export controller will detach them before generation. */
export function buildDataQualityReportSnapshot(
  report: IdbFacilityReport, facility: Pick<IdbFacility, 'name'>, settings: DataQualitySettingsDraft,
  results: DataQualityReportResult, histogramBinCounts: Readonly<Record<string, number>>
) {
  return {
    identity: { scope: 'facility' as const, accountGuid: report.accountId,
      facilityGuid: report.facilityId, reportGuid: report.guid },
    name: report.name, facility: { name: facility.name }, settings, results, histogramBinCounts
  };
}

export type DataQualityReportSnapshot = ReturnType<typeof buildDataQualityReportSnapshot>;

export function dataQualityReportMessages() {
  return {
    noMeterReadings: 'No readings found for this meter.',
    noPredictorReadings: 'No readings found for this predictor.',
    noPredictorValues: 'No usable values. Review the predictor readings '
      + 'and correct values that are not finite numbers.',
    noPredictorPeriods: 'No readings have valid months and years for the time series.',
    noContent: 'No report content is enabled for the selected data. Choose sections in Setup.',
    excludedConsumption: 'The consumption distribution is unavailable '
      + 'because this meter is excluded from energy totals.',
    costUnavailableTitle: 'Cost charts unavailable',
    costUnavailable: 'No cost chart is available because the average cost is zero or unavailable.'
  } as const;
}

export function dataQualityHistogramKey(kind: 'consumption' | 'cost' | 'predictor', guid: string): string {
  return kind === 'predictor' ? `predictor-${guid}` : `meter-${guid}-${kind}`;
}

/** Preview and file preparation share source order, visibility, evidence, and histogram inputs. */
export function dataQualityReportView(
  result: DataQualityReportResult, settings: DataQualitySettingsDraft,
  binCounts: Readonly<Record<string, number>> = {}
) {
  const histogram = (key: string, values: readonly unknown[]) => ({
    key, values, binCount: binCounts[key] ?? DEFAULT_QUALITY_HISTOGRAM_BINS
  });
  return {
    meters: result.meters.map(report => {
      const annualTotals = result.annualTotals.find(totals => totals.meterGuid === report.meter.guid);
      const costChartIncluded = !isNaN(report.costStats.average) && report.costStats.average !== 0;
      return {
        report, idPrefix: `quality-${report.meter.guid}`, annualTotals,
        content: {
          statistics: settings.includeMeterStatisticsTable,
          consumptionTimeseries: settings.includeMeterConsumptionTimeseriesGraph,
          costTimeseries: settings.includeMeterCostTimeseriesGraph && costChartIncluded,
          consumptionHistogram: settings.includeMeterConsumptionHistogram && report.showConsumption,
          costHistogram: settings.includeMeterCostHistogram && costChartIncluded,
          annualTotals: !!settings.includeAnnualTotalsTable && !!annualTotals,
          excludedConsumption: settings.includeMeterConsumptionHistogram && !report.showConsumption,
          costUnavailable: (settings.includeMeterCostTimeseriesGraph || settings.includeMeterCostHistogram)
            && !costChartIncluded
        },
        consumptionHistogram: histogram(dataQualityHistogramKey('consumption', report.meter.guid),
          getConsumptionData([...report.meterData], report.meter)),
        costHistogram: histogram(dataQualityHistogramKey('cost', report.meter.guid),
          report.meterData.map(reading => reading.totalCost)),
        evidence: [
          ...(report.showConsumption && report.energyOutlierCount
            ? [`${report.energyOutlierCount} consumption reading(s) outside the expected range.`] : []),
          ...(report.includeCosts && report.costOutlierCount
            ? [`${report.costOutlierCount} cost reading(s) outside the expected range.`] : []),
          ...(report.duplicateMonths.length
            ? [`Months with multiple readings: ${report.duplicateMonths
              .map(month => month.monthYear).join(', ')}.`] : [])
        ]
      };
    }),
    predictors: result.predictors.map(report => ({
      report, idPrefix: `predictor-quality-${report.predictor.guid}`,
      weatherDescription: weatherDescription(report.predictor),
      content: {
        statistics: settings.includePredictorStatisticsTable,
        timeseries: settings.includePredictorTimeseriesGraph,
        histogram: settings.includePredictorHistogram
      },
      histogram: histogram(dataQualityHistogramKey('predictor', report.predictor.guid),
        report.readings.map(reading => reading.amount)),
      histogramUnit: report.predictor.predictorType === 'Weather'
        ? predictorDataQualityUnit({ ...report.predictor, unit: undefined }) : report.unit,
      evidence: [
        ...(report.outlierCount ? [`${report.outlierCount} predictor reading(s) outside the expected range.`] : []),
        ...(report.duplicateMonths.length
          ? [`Months with multiple readings: ${report.duplicateMonths
            .map(month => month.monthLabel).join(', ')}.`] : []),
        ...(report.missingMonths.length
          ? [`Missing months: ${report.missingMonths.map(month => month.monthLabel).join(', ')}.`] : []),
        ...(!report.predictor.canBeNegative && report.negativeMonths.length
          ? [`Months with negative values not permitted by predictor settings: ${report.negativeMonths
            .map(month => month.monthLabel).join(', ')}.`] : []),
        ...(report.predictor.predictorType === 'Weather' && report.weatherWarningMonths.length
          ? [`Incomplete weather source data: ${report.weatherWarningMonths
            .map(month => month.monthLabel).join(', ')}.`]
          : []),
        ...(report.predictor.predictorType === 'Weather' && report.weatherChangedMonths.length
          ? [`Revised weather source data: ${report.weatherChangedMonths
            .map(month => month.monthLabel).join(', ')}.`] : [])
      ]
    }))
  };
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
