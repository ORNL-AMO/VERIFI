import { isEqual } from 'lodash';
import { getNewAnalysisGroup } from '@data/models/idbModels/analysisItem';
import { inspectionCalculationInputs, isCompleteUserDefinedGroup, UserDefinedInspectionRequest } from './user-defined-inspection-calculation';

function request(): UserDefinedInspectionRequest {
  const group = { ...getNewAnalysisGroup('group-a', [
    { id: 'p-a', name: 'Production', unit: 'tons', production: true, productionInAnalysis: true, regressionCoefficient: 2 }
  ]), isGeneratedModel: false, regressionConstant: 1, regressionStartYear: 2024, regressionModelStartMonth: 0,
    regressionEndYear: 2024, regressionModelEndMonth: 11, regressionModelNotes: 'First notes' };
  const analysis = { guid: 'analysis-a', facilityId: 'facility-a', accountId: 'account-a', energyUnit: 'MMBtu', waterUnit: 'gal', groups: [group], modifiedDate: new Date(0), isAnalysisVisited: true };
  return { selectedGroup: group, analysisItem: analysis, facility: { guid: 'facility-a' }, meters: [], meterData: [],
    accountPredictorEntries: [], accountAnalysisItems: [analysis], assessmentReportVersion: 'AR6' } as unknown as UserDefinedInspectionRequest;
}

describe('User-defined inspection calculation inputs', () => {
  it('omits notes and save/visit annotations at every analysis location', () => {
    const first = request();
    const changed = structuredClone(first);
    changed.selectedGroup.regressionModelNotes = 'Other notes';
    [changed.analysisItem, ...changed.accountAnalysisItems].forEach(analysis => {
      analysis.modifiedDate = new Date(); analysis.isAnalysisVisited = false; analysis.checked = true; analysis.dataCheckedDate = new Date();
      analysis.groups.forEach(group => { group.regressionModelNotes = 'Updated notes'; });
    });
    expect(inspectionCalculationInputs(changed)).toEqual(inspectionCalculationInputs(first));
  });

  it('retains coefficients, periods, units and nested banking dependencies in the comparison', () => {
    const initial = request();
    const changes: Array<(value: UserDefinedInspectionRequest) => void> = [
      value => { value.selectedGroup.predictorVariables[0].regressionCoefficient = 9; },
      value => { value.selectedGroup.regressionModelEndMonth = 10; },
      value => { value.analysisItem.energyUnit = 'kWh'; },
      value => { value.analysisItem.waterUnit = 'm3'; },
      value => { value.analysisItem.bankedAnalysisItemId = 'banked-analysis'; },
      value => { value.accountAnalysisItems[0].groups[0].applyBanking = true; },
      value => { value.accountAnalysisItems[0].groups[0].newBaselineYear = 2025; },
      value => { value.facility.energyIsSource = true; }
    ];
    changes.forEach(change => {
      const current = structuredClone(initial); change(current);
      expect(inspectionCalculationInputs(current)).not.toEqual(inspectionCalculationInputs(initial));
    });
  });

  it('distinguishes non-finite, null, undefined and missing numeric reading values', () => {
    const first = request();
    first.meterData = [{ guid: 'reading-a', totalEnergyUse: NaN }] as any;
    const nullable = structuredClone(first);
    nullable.meterData[0].totalEnergyUse = null;
    expect(isEqual(inspectionCalculationInputs(first), inspectionCalculationInputs(nullable))).toBe(false);
    const undefinedValue = structuredClone(first);
    undefinedValue.meterData[0].totalEnergyUse = undefined;
    const missing = structuredClone(undefinedValue);
    delete missing.meterData[0].totalEnergyUse;
    expect(isEqual(inspectionCalculationInputs(undefinedValue), inspectionCalculationInputs(missing))).toBe(false);
    expect(isEqual(inspectionCalculationInputs(undefinedValue), inspectionCalculationInputs(nullable))).toBe(false);
  });

  it('requires complete finite coefficients and a complete model period before calculation', () => {
    const complete = request().selectedGroup;
    expect(isCompleteUserDefinedGroup(complete)).toBe(true);
    expect(isCompleteUserDefinedGroup({ ...complete, regressionConstant: undefined })).toBe(false);
    expect(isCompleteUserDefinedGroup({ ...complete, regressionEndYear: 2023 })).toBe(false);
    expect(isCompleteUserDefinedGroup({ ...complete, predictorVariables: [] })).toBe(false);
  });
});
