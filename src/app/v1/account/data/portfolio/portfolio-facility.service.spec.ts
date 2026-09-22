import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { getNewIdbAccount, IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
import { PortfolioFacilityService } from './portfolio-facility.service';

describe('PortfolioFacilityService', () => {
  let service: PortfolioFacilityService;
  let account: ReturnType<typeof signal<IdbAccount | undefined>>;
  let facilities: ReturnType<typeof signal<IdbFacility[]>>;
  let commandBoundary: { execute: ReturnType<typeof vi.fn> };
  let facilityHandler: {
    add: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    account = signal(accountFixture());
    facilities = signal([facilityFixture('facility-a'), facilityFixture('facility-b')]);
    commandBoundary = {
      execute: vi.fn(async (_metadata, operation: () => Promise<unknown>) => ({ value: await operation(), change: {} }))
    };
    facilityHandler = {
      add: vi.fn(async (facility: IdbFacility) => ({ facility: { ...facility, id: 3 } })),
      update: vi.fn(async (facility: IdbFacility) => facility),
      delete: vi.fn(async () => ({ facilityId: 1 }))
    };

    TestBed.configureTestingModule({
      providers: [
        PortfolioFacilityService,
        SettingsFormService,
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account,
            facilities,
            accountAnalyses: signal([]),
            accountReports: signal([])
          }
        },
        { provide: WorkspaceCommandBoundary, useValue: commandBoundary },
        { provide: FacilityCommandHandler, useValue: facilityHandler }
      ]
    });
    service = TestBed.inject(PortfolioFacilityService);
  });

  it('builds name-only facilities from account defaults', () => {
    const facility = service.buildFacility(account()!, { name: '  First Plant  ' });

    expect(facility.name).toBe('First Plant');
    expect(facility.accountId).toBe('account-a');
    expect(facility.city).toBe('Oak Ridge');
    expect(facility.energyUnit).toBe('GJ');
    expect(facility.fiscalYear).toBe('nonCalendarYear');
    expect(facility.dataStalenessSettings).toEqual({
      enabled: true,
      thresholdMonths: 3,
      useAccountSettings: true
    });
  });

  it('uses optional profile details only when requested', () => {
    const collapsed = service.buildFacility(account()!, {
      name: 'Plant A',
      city: 'Ignored',
      classification: 'Warehouse'
    });
    const expanded = service.buildFacility(account()!, {
      name: 'Plant A',
      includeProfileDetails: true,
      city: 'Knoxville',
      state: 'TN',
      size: 40000,
      classification: 'Warehouse'
    });

    expect(collapsed.city).toBe('Oak Ridge');
    expect(collapsed.classification).toBe('Manufacturing');
    expect(expanded.city).toBe('Knoxville');
    expect(expanded.state).toBe('TN');
    expect(expanded.size).toBe(40000);
    expect(expanded.classification).toBe('Warehouse');
  });

  it('creates facilities through the command boundary and facility handler', async () => {
    const created = await service.createFacility({ name: 'New Plant' });

    expect(commandBoundary.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        entityKind: 'facility',
        changeKind: 'add',
        publication: { mode: 'reload' }
      }),
      expect.any(Function)
    );
    expect(facilityHandler.add).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Plant', accountId: 'account-a' }),
      'account-a',
      [],
      []
    );
    expect(created).toEqual(expect.objectContaining({ name: 'New Plant', id: 3 }));
  });

  it('applies account settings only to selected facilities', async () => {
    const updated = await service.applyAccountSettingsToFacilities(['facility-b']);

    expect(facilityHandler.update).toHaveBeenCalledTimes(1);
    expect(facilityHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        guid: 'facility-b',
        name: 'Facility B',
        city: 'Facility City',
        classification: 'Office',
        energyUnit: 'GJ',
        fiscalYear: 'nonCalendarYear',
        dataStalenessSettings: { enabled: true, thresholdMonths: 6, useAccountSettings: true },
        sustainabilityQuestions: expect.objectContaining({ energyReductionPercent: 30 })
      }),
      'account-a'
    );
    expect(updated).toHaveLength(1);
  });

  it('deletes facilities through the command boundary', async () => {
    await service.deleteFacility(facilities()[0]);

    expect(commandBoundary.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        entityKind: 'facility',
        changeKind: 'delete',
        entityGuid: 'facility-a',
        publication: { mode: 'reload' }
      }),
      expect.any(Function)
    );
    expect(facilityHandler.delete).toHaveBeenCalledWith(facilities()[0], 'account-a');
  });
});

function accountFixture(): IdbAccount {
  return {
    ...getNewIdbAccount(),
    id: 1,
    guid: 'account-a',
    name: 'Account A',
    city: 'Oak Ridge',
    state: 'TN',
    zip: '37830',
    address: '1 Account Way',
    unitsOfMeasure: 'Metric',
    energyUnit: 'GJ',
    fiscalYear: 'nonCalendarYear',
    fiscalYearMonth: 6,
    fiscalYearCalendarEnd: false,
    sustainabilityQuestions: {
      ...getNewIdbAccount().sustainabilityQuestions,
      energyReductionPercent: 30
    },
    dataStalenessSettings: { enabled: true, thresholdMonths: 6 }
  };
}

function facilityFixture(guid: string): IdbFacility {
  return {
    id: guid === 'facility-a' ? 1 : 2,
    guid,
    accountId: 'account-a',
    name: guid === 'facility-a' ? 'Facility A' : 'Facility B',
    city: 'Facility City',
    state: 'KY',
    zip: '40000',
    country: 'US',
    address: '2 Facility Way',
    naics1: '',
    naics2: '',
    naics3: '',
    notes: '',
    unitsOfMeasure: 'Imperial',
    energyUnit: 'MMBtu',
    electricityUnit: 'kWh',
    volumeLiquidUnit: 'gal',
    volumeGasUnit: 'SCF',
    massUnit: 'lb',
    fiscalYear: 'calendarYear',
    fiscalYearMonth: 0,
    fiscalYearCalendarEnd: true,
    energyIsSource: true,
    sustainabilityQuestions: getNewIdbAccount().sustainabilityQuestions,
    dataStalenessSettings: { enabled: false, thresholdMonths: 12, useAccountSettings: false },
    classification: 'Office',
    color: '#123456',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    createdDate: new Date('2026-01-01'),
    modifiedDate: new Date('2026-01-01')
  };
}
