import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { presentFinding } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';
import { account, group, meter, reading } from '../facility-meters.testing';
import { DataModule } from '@app/v1/data/data.module';
import { MetersInventoryComponent } from './meters-inventory.component';

describe('MetersInventoryComponent', () => {
  it('uses shared scope before local filters and retains it when local filters are cleared', () => {
    const fixture = setup(); fixture.detectChanges();
    const scope = TestBed.inject(WorkspaceNavigationService).inventoryFacilityGuid as WritableSignal<string | undefined>;
    scope.set('facility-b'); fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['City Water']);
    expect(fixture.nativeElement.textContent).toContain('Showing 1 of 1 meters');
    expect(fixture.nativeElement.querySelector('[formControlName="facilityGuid"]')).toBeNull();
    fixture.componentInstance.filtersForm.controls.search.setValue('missing'); fixture.detectChanges();
    expect(fixture.componentInstance.filteredMeters()).toHaveLength(0);
    fixture.componentInstance.clearFilters(); fixture.detectChanges();
    expect(scope()).toBe('facility-b'); expect(cardTitles(fixture)).toEqual(['City Water']);
    scope.set(undefined); fixture.detectChanges();
    expect(cardTitles(fixture)).toHaveLength(2);
  });

  it('restores account meter filters when returning from a drilled-in page', () => {
    const fixture = setup(); fixture.detectChanges();
    fixture.componentInstance.filtersForm.patchValue({ search: 'Beta', sort: 'latestReading' }); fixture.detectChanges(); fixture.destroy();
    const restored = TestBed.createComponent(MetersInventoryComponent); restored.detectChanges();
    expect(restored.componentInstance.filtersForm.getRawValue()).toMatchObject({ search: 'Beta', sort: 'latestReading' });
    expect(cardTitles(restored)).toEqual(['City Water']);
  });

  it('renders individual uniform meter tiles with owning-facility labels', () => {
    const fixture = setup();

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(fixture.nativeElement.querySelectorAll('.portfolio-inventory .portfolio-tile').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.v1-resource-browse-card__actions')).toHaveLength(0);
    expect(text).toContain('Alpha Plant');
    expect(text).toContain('Beta Works');
    expect(text).toContain('Main Electric');
    expect(text).toContain('City Water');
    expect(fixture.nativeElement.querySelectorAll('h2')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('app-resource-browse-card')).toHaveLength(0);
    expect(text).not.toContain('First reading');
  });

  it('owns meter search, status filtering, and sort order', () => {
    const fixture = setup();
    fixture.detectChanges();

    expect(cardTitles(fixture)).toEqual(['Main Electric', 'City Water']);

    fixture.componentInstance.filtersForm.controls.search.setValue('beta');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['City Water']);

    fixture.componentInstance.filtersForm.controls.search.setValue('');
    fixture.componentInstance.filtersForm.controls.status.setValue('missingGroup');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Main Electric']);

    fixture.componentInstance.filtersForm.controls.status.setValue('valid');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['City Water']);

    fixture.componentInstance.filtersForm.controls.status.setValue('all');
    fixture.componentInstance.filtersForm.controls.sort.setValue('facilityName');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Main Electric', 'City Water']);
  });

  it('updates groups after inventory changes and clears unmatched filters', () => {
    const fixture = setup();
    const workspace = TestBed.inject(AccountWorkspaceStore);
    fixture.detectChanges();
    fixture.componentInstance.filtersForm.controls.search.setValue('missing');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No meters match');
    fixture.componentInstance.clearFilters();
    fixture.detectChanges();
    expect(cardTitles(fixture)).toHaveLength(2);
    (workspace.meters as unknown as { set(value: unknown[]): void }).set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No meters');
    expect(fixture.nativeElement.querySelector('app-inventory-grid')).toBeNull();
  });

  it('refreshes the reading snapshot when committed readings change without resetting the chosen detail level', () => {
    const fixture = setup(); fixture.detectChanges();
    fixture.componentInstance.inventory.detailControl.setValue('detailed'); fixture.detectChanges();
    const data = TestBed.inject(AccountWorkspaceStore).meterData as WritableSignal<IdbUtilityMeterData[]>;
    data.set([reading({ guid:'new',meterId:'meter-electric',facilityId:'facility-a',year:2026,month:7,totalEnergyUse:0,totalCost:0 })]);
    fixture.detectChanges();
    const tile = fixture.nativeElement.querySelector('.portfolio-inventory .portfolio-tile__name[data-browse-id="meter-electric"]').closest('article') as HTMLElement;
    expect(tile.getAttribute('data-detail')).toBe('detailed');
    expect(tile.querySelector('.reading-snapshot__range')?.textContent).toBe('Jul 2026');
    expect(tile.querySelector('.reading-snapshot__reading-heading strong')?.textContent).toBe('1');
    expect(tile.querySelectorAll('.reading-snapshot__recent-reading')).toHaveLength(1);
    expect(tile.querySelector('.reading-snapshot__recent-reading time')?.textContent).toBe('Jul 1, 2026');
  });

  it('reports navigation failure without changing the inventory', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    vi.mocked(router.navigate).mockRejectedValueOnce(new Error('Navigation failed'));
    await fixture.componentInstance.navigateRoute(['/v1', 'workspace', 'facility', 'facility-b', 'data', 'meters', 'meter-water', 'settings']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('could not be opened');
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('links each tile owner to the current inventory filtered by its facility', () => {
    const fixture = setup();
    fixture.detectChanges();
    const headings = [...fixture.nativeElement.querySelectorAll('.portfolio-inventory .portfolio-tile__owner')] as HTMLAnchorElement[];
    expect(headings.map(link => link.getAttribute('href'))).toEqual([
      '/v1/workspace/account/account-a/data/portfolio/meters?facility=facility-a',
      '/v1/workspace/account/account-a/data/portfolio/meters?facility=facility-b'
    ]);
  });

  it('opens meter routes through the entry owning facility', () => {
    const fixture = setup();
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.portfolio-inventory > li:last-child .portfolio-tile__name') as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-b',
      'data',
      'meters',
      'meter-water',
      'settings'
    ]);
  });
});

function setup(): ComponentFixture<MetersInventoryComponent> {
  const facilities = signal([
    facilityFixture('facility-a', 'Alpha Plant'),
    facilityFixture('facility-b', 'Beta Works')
  ]);
  const electricFinding = presentFinding(makeFinding('meter.currency.stale', 'warning', 'currency', {
    kind: 'meter', guid: 'meter-electric', name: 'Main Electric', accountGuid: 'account-a', facilityGuid: 'facility-a'
  }, { latestPeriod: '2026-01', thresholdMonths: 3 }));

  TestBed.configureTestingModule({
    imports: [
      RouterModule.forRoot([]),
      DataModule
    ],
    providers: [
      {
        provide: AccountWorkspaceStore,
        useValue: {
          account: signal(account()),
          facilities,
          meters: signal([
            meter({ guid: 'meter-electric', name: 'Main Electric', source: 'Electricity', facilityId: 'facility-a', groupId: undefined }),
            meter({ guid: 'meter-water', name: 'City Water', source: 'Water Intake', facilityId: 'facility-b', groupId: 'group-water' })
          ]),
          meterData: signal([
            reading({ guid: 'reading-water', meterId: 'meter-water', facilityId: 'facility-b', month: 2, year: 2026 })
          ]),
          meterGroups: signal([
            group({ guid: 'group-water', name: 'Water', facilityId: 'facility-b', groupType: 'Water' })
          ]),
          canWrite: signal(true),
          hasPending: signal(false)
        }
      },
      { provide: WorkspaceStatusService, useValue: { state: signal('ready'), items: signal([electricFinding]) } },
      {
        provide: WorkspaceNavigationService,
        useValue: {
          inventoryFacilityGuid: signal<string | undefined>(undefined),
          facilityInventoryLink: (guid: string, resource: string) => ({ route: ['/v1', 'workspace', 'account', 'account-a', 'data', 'portfolio', resource], queryParams: { facility: guid } }),
          facilityDataToolRoute: (facilityGuid: string, detail: string) => ['/v1', 'workspace', 'facility', facilityGuid, 'data', detail],
          facilityMeterGroupRoute: (facilityGuid: string, groupGuid: string, tab: string) => ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'meter-grouping', groupGuid, tab],
          facilityMeterRoute: (facilityGuid: string, meterGuid: string, tab = 'settings') => [
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
      }
    ]
  });

  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  return TestBed.createComponent(MetersInventoryComponent);
}

function cardTitles(fixture: ComponentFixture<MetersInventoryComponent>): string[] {
  return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.portfolio-inventory .portfolio-tile__name'))
    .map(element => element.textContent!.trim());
}

function facilityFixture(guid: string, name: string): IdbFacility {
  return {
    guid,
    accountId: 'account-a',
    name,
    energyUnit: 'MMBtu',
    electricityUnit: 'kWh',
    volumeLiquidUnit: 'gal'
  } as IdbFacility;
}
