import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { WorkspaceNavigationService } from '../../../shell/workspace-navigation.service';
import { MeterWorkbenchTabId } from './facility-meters.models';
import { FacilityMetersComponent } from './facility-meters.component';

describe('FacilityMetersComponent', () => {
  it('renders facility meters by group with ungrouped meters', () => {
    const fixture = setup({
      meters: [
        meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy', source: 'Electricity' }),
        meter({ guid: 'meter-water', name: 'City Water', groupId: undefined, source: 'Water Intake' })
      ],
      meterData: [
        reading({ guid: 'reading-a', meterId: 'meter-electric' }),
        reading({ guid: 'reading-b', meterId: 'meter-electric' })
      ],
      groups: [
        group({ guid: 'group-energy', name: 'Purchased Electricity', groupType: 'Energy' })
      ]
    });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Purchased Electricity');
    expect(text).toContain('Electric Main');
    expect(text).toContain('2');
    expect(text).toContain('Ungrouped');
    expect(text).toContain('City Water');
    expect(text).toContain('Coming soon');
  });

  it('renders the no-meter empty state', () => {
    const fixture = setup({ meters: [], meterData: [], groups: [] });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No meters yet');
    expect(fixture.nativeElement.textContent).toContain('Meter cards will appear here');
  });

  it('renders the selected meter workbench tab from the route', () => {
    const fixture = setup({
      route: activatedRoute({ meterGuid: 'meter-electric', tab: 'monthly' }),
      meters: [
        meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy', source: 'Electricity' })
      ],
      meterData: [
        reading({ guid: 'reading-a', meterId: 'meter-electric' })
      ],
      groups: [
        group({ guid: 'group-energy', name: 'Purchased Electricity', groupType: 'Energy' })
      ]
    });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Electric Main');
    expect(text).toContain('Monthly Data');
    expect(text).toContain('Monthly calendarized data review is WIP.');
    expect(text).toContain('Purchased Electricity');
  });

  it('renders a not-found state for a missing or foreign meter route', () => {
    const fixture = setup({
      route: activatedRoute({ meterGuid: 'foreign-meter', tab: 'settings' }),
      meters: [
        meter({ guid: 'meter-electric', name: 'Electric Main', groupId: undefined, source: 'Electricity' })
      ]
    });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Meter not found');
    expect(text).toContain('This meter is not available in Facility A.');
  });

  it('shows read-only and pending state messaging', () => {
    const readOnlyFixture = setup({ canWrite: false });
    readOnlyFixture.detectChanges();
    expect(readOnlyFixture.nativeElement.textContent).toContain('Meter actions are unavailable');

    TestBed.resetTestingModule();

    const pendingFixture = setup({ hasPending: true });
    pendingFixture.detectChanges();
    expect(pendingFixture.nativeElement.textContent).toContain('Another workspace update is still finishing');
  });
});

function setup(options: {
  route?: ActivatedRoute;
  meters?: IdbUtilityMeter[];
  meterData?: IdbUtilityMeterData[];
  groups?: IdbUtilityMeterGroup[];
  canWrite?: boolean;
  hasPending?: boolean;
} = {}): ComponentFixture<FacilityMetersComponent> {
  const account = signal({ guid: 'account-a', name: 'Account A' });
  const facility = signal({ guid: 'facility-a', name: 'Facility A' });
  const meters = signal(options.meters ?? []);
  const meterData = signal(options.meterData ?? []);
  const groups = signal(options.groups ?? []);
  const canWrite = signal(options.canWrite ?? true);
  const hasPending = signal(options.hasPending ?? false);

  TestBed.configureTestingModule({
    declarations: [FacilityMetersComponent],
    imports: [CommonModule],
    providers: [
      {
        provide: AccountWorkspaceStore,
        useValue: {
          account,
          selectedFacility: facility,
          facilityMeters: meters,
          facilityMeterData: meterData,
          facilityMeterGroups: groups,
          canWrite,
          hasPending
        }
      },
      {
        provide: WorkspaceNavigationService,
        useValue: {
          facilityDataRoute: (facilityGuid: string, detail = 'meters') => [
            '/v1',
            'workspace',
            'facility',
            facilityGuid,
            'data',
            detail
          ],
          facilityMeterRoute: (facilityGuid: string, meterGuid: string, tab: MeterWorkbenchTabId = 'settings') => [
            '/v1',
            'workspace',
            'facility',
            facilityGuid,
            'data',
            'meters',
            meterGuid,
            tab
          ]
        }
      },
      { provide: Router, useValue: { navigate: vi.fn() } },
      { provide: ActivatedRoute, useValue: options.route ?? activatedRoute() }
    ]
  });

  return TestBed.createComponent(FacilityMetersComponent);
}

function activatedRoute(options: { meterGuid?: string; tab?: MeterWorkbenchTabId } = {}): ActivatedRoute {
  return {
    paramMap: of(convertToParamMap({})),
    parent: {
      paramMap: of(convertToParamMap(options.meterGuid ? { meterGuid: options.meterGuid } : {}))
    },
    data: of(options.tab ? { meterTab: options.tab } : {})
  } as ActivatedRoute;
}

function meter(options: Partial<IdbUtilityMeter>): IdbUtilityMeter {
  return {
    guid: options.guid ?? 'meter-a',
    accountId: 'account-a',
    facilityId: 'facility-a',
    groupId: options.groupId,
    name: options.name ?? 'Meter A',
    source: options.source ?? 'Electricity',
    meterNumber: undefined,
    accountNumber: undefined,
    phase: 'Gas',
    siteToSource: 3,
    supplier: undefined,
    startingUnit: 'kWh',
    energyUnit: 'kWh',
    demandUnit: 'kW',
    scope: 3,
    agreementType: 1,
    includeInEnergy: true,
    retainRECs: false,
    directConnection: false,
    recsMultiplier: 0,
    greenPurchaseFraction: .5,
    marketGHGMultiplier: 1,
    locationGHGMultiplier: 1,
    charges: [],
    ...options
  } as IdbUtilityMeter;
}

function reading(options: Partial<IdbUtilityMeterData>): IdbUtilityMeterData {
  return {
    guid: options.guid ?? 'reading-a',
    accountId: 'account-a',
    facilityId: 'facility-a',
    meterId: options.meterId ?? 'meter-a',
    day: 1,
    month: 1,
    year: 2026,
    migratedDates: true,
    totalEnergyUse: 10,
    totalCost: 20,
    checked: false,
    ...options
  } as IdbUtilityMeterData;
}

function group(options: Partial<IdbUtilityMeterGroup>): IdbUtilityMeterGroup {
  return {
    guid: options.guid ?? 'group-a',
    accountId: 'account-a',
    facilityId: 'facility-a',
    groupType: options.groupType ?? 'Energy',
    name: options.name ?? 'Group A',
    visible: true,
    ...options
  } as IdbUtilityMeterGroup;
}
