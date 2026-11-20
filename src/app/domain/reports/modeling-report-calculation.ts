import { CalanderizedMeter } from '@data/models/calanderization';
import { MonthlyAnalysisSummaryClass } from '@domain/calculations/analysis-calculations/monthlyAnalysisSummaryClass';
import { calculateAnalysisDataChecks } from './analysis-data-checks';
import { CheckedAnalysisReportInputs } from './analysis-report-inputs';
import { ModelingReportChart, ModelingReportChecks, modelingGroupKey } from './modeling-report';
import { groupWithGeneratedModel } from '@shared/shared-analysis/calculations/regression-model-projection';
import { getLatestCompleteAnalysisYear } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { getFiscalYear } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import { getDateFromPredictorData } from '@shared/dateHelperFunctions';

/** Existing validation and monthly calculations, with compact per-group chart results. */
export function calculateModelingReport(inputs: CheckedAnalysisReportInputs, reportYear: number,
  meters: readonly CalanderizedMeter[]): ModelingReportChecks {
  const detached = structuredClone(inputs), checks = calculateAnalysisDataChecks(detached, reportYear);
  const charts = checks.groups.filter(item => item.group.analysisType === 'regression').map((item): ModelingReportChart => {
    const analysis = detached.facilityAnalyses.find(analysis => analysis.guid === item.analysisGuid)!;
    const facility = detached.facilities.find(facility => facility.guid === item.facilityGuid)!;
    const metadata = { key: modelingGroupKey(item), category: analysis.analysisCategory,
      unit: analysis.analysisCategory === 'water' ? analysis.waterUnit : analysis.energyUnit,
      source: item.model?.isUserDefinedModel ? 'user-defined' as const : 'generated' as const,
      modelYear: item.model?.modelYear ?? item.group.regressionModelYear };
    if (!item.model) return { ...metadata, monthly: [], message: 'The model comparison chart is unavailable because no regression model is available.' };
    try {
      const group = item.model.isUserDefinedModel ? structuredClone(item.group) : groupWithGeneratedModel(item.group, item.model);
      const facilityMeters = meters.filter(meter => meter.meter.facilityId === facility.guid);
      const predictors = detached.predictorData.filter(row => row.facilityId === facility.guid);
      // Bound the lookup itself: a later complete year must not mask an incomplete report year.
      const throughYear = getLatestCompleteAnalysisYear([group], facilityMeters.map(meter => ({ ...meter,
        monthlyData: meter.monthlyData.filter(row => getFiscalYear(new Date(row.date), facility) <= reportYear)
      })), predictors.filter(row => getFiscalYear(getDateFromPredictorData(row), facility) <= reportYear), [facility]);
      if (throughYear === undefined || throughYear < analysis.baselineYear) return { ...metadata, monthly: [],
        message: `No complete reporting year is available for this group between ${analysis.baselineYear} and ${reportYear}.` };
      const rows = new MonthlyAnalysisSummaryClass(group, analysis, facility,
        facilityMeters, predictors, false,
        [...detached.facilityAnalyses], { reportYear: throughYear }).getResults().monthlyAnalysisSummaryData;
      const monthly = rows.map(row => ({ date: new Date(row.date), fiscalYear: row.fiscalYear,
        energyUse: Number.isFinite(row.energyUse) ? row.energyUse : null,
        modeledEnergy: row.isIntermediateBanked || !Number.isFinite(row.modeledEnergy) ? null : row.modeledEnergy }));
      return { ...metadata, throughYear, monthly, ...(!monthly.length ? { message: 'No model comparison data is available for this reporting period.' } : {}) };
    } catch {
      return { ...metadata, monthly: [], message: 'The model comparison chart could not be prepared. Review the linked analysis setup.' };
    }
  });
  return { ...checks, charts };
}
