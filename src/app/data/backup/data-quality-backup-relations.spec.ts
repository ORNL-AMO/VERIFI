import { getNewIdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { remapDataQualityBackupReferences } from './data-quality-backup-relations';

describe('Data Quality backup source relationships', () => {
  it('remaps nested selections, retains unavailable GUIDs, and preserves content flags and unknown settings', () => {
    const report = getNewIdbFacilityReport('facility', 'account', 'dataQuality', []);
    Object.assign(report.dataQualityReportSettings, { selectedMode: 'manual', selectedAnalysisItemId: 'analysis',
      selectedMeterIds: ['meter', 'deleted-meter'], selectedPredictorIds: ['predictor', 'deleted-predictor'],
      includeMeter: false, includeMeterCostHistogram: false, futureSetting: 'preserve' });
    const before = structuredClone(report.dataQualityReportSettings);
    remapDataQualityBackupReferences(report, [{ oldId: 'analysis', newId: 'new-analysis' }],
      [{ oldId: 'meter', newId: 'new-meter' }], [{ oldId: 'predictor', newId: 'new-predictor' }]);
    expect(report.dataQualityReportSettings).toEqual({ ...before, selectedAnalysisItemId: 'new-analysis',
      selectedMeterIds: ['new-meter', 'deleted-meter'], selectedPredictorIds: ['new-predictor', 'deleted-predictor'] });
  });
  it('preserves missing optional fields and unavailable analyses without populating defaults', () => {
    const report = getNewIdbFacilityReport('facility', 'account', 'dataQuality', []);
    delete report.dataQualityReportSettings.selectedAnalysisItemId;
    delete report.dataQualityReportSettings.selectedMeterIds;
    delete report.dataQualityReportSettings.selectedPredictorIds;
    delete report.dataQualityReportSettings.includeAnnualTotalsTable;
    const before = structuredClone(report);
    remapDataQualityBackupReferences(report, [], [], []);
    expect(report).toEqual(before);
    report.dataQualityReportSettings.selectedAnalysisItemId = 'deleted-analysis';
    remapDataQualityBackupReferences(report, [], [], []);
    expect(report.dataQualityReportSettings.selectedAnalysisItemId).toBe('deleted-analysis');
  });
});
