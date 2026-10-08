import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { FacilityAnalysisAutosaveService } from '../editing/facility-analysis-autosave.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { FacilityAnalysisPeriodService } from './facility-analysis-period.service';

describe('FacilityAnalysisPeriodService', () => {
  it('shares complete-year facts from canonical calendarization before result calculation is available', () => {
    const draft = signal(analysisFixture('energy'));
    const facility = signal(facilityFixture());
    const meters = [
      calendarizedMeter('energy-meter', 'Electricity', [2024, 2025]),
      calendarizedMeter('water-meter', 'Water Intake', [2024])
    ];
    const calendarizeBase = vi.fn(() => of({
      state: 'ready' as const,
      accountGuid: 'account-a',
      inputFingerprint: 'base-a',
      meters
    }));
    const project = vi.fn(() => ({
      state: 'ready' as const,
      accountGuid: 'account-a',
      inputFingerprint: 'base-a',
      meters
    }));

    TestBed.configureTestingModule({ providers: [
      FacilityAnalysisPeriodService,
      { provide: FacilityAnalysisAutosaveService, useValue: { draft } },
      { provide: FacilityAnalysisWorkbenchContext, useValue: { facility } },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase, project } }
    ] });

    const service = TestBed.inject(FacilityAnalysisPeriodService);
    expect(service.baselineYears()).toEqual([2024, 2025]);
    expect(service.latestCompleteYear()).toBe(2025);
    expect(calendarizeBase).toHaveBeenCalledOnce();

    draft.set(analysisFixture('water'));
    expect(service.baselineYears()).toEqual([2024]);
    expect(service.latestCompleteYear()).toBe(2024);
  });

  it('bounds source years by the source group meter and predictor inputs', () => {
    const currentGroup = {
      idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption', predictorVariables: [],
      applyBanking: true, bankedAnalysisYear: 2021, newBaselineYear: 2023
    } as AnalysisGroup;
    const sourceGroup = {
      idbGroupId: 'group-a', analysisType: 'regression',
      predictorVariables: [{ id: 'predictor-a', productionInAnalysis: true }],
      applyBanking: true
    } as AnalysisGroup;
    const dependencyGroup = {
      idbGroupId: 'group-a', analysisType: 'regression',
      predictorVariables: [{ id: 'predictor-b', productionInAnalysis: true }]
    } as AnalysisGroup;
    const current = {
      ...analysisFixture('energy'), hasBanking: true, bankedAnalysisItemId: 'source', groups: [currentGroup]
    } as IdbAnalysisItem;
    const source = {
      ...analysisFixture('energy'), guid: 'source', baselineYear: 2020,
      hasBanking: true, bankedAnalysisItemId: 'dependency', groups: [sourceGroup]
    } as IdbAnalysisItem;
    const dependency = {
      ...analysisFixture('energy'), guid: 'dependency', baselineYear: 2019, groups: [dependencyGroup]
    } as IdbAnalysisItem;
    const draft = signal(current);
    const facility = signal(facilityFixture());
    const meters = [calendarizedMeter('energy-meter', 'Electricity', [2020, 2021, 2022, 2023, 2024, 2025])];
    const predictorData = signal([
      ...predictorYears('predictor-a', [2020, 2021]),
      ...predictorYears('predictor-b', [2020])
    ]);

    TestBed.configureTestingModule({ providers: [
      FacilityAnalysisPeriodService,
      { provide: FacilityAnalysisAutosaveService, useValue: { draft } },
      {
        provide: FacilityAnalysisWorkbenchContext,
        useValue: { facility, analyses: signal([current, source, dependency]), workspace: { predictorData } }
      },
      {
        provide: WorkspaceCalendarizationService,
        useValue: {
          calendarizeBase: () => of({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'base-a', meters }),
          project: () => ({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'base-a', meters })
        }
      }
    ] });

    const service = TestBed.inject(FacilityAnalysisPeriodService);

    expect(service.bankingLatestCompleteYears('group-a')).toEqual({ consumer: 2025, source: 2020 });
  });
});

function analysisFixture(analysisCategory: 'energy' | 'water'): IdbAnalysisItem {
  return {
    guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Analysis A',
    analysisCategory, energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal',
    groups: [], baselineYear: 2024, hasBanking: false
  } as IdbAnalysisItem;
}

function facilityFixture(): IdbFacility {
  return {
    guid: 'facility-a', accountId: 'account-a', fiscalYear: 'calendarYear',
    fiscalYearMonth: 0, fiscalYearCalendarEnd: true
  } as IdbFacility;
}

function calendarizedMeter(
  guid: string,
  source: 'Electricity' | 'Water Intake',
  years: readonly number[]
): CalanderizedMeter {
  const monthlyData = years.flatMap(year => Array.from({ length: 12 }, (_, month) => ({
    date: new Date(year, month, 1), year, monthNumValue: month
  } as MonthlyData)));
  return {
    meter: { guid, facilityId: 'facility-a', groupId: 'group-a', source } as CalanderizedMeter['meter'],
    monthlyData
  } as CalanderizedMeter;
}

function predictorYears(predictorId: string, years: readonly number[]): IdbPredictorData[] {
  return years.flatMap(year => Array.from({ length: 12 }, (_, month) => ({
    guid: `${predictorId}-${year}-${month}`,
    accountId: 'account-a', facilityId: 'facility-a', predictorId,
    year, month: month + 1, amount: 1
  } as IdbPredictorData)));
}
