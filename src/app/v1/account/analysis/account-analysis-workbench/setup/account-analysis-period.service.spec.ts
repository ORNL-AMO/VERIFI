import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { AccountAnalysisAutosaveService } from '../editing/account-analysis-autosave.service';
import { AccountAnalysisPeriodService } from './account-analysis-period.service';

describe('AccountAnalysisPeriodService', () => {
  it('uses the category and account fiscal calendar to expose complete baseline years', () => {
    const draft = signal(analysisFixture('energy'));
    const meters = [
      calendarizedMeter('energy-a', 'Electricity', [2023, 2024]),
      calendarizedMeter('water-a', 'Water Intake', [2023])
    ];
    const project = vi.fn(() => ({
      state: 'ready' as const, accountGuid: 'account-a', inputFingerprint: 'base-a', meters
    }));
    TestBed.configureTestingModule({ providers: [
      AccountAnalysisPeriodService,
      { provide: AccountAnalysisAutosaveService, useValue: { draft } },
      {
        provide: AccountAnalysisWorkbenchContext,
        useValue: { account: signal({ guid: 'account-a', fiscalYear: 'calendarYear' }) }
      },
      {
        provide: WorkspaceCalendarizationService,
        useValue: {
          calendarizeBase: () => of({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'base-a', meters }),
          project
        }
      }
    ] });
    const service = TestBed.inject(AccountAnalysisPeriodService);

    expect(service.baselineYears()).toEqual([2023, 2024]);
    expect(service.latestCompleteYear()).toBe(2024);
    expect(project).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      context: { kind: 'account', guid: 'account-a' }, energyIsSource: false, includeEmissions: false
    }));

    draft.set(analysisFixture('water'));
    expect(service.baselineYears()).toEqual([2023]);
  });

  it('reports an unavailable saved baseline without replacing it', () => {
    const draft = signal({ ...analysisFixture('energy'), baselineYear: 2022 });
    const meters = [calendarizedMeter('energy-a', 'Electricity', [2024])];
    TestBed.configureTestingModule({ providers: [
      AccountAnalysisPeriodService,
      { provide: AccountAnalysisAutosaveService, useValue: { draft } },
      { provide: AccountAnalysisWorkbenchContext, useValue: { account: signal({ guid: 'account-a', fiscalYear: 'calendarYear' }) } },
      {
        provide: WorkspaceCalendarizationService,
        useValue: {
          calendarizeBase: () => of({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'base-a', meters }),
          project: () => ({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'base-a', meters })
        }
      }
    ] });
    const service = TestBed.inject(AccountAnalysisPeriodService);

    expect(service.baselineYears()).toEqual([2024]);
    expect(service.currentBaselineUnavailable()).toBe(true);
    expect(draft().baselineYear).toBe(2022);
  });

  it('surfaces a projection failure instead of presenting it as an empty complete-year result', () => {
    const draft = signal(analysisFixture('energy'));
    TestBed.configureTestingModule({ providers: [
      AccountAnalysisPeriodService,
      { provide: AccountAnalysisAutosaveService, useValue: { draft } },
      { provide: AccountAnalysisWorkbenchContext, useValue: { account: signal({ guid: 'account-a', fiscalYear: 'calendarYear' }) } },
      {
        provide: WorkspaceCalendarizationService,
        useValue: {
          calendarizeBase: () => of({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'base-a', meters: [] }),
          project: () => ({
            state: 'error', accountGuid: 'account-a', inputFingerprint: 'base-a', meters: [],
            error: { code: 'invalid-projection', message: 'The draft unit is unavailable.' }
          })
        }
      }
    ] });
    const service = TestBed.inject(AccountAnalysisPeriodService);

    expect(service.state()).toBe('error');
    expect(service.error()).toBe('The draft unit is unavailable.');
    expect(service.baselineYears()).toEqual([]);
  });
});

function analysisFixture(category: 'energy' | 'water'): IdbAccountAnalysisItem {
  return {
    guid: 'analysis-a', accountId: 'account-a', name: 'Analysis', analysisCategory: category,
    energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2024,
    facilityAnalysisItems: [], hasBanking: false, isAnalysisVisited: false
  } as IdbAccountAnalysisItem;
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
