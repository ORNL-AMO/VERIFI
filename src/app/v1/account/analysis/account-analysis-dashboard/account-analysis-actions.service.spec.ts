import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import {
  AccountAnalysisActionsService,
  getActiveAccountAnalysisEligibility
} from './account-analysis-actions.service';

describe('AccountAnalysisActionsService', () => {
  const account = {
    guid: 'account-a', energyUnit: 'MMBtu', volumeLiquidUnit: 'gal', energyIsSource: true,
    sustainabilityQuestions: { energyReductionBaselineYear: 2022, waterReductionBaselineYear: 2021 }
  } as any;
  const facilities = [{ guid: 'facility-a' }, { guid: 'facility-b' }] as any[];
  const source = {
    id: 3, guid: 'analysis-a', accountId: 'account-a', name: 'Portfolio energy', analysisCategory: 'energy',
    baselineYear: 2022, energyUnit: 'MMBtu', waterUnit: 'gal', energyIsSource: true,
    createdDate: new Date('2025-01-01'), modifiedDate: new Date('2025-01-01'),
    facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: 'facility-analysis-a' }]
  } as any;

  it('requires the account goal baseline for active reporting', () => {
    expect(getActiveAccountAnalysisEligibility(account, source).allowed).toBe(true);
    expect(getActiveAccountAnalysisEligibility(account, { ...source, baselineYear: 2020 })).toMatchObject({ allowed: false });
  });

  it('rejects unavailable categories and creates one selection per current facility', async () => {
    const { service, analysisHandler } = setup([]);
    await expect(service.createAnalysis('energy')).rejects.toThrow('facility energy analysis');

    const available = setup([{ guid: 'facility-analysis-a', analysisCategory: 'energy' }]);
    analysisHandler.addAccountAnalysis.mockClear();
    const created = await available.service.createAnalysis('energy');
    expect(created.facilityAnalysisItems).toEqual([
      { facilityId: 'facility-a', analysisItemId: undefined },
      { facilityId: 'facility-b', analysisItemId: undefined }
    ]);
  });

  it('copies facility selections without sharing nested references', async () => {
    const { service, analysisHandler } = setup([{ guid: 'facility-analysis-a', analysisCategory: 'energy' }], [source]);
    const copy = await service.copyAnalysis(source.guid);
    expect(copy.id).toBeUndefined();
    expect(copy.guid).not.toBe(source.guid);
    expect(copy.facilityAnalysisItems).toEqual(source.facilityAnalysisItems);
    copy.facilityAnalysisItems[0].analysisItemId = 'changed';
    expect(source.facilityAnalysisItems[0].analysisItemId).toBe('facility-analysis-a');
    expect(analysisHandler.addAccountAnalysis).toHaveBeenCalled();
  });

  function setup(facilityAnalyses: any[], analyses: any[] = []) {
    const analysisHandler = {
      addAccountAnalysis: vi.fn(async (analysis: any) => analysis),
      deleteAccountAnalysisAtomic: vi.fn(async () => undefined)
    };
    const accountHandler = { update: vi.fn(async (updated: any) => updated) };
    const boundary = {
      execute: vi.fn(async (_request: unknown, persist: () => Promise<any>) => ({ value: await persist() }))
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AccountAnalysisActionsService,
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account: signal(account), facilities: signal(facilities), facilityAnalyses: signal(facilityAnalyses),
            accountAnalyses: signal(analyses), canWrite: signal(true), hasPending: signal(false)
          }
        },
        { provide: AnalysisCommandHandler, useValue: analysisHandler },
        { provide: AccountCommandHandler, useValue: accountHandler },
        { provide: WorkspaceCommandBoundary, useValue: boundary }
      ]
    });
    return { service: TestBed.inject(AccountAnalysisActionsService), analysisHandler, accountHandler, boundary };
  }
});
