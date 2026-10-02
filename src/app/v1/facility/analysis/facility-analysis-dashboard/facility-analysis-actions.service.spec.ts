import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { FacilityAnalysisActionsService, getActiveAnalysisEligibility } from './facility-analysis-actions.service';

describe('FacilityAnalysisActionsService', () => {
  it('creates analyses through the factory and command boundary', async () => {
    const analysisHandler = { addFacilityAnalysis: vi.fn(async item => ({ ...item, id: 5 })) };
    const boundary = boundaryFake();
    const service = setup([], analysisHandler, boundary);

    const created = await service.createAnalysis('energy');

    expect(created).toMatchObject({ id: 5, accountId: 'account-a', facilityId: 'facility-a', analysisCategory: 'energy' });
    expect(created.groups.map(group => group.idbGroupId)).toEqual(['energy-group']);
    expect(analysisHandler.addFacilityAnalysis).toHaveBeenCalledWith(expect.objectContaining({ analysisCategory: 'energy' }), 'account-a');
    expect(boundary.execute).toHaveBeenCalledWith(expect.objectContaining({ changeKind: 'add' }), expect.any(Function));
  });

  it('deep copies an analysis with new identity and dates', async () => {
    const source = analysis();
    const analysisHandler = { addFacilityAnalysis: vi.fn(async item => ({ ...item, id: 8 })) };
    const service = setup([source], analysisHandler, boundaryFake());

    const copy = await service.copyAnalysis(source.guid);

    expect(copy.id).toBe(8);
    expect(copy.guid).not.toBe(source.guid);
    expect(copy.name).toBe('Energy model (copy)');
    expect(copy.groups).toEqual(source.groups);
    expect(copy.groups).not.toBe(source.groups);
    expect(source.name).toBe('Energy model');
  });
});

describe('getActiveAnalysisEligibility', () => {
  const account = { sustainabilityQuestions: { energyReductionBaselineYear: 2020, waterReductionBaselineYear: 2021 } } as any;

  it('requires the category account baseline for established facilities', () => {
    expect(getActiveAnalysisEligibility(account, { isNewFacility: false } as any, analysis({ baselineYear: 2020 })).allowed).toBe(true);
    expect(getActiveAnalysisEligibility(account, { isNewFacility: false } as any, analysis({ baselineYear: 2022 })).allowed).toBe(false);
  });

  it('allows a later baseline for a new facility', () => {
    expect(getActiveAnalysisEligibility(account, { isNewFacility: true } as any, analysis({ baselineYear: 2022 })).allowed).toBe(true);
  });
});

function setup(
  analyses: readonly IdbAnalysisItem[],
  analysisHandler: { addFacilityAnalysis: ReturnType<typeof vi.fn> },
  boundary: ReturnType<typeof boundaryFake>
): FacilityAnalysisActionsService {
  const account = {
    guid: 'account-a', energyUnit: 'MMBtu', volumeLiquidUnit: 'gal', energyIsSource: true,
    sustainabilityQuestions: { energyReductionBaselineYear: 2020, waterReductionBaselineYear: 2021 }
  };
  const facility = {
    guid: 'facility-a', accountId: 'account-a', energyUnit: 'MMBtu', volumeLiquidUnit: 'gal', energyIsSource: true,
    sustainabilityQuestions: account.sustainabilityQuestions
  };
  TestBed.configureTestingModule({ providers: [
    FacilityAnalysisActionsService,
    { provide: AccountWorkspaceStore, useValue: {
      account: signal(account), selectedFacility: signal(facility), canWrite: signal(true), hasPending: signal(false),
      selectedFacilityAnalyses: signal(analyses),
      facilityMeterGroups: signal([{ guid: 'energy-group', facilityId: 'facility-a', groupType: 'Energy', name: 'Energy' }]),
      meterGroups: signal([{ guid: 'energy-group', facilityId: 'facility-a', groupType: 'Energy', name: 'Energy' }]),
      predictors: signal([])
    } },
    { provide: WorkspaceCommandBoundary, useValue: boundary },
    { provide: AnalysisCommandHandler, useValue: analysisHandler },
    { provide: FacilityCommandHandler, useValue: { update: vi.fn(async value => value) } }
  ] });
  return TestBed.inject(FacilityAnalysisActionsService);
}

function boundaryFake() {
  return { execute: vi.fn(async (_options, persist) => ({ value: await persist(), change: {} })) };
}

function analysis(overrides: Partial<IdbAnalysisItem> = {}): IdbAnalysisItem {
  return {
    id: 1, guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Energy model',
    analysisCategory: 'energy', energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2020,
    hasBanking: false, bankedAnalysisItemId: undefined!, createdDate: new Date('2025-01-01'), modifiedDate: new Date('2025-01-02'),
    groups: [{ idbGroupId: 'energy-group', analysisType: 'regression', predictorVariables: [] } as any],
    ...overrides
  };
}
