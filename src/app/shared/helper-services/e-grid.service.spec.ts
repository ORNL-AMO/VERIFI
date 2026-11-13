import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { getNewAccountEmissionsItem } from '@data/models/idbModels/customEmissions';
import { EGridService } from './e-grid.service';

describe('bundled eGRID input catalog', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('publishes parsed bundled rates separately while retaining legacy bundled-and-custom behavior', () => {
    const custom = { ...getNewAccountEmissionsItem('account-a'), subregion: 'CUSTOM-A' };
    const customEmissions = signal([custom]);
    TestBed.configureTestingModule({ providers: [EGridService, { provide: AccountWorkspaceStore, useValue: { customEmissions } }] });
    const service = TestBed.inject(EGridService);
    expect(service.builtinEmissions()).toBeUndefined();
    service.setCo2Emissions([
      { SUBRGN: 'REGION', CO2: '10', CH4: '2', N2O: '3', Year: '2025', CATEGORY: 'LocationMix' },
      { SUBRGN: 'REGION', CO2: '20', CH4: '4', N2O: '6', Year: '2025', CATEGORY: 'ResidualMix' }
    ]);
    const expected = [{ subregion: 'REGION', locationEmissionRates: [{ year: 2025, CO2: 10, CH4: 2, N2O: 3 }],
      residualEmissionRates: [{ year: 2025, CO2: 20, CH4: 4, N2O: 6 }] }];
    expect(service.builtinEmissions()).toEqual(expected);
    expect(service.co2Emissions).toEqual([...expected, custom]);
    // The legacy mutable catalog cannot mutate the separately published bundled input.
    service.excelCo2Emissions[0].locationEmissionRates[0].CO2 = -1;
    expect(service.builtinEmissions()).toEqual(expected);
    customEmissions.set([{ ...getNewAccountEmissionsItem('account-b'), subregion: 'CUSTOM-B' }]); TestBed.flushEffects();
    expect(service.co2Emissions.map(item => item.subregion)).toEqual(['REGION', 'CUSTOM-B']);
    expect(service.builtinEmissions()).toEqual(expected);
  });

  it('distinguishes an unloaded catalog from a parsed empty catalog', () => {
    TestBed.configureTestingModule({ providers: [EGridService, { provide: AccountWorkspaceStore, useValue: { customEmissions: signal([]) } }] });
    const service = TestBed.inject(EGridService);
    expect(service.builtinEmissions()).toBeUndefined();
    service.setCo2Emissions([]);
    expect(service.builtinEmissions()).toEqual([]);
  });
});
