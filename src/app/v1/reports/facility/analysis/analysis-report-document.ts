import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { AnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { FacilityAnalysisResultsValue } from '@platform/web-workers/facility-analysis-results-worker.contract';
import { facilityGroupContributionsView } from '@app/v1/shared/analysis-results/group-contributions/group-contributions.view';
import { analysisReportSections } from './analysis-report.view';
import { settingsDraft } from './analysis-report-settings';

/** The preview and file adapters share period, section, and contribution policy. */
export function buildFacilityAnalysisDocument(report: IdbFacilityReport, analysis: IdbAnalysisItem,
  facility: IdbFacility, results: FacilityAnalysisResultsValue, checks: readonly AnalysisDataChecks[], groupNames: Readonly<Record<string, string>>) {
  const settings = settingsDraft(report.analysisReportSettings);
  const reportYear = results.reportYear ?? settings.reportYear;
  return {
    name: report.name, analysis, facility, results, settings,
    unit: analysis.analysisCategory === 'water' ? analysis.waterUnit ?? '' : analysis.energyUnit ?? '',
    sections: analysisReportSections(settings, analysis, results, checks, groupNames),
    contributions: facilityGroupContributionsView(reportYear != null && reportYear > analysis.baselineYear
      ? results.annualAnalysisSummaries.filter(row => row.year <= reportYear) : [], results.groupSummaries, new Map(Object.entries(groupNames)))
  };
}

export type FacilityAnalysisDocument = ReturnType<typeof buildFacilityAnalysisDocument>;
