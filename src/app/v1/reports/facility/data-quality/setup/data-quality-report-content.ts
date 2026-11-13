import { DataQualitySettingsDraft, METER_CONTENT_FLAGS, PREDICTOR_CONTENT_FLAGS } from '../data-quality-report-settings';

type ContentFlag = typeof METER_CONTENT_FLAGS[number] | typeof PREDICTOR_CONTENT_FLAGS[number] | 'includeAnnualTotalsTable';
interface ContentRow { readonly id: string; readonly label: string; readonly table?: ContentFlag; readonly charts?: ContentFlag; readonly tableLabel?: string; }
export const DATA_QUALITY_CONTENT_GROUPS: readonly {
  readonly id: string; readonly label: string; readonly key?: 'includeMeter' | 'includePredictors'; readonly rows: readonly ContentRow[];
}[] = [
  { id: 'meters', label: 'Meter Details', key: 'includeMeter', rows: [
    { id: 'meter-statistics', label: 'Consumption and cost statistics', table: 'includeMeterStatisticsTable' },
    { id: 'meter-consumption', label: 'Consumption', charts: 'includeMeterConsumptionTimeseriesGraph' },
    { id: 'meter-cost', label: 'Cost', charts: 'includeMeterCostTimeseriesGraph' },
    { id: 'meter-consumption-distribution', label: 'Consumption distribution', charts: 'includeMeterConsumptionHistogram' },
    { id: 'meter-cost-distribution', label: 'Cost distribution', charts: 'includeMeterCostHistogram' }
  ] },
  { id: 'predictors', label: 'Predictor Details', key: 'includePredictors', rows: [
    { id: 'predictor-statistics', label: 'Statistics', table: 'includePredictorStatisticsTable' },
    { id: 'predictor-timeseries', label: 'Time series', charts: 'includePredictorTimeseriesGraph' },
    { id: 'predictor-distribution', label: 'Predictor value distribution', charts: 'includePredictorHistogram' }
  ] },
  { id: 'annual', label: 'Annual totals', rows: [
    { id: 'annual-totals', label: 'Meter annual totals', table: 'includeAnnualTotalsTable', tableLabel: 'Annual Totals Table' }
  ] }
];

export const DATA_QUALITY_CONTENT_PRESETS = [
  { id: 'all', label: 'All content' }, { id: 'tables', label: 'Tables only' }, { id: 'charts', label: 'Charts only' }
] as const;
export type DataQualityContentPresetId = typeof DATA_QUALITY_CONTENT_PRESETS[number]['id'];
type ContentSettings = Pick<DataQualitySettingsDraft, ContentFlag | 'includeMeter' | 'includePredictors'>;
const CONTENT_FLAGS: readonly ContentFlag[] = [...METER_CONTENT_FLAGS, ...PREDICTOR_CONTENT_FLAGS, 'includeAnnualTotalsTable'];
const TABLE_FLAGS = new Set<ContentFlag>(['includeMeterStatisticsTable', 'includePredictorStatisticsTable', 'includeAnnualTotalsTable']);
const PRESET_CONTENT_FLAGS: Record<DataQualityContentPresetId, readonly ContentFlag[]> = {
  all: CONTENT_FLAGS,
  tables: [...TABLE_FLAGS],
  charts: CONTENT_FLAGS.filter(key => !TABLE_FLAGS.has(key))
};

/** Presets edit existing content switches only; report identity and source selections are retained. */
export function dataQualityContentPresetChanges(preset: DataQualityContentPresetId): ContentSettings {
  const enabled = new Set(PRESET_CONTENT_FLAGS[preset]);
  const changes = Object.fromEntries(CONTENT_FLAGS.map(key => [key, enabled.has(key)])) as ContentSettings;
  changes.includeMeter = METER_CONTENT_FLAGS.every(key => changes[key]);
  changes.includePredictors = PREDICTOR_CONTENT_FLAGS.every(key => changes[key]);
  return changes;
}

export function matchingDataQualityContentPreset(settings: ContentSettings) {
  return DATA_QUALITY_CONTENT_PRESETS.find(preset => Object.entries(dataQualityContentPresetChanges(preset.id))
    .every(([key, value]) => settings[key] === value));
}
