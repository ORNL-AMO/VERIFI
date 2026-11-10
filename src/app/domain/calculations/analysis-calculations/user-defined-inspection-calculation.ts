import { AnalysisGroup } from '@data/models/analysis';
import { AssessmentReportVersion } from '@data/models/idbModels/account';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { getCalanderizedMeterData } from '../calanderization/calanderizeMeters';
import { getNeededUnits } from '../shared-calculations/calanderizationFunctions';
import { MonthlyAnalysisSummaryClass } from './monthlyAnalysisSummaryClass';
import { calculateRegressionModeledEnergy } from './monthlyAnalysisSummaryDataClass';

export interface UserDefinedInspectionRequest {
  selectedGroup: AnalysisGroup;
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  meters: IdbUtilityMeter[];
  meterData: IdbUtilityMeterData[];
  accountPredictorEntries: IdbPredictorData[];
  accountAnalysisItems: IdbAnalysisItem[];
  assessmentReportVersion: AssessmentReportVersion;
}

/** Chart values only: baseline-sensitive savings/SEP results stay in their existing calculations. */
export interface UserDefinedInspectionPoint {
  date: Date;
  energyUse: number;
  modeledEnergy: number;
}

export interface UserDefinedInspectionResponse {
  error: boolean;
  chartData?: UserDefinedInspectionPoint[];
}

export function calculateUserDefinedInspection(input: UserDefinedInspectionRequest): UserDefinedInspectionResponse {
  const request = structuredClone(input);
  const meters = getCalanderizedMeterData(
    request.meters, request.meterData, request.facility, false,
    { energyIsSource: request.analysisItem.energyIsSource, neededUnits: getNeededUnits(request.analysisItem) },
    [], [], [request.facility], request.assessmentReportVersion, []
  );
  const summary = new MonthlyAnalysisSummaryClass(
    request.selectedGroup, request.analysisItem, request.facility, meters,
    request.accountPredictorEntries, false, request.accountAnalysisItems
  ).getResults();
  const chartData = summary.monthlyAnalysisSummaryData.map(({ date, energyUse, modeledEnergy }) => ({ date, energyUse, modeledEnergy }));
  const points = new Map(chartData.map(point => [point.date.getTime(), point]));
  const group = request.selectedGroup;
  const groupData = meters.filter(meter => meter.meter.groupId === group.idbGroupId).flatMap(meter => meter.monthlyData);
  const predictors = group.predictorVariables.filter(variable => variable.productionInAnalysis);
  const end = new Date(group.regressionEndYear, group.regressionModelEndMonth + 1, 1);
  // Add only the selected model months absent from the normal analysis. Never move its baseline
  // or expose synthetic savings/rollups for dates outside that analysis.
  for (let date = new Date(group.regressionStartYear, group.regressionModelStartMonth, 1); date < end;
    date = new Date(date.getFullYear(), date.getMonth() + 1, 1)) {
    if (points.has(date.getTime())) continue;
    const matchesMonth = (year: number, month: number) => year === date.getFullYear() && month === date.getMonth();
    const energyUse = groupData.filter(row => matchesMonth(row.date.getFullYear(), row.date.getMonth()))
      .reduce((total, row) => total + (request.analysisItem.analysisCategory === 'water' ? row.energyConsumption : row.energyUse), 0);
    const monthPredictors = request.accountPredictorEntries.filter(row => matchesMonth(row.year, row.month - 1));
    const modeledEnergy = Math.max(0, calculateRegressionModeledEnergy(predictors, monthPredictors, group.regressionConstant));
    points.set(date.getTime(), { date, energyUse, modeledEnergy });
  }
  return { error: false, chartData: [...points.values()].sort((first, second) => first.date.getTime() - second.date.getTime()) };
}
