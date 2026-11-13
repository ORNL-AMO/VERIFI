import { AnalysisTableColumns } from '@data/models/analysis';
import { AnalysisReportSettings, DataQualityReportSettings, getAnalysisReportSettings, getDataQualityReportSettings } from '@data/models/idbModels/facilityReport';
import { WorkspaceWriteError } from './workspace-commands.models';

/** Omitted fields survive concurrent edits; null explicitly clears a selection. */
export interface FacilityReportSetupChanges {
  readonly name?: string;
  readonly analysisItemId?: string | null;
  readonly analysisReportSettings?: Partial<Omit<AnalysisReportSettings, 'analysisTableColumns' | 'reportYear'>> & {
    readonly reportYear?: number | null;
    readonly analysisTableColumns?: Partial<AnalysisTableColumns>;
  };
  readonly dataQualityReportSettings?: DataQualityReportSetupChanges;
}

export type DataQualityReportSetupChanges = Partial<Omit<DataQualityReportSettings,
  'missingSelection' | 'selectedAnalysisItemId' | 'selectedMeterIds' | 'selectedPredictorIds'>> & {
  readonly selectedAnalysisItemId?: string | null;
  readonly selectedMeterIds?: readonly string[];
  readonly selectedPredictorIds?: readonly string[];
};

export function mergeFacilityDataQualitySettings(saved: DataQualityReportSettings,
  changes: DataQualityReportSetupChanges): DataQualityReportSettings {
  const settings = structuredClone(saved ?? getDataQualityReportSettings());
  const defaults = getDataQualityReportSettings();
  for (const [key, value] of Object.entries(changes ?? {})) {
    if (value === undefined) continue;
    const invalidSetting = () => { throw new WorkspaceWriteError('validation-failed', 'A Data Quality report setting is invalid.'); };
    if (key === 'selectedAnalysisItemId') {
      if (value !== null && (typeof value !== 'string' || !value.trim())) invalidSetting();
      settings.selectedAnalysisItemId = value === null ? undefined : value as string;
    } else if (key === 'selectedMeterIds' || key === 'selectedPredictorIds') {
      if (!Array.isArray(value) || value.some(id => typeof id !== 'string' || !id.trim())) invalidSetting();
      settings[key] = [...new Set(value as string[])];
    } else if (key === 'selectedMode') {
      if (value !== 'analysis' && value !== 'manual') invalidSetting();
      settings.selectedMode = value as DataQualityReportSettings['selectedMode'];
    } else {
      if (!Object.hasOwn(defaults, key) || key === 'missingSelection' || typeof value !== 'boolean') invalidSetting();
      Object.assign(settings, { [key]: value });
    }
  }
  return settings;
}

export function mergeFacilityAnalysisSettings(saved: AnalysisReportSettings, changes: FacilityReportSetupChanges['analysisReportSettings']): AnalysisReportSettings {
  const defaults = getAnalysisReportSettings();
  const settings = { ...defaults, ...saved, analysisTableColumns: { ...defaults.analysisTableColumns, ...saved?.analysisTableColumns } };
  for (const [key, value] of Object.entries(changes ?? {})) {
    if (value === undefined) continue;
    if (key === 'reportYear') {
      if (value !== null && (!Number.isInteger(value) || Number(value) < 1800 || Number(value) > 9999)) invalid();
      settings.reportYear = value === null ? undefined : value as number;
    } else if (key === 'analysisTableColumns') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
      for (const [column, selected] of Object.entries(value)) {
        if (selected === undefined) continue;
        if (!Object.hasOwn(defaults.analysisTableColumns, column)) invalid();
        if (column === 'predictors') {
          if (!Array.isArray(selected) || selected.some(item => !item?.predictor || typeof item.predictor.id !== 'string'
            || typeof item.display !== 'boolean' || typeof item.usedInAnalysis !== 'boolean')) invalid();
        } else if (column === 'predictorGroupId') {
          if (selected !== null && typeof selected !== 'string') invalid();
        } else if (typeof selected !== 'boolean') invalid();
        settings.analysisTableColumns[column] = selected === null ? undefined : structuredClone(selected);
      }
    } else {
      if (!Object.hasOwn(defaults, key) || typeof value !== 'boolean') invalid();
      settings[key] = value;
    }
  }
  return settings;
}

function invalid(): never { throw new WorkspaceWriteError('validation-failed', 'A facility analysis report setting is invalid.'); }
