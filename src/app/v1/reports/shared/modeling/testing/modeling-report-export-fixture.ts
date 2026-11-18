import { getModelingReportSettings } from '@data/models/idbModels/facilityReport';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { buildFacilityAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { buildModelingReport } from '@domain/reports/modeling-report';
import { regressionAnalysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { ModelingReportExportSnapshot } from '../output/modeling-report-output';

export function modelingExportFixture(): ModelingReportExportSnapshot {
  const inputs = buildFacilityAnalysisReportInputs(regressionAnalysisReportFixture(), 'facility', 'facility-analysis');
  return { identity: 'account:facility:modeling-report', name: 'Plant modeling', scopeName: 'Plant A',
    view: buildModelingReport(calculateAnalysisDataChecks(inputs, 2023), getModelingReportSettings(), {
      facilities: { facility: 'Plant A' }, groups: { group: 'Main meters' }
    }) };
}
