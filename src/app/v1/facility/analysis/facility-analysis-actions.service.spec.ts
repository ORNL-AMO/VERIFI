import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { FacilityAnalysisActionsService, getActiveAnalysisEligibility } from './facility-analysis-actions.service';

describe('FacilityAnalysisActionsService', () => {
  it('creates analyses through the factory and command boundary', async () => {
    const analysisHandler = pairHandler(5);
    const boundary = boundaryFake();
    const service = setup([], analysisHandler, boundary);

    const created = await service.createAnalysis('energy');

    expect(created).toMatchObject({ id: 5, accountId: 'account-a', facilityId: 'facility-a', analysisCategory: 'energy' });
    expect(created.groups.map(group => group.idbGroupId)).toEqual(['energy-group']);
    expect(analysisHandler.addFacilityAnalysisWithSingleSitePair)
      .toHaveBeenCalledWith(expect.objectContaining({ analysisCategory: 'energy' }), 'account-a');
    expect(boundary.execute).toHaveBeenCalledWith(expect.objectContaining({ changeKind: 'add' }), expect.any(Function));
  });

  it('deep copies an analysis with new identity and dates', async () => {
    const source = analysis();
    const analysisHandler = pairHandler(8);
    const service = setup([source], analysisHandler, boundaryFake());

    const copy = await service.copyAnalysis(source.guid);

    expect(copy.id).toBe(8);
    expect(copy.guid).not.toBe(source.guid);
    expect(copy.name).toBe('Energy model (copy)');
    expect(copy.groups).toEqual(source.groups);
    expect(copy.groups).not.toBe(source.groups);
    expect(source.name).toBe('Energy model');
  });

  it('synchronizes the hidden account pair when the active facility analysis changes', async () => {
    const source = analysis();
    const analysisHandler = pairHandler(8);
    const service = setup([source], analysisHandler, boundaryFake());

    const facility = await service.setActiveAnalysis(source.guid);

    expect(facility.selectedEnergyAnalysisId).toBe(source.guid);
    expect(analysisHandler.setActiveFacilityAnalysisAtomic)
      .toHaveBeenCalledWith('account-a', 'facility-a', source.guid);
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
  analysisHandler: ReturnType<typeof pairHandler>,
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
    { provide: AnalysisCommandHandler, useValue: analysisHandler }
  ] });
  return TestBed.inject(FacilityAnalysisActionsService);
}

function pairHandler(id: number) {
  return {
    addFacilityAnalysisWithSingleSitePair: vi.fn(async item => ({
      analysis: { ...item, id },
      accountAnalyses: []
    })),
    setActiveFacilityAnalysisAtomic: vi.fn(async (_accountGuid, _facilityGuid, analysisGuid) => ({
      facility: {
        guid: 'facility-a',
        accountId: 'account-a',
        selectedEnergyAnalysisId: analysisGuid
      },
      accountAnalyses: []
    }))
  };
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

describe('facility analysis actions from an account inventory', () => {
  function explicitSetup() {
    const selected = signal({ guid: 'facility-a', accountId: 'account-a' });
    const owner = { guid: 'facility-b', accountId: 'account-a', energyUnit: 'kWh', volumeLiquidUnit: 'm3', energyIsSource: false,
      sustainabilityQuestions: { energyReductionBaselineYear: 2020, waterReductionBaselineYear: 2021 } };
    const meterGroups = signal([
      { guid: 'selected-energy', facilityId: 'facility-a', groupType: 'Energy', name: 'Selected energy' },
      { guid: 'owner-water', facilityId: owner.guid, groupType: 'Water', name: 'Owner water' }
    ]);
    const source = analysis({ facilityId: owner.guid });
    const handler = { ...pairHandler(12), deleteFacilityAnalysisAtomic: vi.fn(async () => undefined) };
    const boundary = boundaryFake();
    TestBed.configureTestingModule({ providers: [FacilityAnalysisActionsService,
      { provide: AccountWorkspaceStore, useValue: { account: signal({ guid: 'account-a', sustainabilityQuestions: { energyReductionBaselineYear: 2020 } }), selectedFacility: selected, facilities: signal([selected(), owner]), facilityAnalyses: signal([source]), selectedFacilityAnalyses: signal([]), canWrite: signal(true), hasPending: signal(false), meterGroups,
        predictors: signal([{ guid: 'selected-predictor', facilityId: 'facility-a', name: 'Selected' }, { guid: 'owner-predictor', facilityId: owner.guid, name: 'Owner production', unit: 'ton', production: true }]) } },
      { provide: AnalysisCommandHandler, useValue: handler }, { provide: WorkspaceCommandBoundary, useValue: boundary }
    ] });
    return { service: TestBed.inject(FacilityAnalysisActionsService), selected, handler, source, boundary };
  }
  it('copies, activates and deletes an unselected facility analysis without selecting its owner', async () => {
    const { service, selected, handler, source } = explicitSetup();
    const copy = await service.copyAnalysis(source.guid, 'facility-b');
    expect(copy.facilityId).toBe('facility-b'); expect(copy.guid).not.toBe(source.guid);
    await service.setActiveAnalysis(source.guid, 'facility-b');
    expect(handler.setActiveFacilityAnalysisAtomic).toHaveBeenCalledWith('account-a', 'facility-b', source.guid);
    await service.deleteAnalysis(source.guid, 'facility-b');
    expect(handler.deleteFacilityAnalysisAtomic).toHaveBeenCalledWith({ accountGuid: 'account-a', facilityGuid: 'facility-b', analysisGuid: source.guid });
    expect(selected().guid).toBe('facility-a');
  });
  it('rejects mismatched ownership before any persistence command', async () => {
    const { service, source, boundary } = explicitSetup();
    await expect(service.copyAnalysis(source.guid, 'facility-a')).rejects.toThrow('selected facility');
    await expect(service.deleteAnalysis(source.guid, 'outside-account')).rejects.toThrow('facility');
    expect(boundary.execute).not.toHaveBeenCalled();
  });
  it('creates for an unselected facility using only its groups, predictors, baseline and units', async () => {
    const { service, selected, handler } = explicitSetup();
    expect(service.categoryAvailable('energy', 'facility-b')).toBe(false);
    expect(service.categoryAvailable('water', 'facility-b')).toBe(true);
    const created = await service.createAnalysis('water', 'facility-b');
    expect(created).toMatchObject({ accountId: 'account-a', facilityId: 'facility-b', analysisCategory: 'water', baselineYear: 2021, waterUnit: 'm3', energyUnit: 'kWh', energyIsSource: false });
    expect(created.groups.map(group => group.idbGroupId)).toEqual(['owner-water']);
    expect(created.groups[0].predictorVariables.map(predictor => predictor.id)).toEqual(['owner-predictor']);
    expect(handler.addFacilityAnalysisWithSingleSitePair).toHaveBeenCalledWith(expect.objectContaining({ guid: created.guid, facilityId: 'facility-b' }), 'account-a');
    expect(selected().guid).toBe('facility-a');
  });
  it('rejects creation for missing owners and categories absent from the owning facility', async () => {
    const { service, boundary } = explicitSetup();
    await expect(service.createAnalysis('energy', 'facility-b')).rejects.toThrow('meter group');
    await expect(service.createAnalysis('water', 'outside-account')).rejects.toThrow('facility');
    expect(boundary.execute).not.toHaveBeenCalled();
  });
});
