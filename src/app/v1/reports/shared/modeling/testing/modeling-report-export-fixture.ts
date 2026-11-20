import { getModelingReportSettings } from '@data/models/idbModels/facilityReport';
import { calculateModelingReport } from '@domain/reports/modeling-report-calculation';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { buildFacilityAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { buildModelingReport } from '@domain/reports/modeling-report';
import { regressionAnalysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { ModelingReportExportSnapshot } from '../output/modeling-report-output';

export function modelingExportFixture(): ModelingReportExportSnapshot {
  const snapshot = regressionAnalysisReportFixture();
  const inputs = buildFacilityAnalysisReportInputs(snapshot, 'facility', 'facility-analysis');
  const meters = getCalanderizedMeterData([...snapshot.meters], [...snapshot.meterData], snapshot.facilities[0], false,
    { energyIsSource: inputs.analysis.energyIsSource, neededUnits: inputs.analysis.energyUnit }, [], [], [...snapshot.facilities], snapshot.account.assessmentReportVersion, []);
  return { identity: 'account:facility:modeling-report', name: 'Plant modeling', scopeName: 'Plant A',
    view: buildModelingReport(calculateModelingReport(inputs, 2023, meters), getModelingReportSettings(), {
      facilities: { facility: 'Plant A' }, groups: { group: 'Main meters' }
    }, 'facility') };
}
