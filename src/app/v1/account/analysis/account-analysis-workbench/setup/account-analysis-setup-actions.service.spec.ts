import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { AccountAnalysisAutosaveService } from '../editing/account-analysis-autosave.service';
import {
  AccountAnalysisSetupActionsService,
  buildBulkFacilityAnalysis
} from './account-analysis-setup-actions.service';

describe('buildBulkFacilityAnalysis', () => {
  const account = { guid: 'account-a' } as IdbAccount;
  const accountAnalysis = {
    guid: 'account-analysis-a', accountId: 'account-a', name: 'Portfolio plan', analysisCategory: 'energy',
    energyIsSource: true, baselineYear: 2022
  } as IdbAccountAnalysisItem;
  const meterGroups = [{ guid: 'group-a', facilityId: 'facility-a', groupType: 'Energy' }] as IdbUtilityMeterGroup[];

  it('copies the account setup and selected analysis type to every generated group', () => {
    const facility = {
      guid: 'facility-a', accountId: 'account-a', energyIsSource: false, energyUnit: 'kWh', volumeLiquidUnit: 'gal',
      sustainabilityQuestions: { energyReductionBaselineYear: 2020 }
    } as IdbFacility;
    const result = buildBulkFacilityAnalysis(
      account, facility, meterGroups, [], accountAnalysis, 'energyIntensity'
    );

    expect(result).toMatchObject({
      accountId: 'account-a', facilityId: 'facility-a', name: 'Portfolio plan',
      analysisCategory: 'energy', energyIsSource: true, baselineYear: 2022
    });
    expect(result.groups.map(group => group.analysisType)).toEqual(['energyIntensity']);
  });

  it('uses a later goal baseline for a new facility', () => {
    const facility = {
      guid: 'facility-a', accountId: 'account-a', isNewFacility: true,
      energyUnit: 'kWh', volumeLiquidUnit: 'gal',
      sustainabilityQuestions: { energyReductionBaselineYear: 2024 }
    } as IdbFacility;
    const result = buildBulkFacilityAnalysis(
      account, facility, meterGroups, [], accountAnalysis, 'absoluteEnergyConsumption'
    );
    expect(result.baselineYear).toBe(2024);
    expect(result.groups.map(group => group.analysisType)).toEqual(['absoluteEnergyConsumption']);
  });
});

describe('AccountAnalysisSetupActionsService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('clears selected and skipped facility links while preserving the remaining analysis fields', async () => {
    const originalModifiedDate = new Date('2026-01-02T00:00:00.000Z');
    const draftValue = {
      id: 42,
      guid: 'account-analysis-a',
      accountId: 'account-a',
      name: 'Portfolio plan',
      analysisCategory: 'energy',
      energyIsSource: true,
      energyUnit: 'MMBtu',
      waterUnit: 'gal',
      baselineYear: 2022,
      hasBanking: true,
      checked: true,
      isAnalysisVisited: true,
      facilityItemsInitialized: true,
      createdDate: new Date('2025-01-01T00:00:00.000Z'),
      modifiedDate: originalModifiedDate,
      facilityAnalysisItems: [
        { facilityId: 'facility-a', analysisItemId: 'analysis-a' },
        { facilityId: 'facility-b', analysisItemId: 'skip' }
      ]
    } as IdbAccountAnalysisItem;
    const draft = signal(draftValue);
    const updateAccountAnalysis = vi.fn().mockImplementation(async analysis => analysis);
    const execute = vi.fn(async (_request, persist: () => Promise<unknown>) => ({ value: await persist(), change: {} }));
    TestBed.configureTestingModule({ providers: [
      AccountAnalysisSetupActionsService,
      {
        provide: AccountAnalysisWorkbenchContext,
        useValue: {
          account: signal({ guid: 'account-a' } as IdbAccount),
          facilities: signal([]),
          workspace: { canWrite: signal(true), hasPending: signal(false), meterGroups: signal([]), predictors: signal([]) }
        }
      },
      { provide: AccountAnalysisAutosaveService, useValue: { draft, flush: vi.fn().mockResolvedValue(true) } },
      { provide: WorkspaceCommandBoundary, useValue: { execute } },
      { provide: AnalysisCommandHandler, useValue: { updateAccountAnalysis } },
      { provide: WorkspaceNavigationService, useValue: {} },
      { provide: Router, useValue: {} }
    ] });
    const service = TestBed.inject(AccountAnalysisSetupActionsService);

    expect(await service.clearSelections()).toBe(true);
    expect(updateAccountAnalysis).toHaveBeenCalledOnce();
    const [updated, accountGuid] = updateAccountAnalysis.mock.calls[0] as [IdbAccountAnalysisItem, string];
    expect(accountGuid).toBe('account-a');
    expect(updated.modifiedDate).toBeInstanceOf(Date);
    expect(updated).toEqual({
      ...structuredClone(draftValue),
      isAnalysisVisited: false,
      facilityItemsInitialized: false,
      modifiedDate: updated.modifiedDate,
      facilityAnalysisItems: [
        { facilityId: 'facility-a', analysisItemId: undefined },
        { facilityId: 'facility-b', analysisItemId: undefined }
      ]
    });
    expect(draft()).toBe(draftValue);
    expect(draft().facilityAnalysisItems.map(item => item.analysisItemId)).toEqual(['analysis-a', 'skip']);
    expect(service.busy()).toBe(false);
    expect(service.error()).toBeUndefined();
  });

  it('returns false and exposes a persistence failure when selections cannot be cleared', async () => {
    const draft = signal({
      guid: 'account-analysis-a', accountId: 'account-a', name: 'Portfolio plan', analysisCategory: 'energy',
      energyIsSource: true, baselineYear: 2022,
      facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: 'analysis-a' }]
    } as IdbAccountAnalysisItem);
    const updateAccountAnalysis = vi.fn().mockRejectedValue(new Error('IndexedDB write failed'));
    const execute = vi.fn(async (_request, persist: () => Promise<unknown>) => {
      try {
        return { value: await persist(), change: {} };
      } catch (error) {
        throw new WorkspaceWriteError('persistence-failed', 'The account analysis update could not be persisted.', error);
      }
    });
    TestBed.configureTestingModule({ providers: [
      AccountAnalysisSetupActionsService,
      {
        provide: AccountAnalysisWorkbenchContext,
        useValue: {
          account: signal({ guid: 'account-a' } as IdbAccount),
          facilities: signal([]),
          workspace: { canWrite: signal(true), hasPending: signal(false), meterGroups: signal([]), predictors: signal([]) }
        }
      },
      { provide: AccountAnalysisAutosaveService, useValue: { draft, flush: vi.fn().mockResolvedValue(true) } },
      { provide: WorkspaceCommandBoundary, useValue: { execute } },
      { provide: AnalysisCommandHandler, useValue: { updateAccountAnalysis } },
      { provide: WorkspaceNavigationService, useValue: {} },
      { provide: Router, useValue: {} }
    ] });
    const service = TestBed.inject(AccountAnalysisSetupActionsService);

    expect(await service.clearSelections()).toBe(false);
    expect(updateAccountAnalysis).toHaveBeenCalledOnce();
    expect(service.error()).toBe('The account analysis update could not be persisted.');
    expect(service.busy()).toBe(false);
  });

  it('commits the generated analyses through the bulk command and navigates to facility selection', async () => {
    const account = signal({ guid: 'account-a' } as IdbAccount);
    const facility = {
      guid: 'facility-a', accountId: 'account-a', energyIsSource: false, energyUnit: 'kWh', volumeLiquidUnit: 'gal',
      sustainabilityQuestions: { energyReductionBaselineYear: 2020 }
    } as IdbFacility;
    const draft = signal({
      guid: 'account-analysis-a', accountId: 'account-a', name: 'Portfolio plan', analysisCategory: 'energy',
      energyIsSource: true, baselineYear: 2022,
      facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: undefined }]
    } as IdbAccountAnalysisItem);
    const createBulk = vi.fn().mockResolvedValue({ accountAnalysis: draft(), analyses: [] });
    const navigate = vi.fn().mockResolvedValue(true);
    const execute = vi.fn(async (_request, persist: () => Promise<unknown>) => ({ value: await persist(), change: {} }));
    TestBed.configureTestingModule({ providers: [
      AccountAnalysisSetupActionsService,
      {
        provide: AccountAnalysisWorkbenchContext,
        useValue: {
          account,
          facilities: signal([facility]),
          workspace: {
            canWrite: signal(true), hasPending: signal(false),
            meterGroups: signal([{ guid: 'group-a', facilityId: 'facility-a', groupType: 'Energy' }]),
            predictors: signal([])
          }
        }
      },
      { provide: AccountAnalysisAutosaveService, useValue: { draft, flush: vi.fn().mockResolvedValue(true) } },
      { provide: WorkspaceCommandBoundary, useValue: { execute } },
      { provide: AnalysisCommandHandler, useValue: { createBulkFacilityAnalysesForAccount: createBulk } },
      { provide: WorkspaceNavigationService, useValue: { accountAnalysisWorkbenchRoute: () => ['/select-items'] } },
      { provide: Router, useValue: { navigate } }
    ] });
    const service = TestBed.inject(AccountAnalysisSetupActionsService);

    expect(await service.createBulkFacilityAnalyses('absoluteEnergyConsumption')).toBe(true);
    expect(createBulk).toHaveBeenCalledWith(expect.objectContaining({
      accountGuid: 'account-a', accountAnalysisGuid: 'account-analysis-a',
      analyses: [expect.objectContaining({ facilityId: 'facility-a', baselineYear: 2022 })]
    }));
    expect(navigate).toHaveBeenCalledWith(['/select-items']);
    expect(service.busy()).toBe(false);
  });
});
