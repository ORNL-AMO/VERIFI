import { signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type { AnalysisGroup, AnalysisType } from '@data/models/analysis';
import type { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import type { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { account, calendarizedMeter, facility, meter, monthlyData, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import type { WorkspaceCalendarizationBaseResult } from '@app/v1/shared/calendarization/workspace-calendarization.models';

export function visualizationFixture(type: AnalysisType = 'absoluteEnergyConsumption') {
  const owningFacility = facility({ guid: 'facility-a', accountId: 'account-a', fiscalYear: 'calendarYear' });
  const groupMeter = meter({ guid: 'meter-a', groupId: 'group-a', facilityId: 'facility-a', accountId: 'account-a', meterReadingDataApplication: 'fullMonth' });
  const predictors = [
    { ...getNewIdbPredictor('account-a', 'facility-a'), guid: 'predictor-a', name: 'Production', unit: 'widgets' },
    { ...getNewIdbPredictor('account-a', 'facility-a'), guid: 'predictor-b', name: 'Temperature', unit: '°C' }
  ];
  const rows = Array.from({ length: 18 }, (_, index) => monthlyData({
    year: 2023 + Math.floor(index / 12), monthNumValue: index % 12, energyUse: index * 10,
    energyConsumption: index * 2
  }));
  const readings = predictors.flatMap((predictor, predictorIndex) => rows.map((row, index) => ({
    guid: `${predictor.guid}-${index}`, accountId: 'account-a', facilityId: 'facility-a', predictorId: predictor.guid,
    year: row.year, month: row.monthNumValue + 1, amount: predictorIndex ? 20 - index : index * 2
  } as IdbPredictorData)));
  const sourceReadings = rows.map((row, index) => reading({ guid: `meter-a-${index}`, year: row.year,
    month: row.monthNumValue + 1, totalEnergyUse: row.energyUse, totalVolume: row.energyConsumption }));
  const group = { idbGroupId: 'group-a', analysisType: type,
    predictorVariables: [{ id: 'predictor-a', productionInAnalysis: true }] } as AnalysisGroup;
  const analysis = { guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', baselineYear: 2024,
    analysisCategory: 'energy', energyUnit: 'MMBtu', waterUnit: 'kgal', energyIsSource: false, groups: [group]
  } as IdbAnalysisItem;
  const meters = [calendarizedMeter(groupMeter, rows)];
  const base = new BehaviorSubject<WorkspaceCalendarizationBaseResult>({ state: 'ready', meters,
    accountGuid: 'account-a', inputFingerprint: 'inputs-a' });
  const project = vi.fn(() => ({ ...base.value }));
  const retry = vi.fn();
  const update = vi.fn();
  const context = {
    groupGuid: signal('group-a'), group: signal(group), meters: signal([groupMeter]),
    meterGroup: signal({ guid: 'group-a', name: 'Main group' }),
    autosave: { draft: signal(analysis), update },
    workbench: { account: signal(account({ guid: 'account-a' })), facility: signal(owningFacility), analysisGuid: signal('analysis-a'),
      workspace: { facilityPredictors: signal(predictors), facilityPredictorData: signal(readings), facilityMeterData: signal(sourceReadings) } }
  };
  return { context, meters, rows, readings, sourceReadings, predictors, base, update,
    calendarization: { calendarizeBase: () => base.asObservable(), project, retry } };
}
