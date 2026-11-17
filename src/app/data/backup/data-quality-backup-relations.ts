import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { GuidPair } from './status-warning-dismissal-remap';

/** Remap included sources; unavailable references and absent optional fields survive restore. */
export function remapDataQualityBackupReferences(report: IdbFacilityReport,
  analyses: readonly GuidPair[], meters: readonly GuidPair[], predictors: readonly GuidPair[]): void {
  const settings = report.dataQualityReportSettings;
  if (report.facilityReportType !== 'dataQuality' || !settings) return;
  const remap = (guid: string, pairs: readonly GuidPair[]) => pairs.find(pair => pair.oldId === guid)?.newId ?? guid;
  if (settings.selectedAnalysisItemId !== undefined) {
    settings.selectedAnalysisItemId = remap(settings.selectedAnalysisItemId, analyses);
  }
  if (Array.isArray(settings.selectedMeterIds)) settings.selectedMeterIds = settings.selectedMeterIds.map(guid => remap(guid, meters));
  if (Array.isArray(settings.selectedPredictorIds)) settings.selectedPredictorIds = settings.selectedPredictorIds.map(guid => remap(guid, predictors));
}
