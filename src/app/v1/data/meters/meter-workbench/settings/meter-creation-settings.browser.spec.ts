import { computed, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { MeterSource } from '@data/models/constantsAndTypes';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { account, facility } from '../../facility-meters.testing';
import { MeterActionsService } from '../../meter-actions.service';
import { MetersModule } from '../../meters.module';
import { MeterWorkbenchSettingsComponent } from './meter-workbench-settings.component';

interface CreationDefaults {
  readonly source: MeterSource;
  readonly scope: number | undefined;
  readonly startingUnit: string;
  readonly unitLabel: string;
  readonly energyUnit: string;
  readonly siteToSource: number;
}

const SOURCE_DEFAULTS: readonly CreationDefaults[] = [
  { source: 'Electricity', scope: 3, startingUnit: 'kWh', unitLabel: 'Kilowatt-hour (kWh)', energyUnit: 'kWh', siteToSource: 3 },
  { source: 'Natural Gas', scope: 1, startingUnit: 'SCF', unitLabel: 'Standard Cubic Feet (SCF)', energyUnit: 'MMBtu', siteToSource: 1 },
  { source: 'Other Fuels', scope: 1, startingUnit: 'SCF', unitLabel: 'Standard Cubic Feet (SCF)', energyUnit: 'MMBtu', siteToSource: 1 },
  { source: 'Other Energy', scope: 4, startingUnit: 'lb', unitLabel: 'Pounds (lb)', energyUnit: 'MMBtu', siteToSource: 1.33 },
  { source: 'Water Intake', scope: undefined, startingUnit: 'gal', unitLabel: 'Gallon (gal)', energyUnit: 'MMBtu', siteToSource: 1 },
  { source: 'Water Discharge', scope: undefined, startingUnit: 'gal', unitLabel: 'Gallon (gal)', energyUnit: 'MMBtu', siteToSource: 1 },
  { source: 'Other', scope: 100, startingUnit: 'lb', unitLabel: 'Pounds (lb)', energyUnit: 'MMBtu', siteToSource: 1 }
];

describe('meter creation defaults through saved Settings in Chromium', () => {
  let harness: IndexedDbTestHarness;
  let fixture: ComponentFixture<MeterWorkbenchSettingsComponent> | undefined;
  let host: HTMLElement | undefined;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [MetersModule],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { fragment: null } } },
        { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } },
        { provide: FacilityMetersWorkspaceService, useFactory: () => {
          const store = inject(AccountWorkspaceStore);
          const selectedMeter = store.selectedMeter;
          const selectedMeterData = computed(() => store.meterData().filter(reading => reading.meterId === selectedMeter()?.guid));
          return {
            account: store.account,
            facility: store.selectedFacility,
            selectedMeter,
            selectedMeterGuid: computed(() => selectedMeter()?.guid),
            selectedMeterCard: computed(() => {
              const meter = selectedMeter();
              return meter ? { meter, readingCount: selectedMeterData().length } : undefined;
            }),
            selectedMeterData,
            canWrite: store.canWrite,
            hasPending: store.hasPending
          };
        } },
        { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } },
        { provide: WorkspaceNavigationService, useValue: { openFacilityInventory: vi.fn() } }
      ]
    });
    harness = await IndexedDbTestHarness.create('meter-creation-settings');
    await harness.seed({
      accounts: [{ ...account({ id: 1, assessmentReportVersion: 'AR6', energyUnit: 'MMBtu' }) }],
      facilities: [{ ...facility({ id: 2, energyUnit: 'MMBtu', electricityUnit: 'kWh', volumeGasUnit: 'SCF', volumeLiquidUnit: 'gal', massUnit: 'lb' }) }]
    });
    const workspace = TestBed.inject(AccountWorkspaceService);
    await workspace.selectAccount('account-a');
    workspace.selectFacility('facility-a');
  });

  afterEach(async () => {
    fixture?.destroy(); fixture = undefined;
    host?.remove(); host = undefined;
    vi.restoreAllMocks();
    await harness.destroy();
  });

  it.each(SOURCE_DEFAULTS)('persists $source defaults before Settings opens and hydrates without another write', async expected => {
    const workspace = TestBed.inject(AccountWorkspaceService);
    const store = TestBed.inject(AccountWorkspaceStore);
    const execute = vi.spyOn(TestBed.inject(WorkspaceCommandBoundary), 'execute');
    const updateSettings = vi.spyOn(TestBed.inject(MeterCommandHandler), 'updateMeterWithData');
    const created = await TestBed.inject(MeterActionsService).createMeter({ name: `${expected.source} meter`, source: expected.source });

    expect(created.id).toBeDefined();
    expect(created).toMatchObject({ source: expected.source, scope: expected.scope, startingUnit: expected.startingUnit,
      energyUnit: expected.energyUnit, siteToSource: expected.siteToSource, accountId: 'account-a', facilityId: 'facility-a' });
    const persisted = await harness.getAll('utilityMeter');
    expect(persisted).toEqual([created]);

    // Reload the native record rather than passing the creation result directly to the editor.
    await workspace.reloadActiveWorkspace();
    workspace.selectMeter(created.guid);
    expect(store.selectedMeter()).toEqual(created);
    fixture = TestBed.createComponent(MeterWorkbenchSettingsComponent);
    host = document.createElement('main'); host.className = 'v1-root';
    document.body.append(host); host.append(fixture.nativeElement);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();

    const form = fixture.componentInstance.formSignal()!;
    const collectionUnit = host.querySelector<HTMLSelectElement>('select[formControlName="startingUnit"]')!;
    const source = host.querySelector<HTMLSelectElement>('select[formControlName="source"]')!;
    expect(source.selectedOptions[0].textContent?.trim()).toBe(expected.source);
    expect(collectionUnit.selectedOptions[0].textContent?.trim()).toBe(expected.unitLabel);
    expect(form.getRawValue()).toMatchObject({ source: expected.source, startingUnit: expected.startingUnit,
      energyUnit: expected.energyUnit, siteToSource: expected.siteToSource });
    expect(form.controls.scope.value ?? undefined).toBe(expected.scope);
    expect(form.pristine).toBe(true);

    await workspace.reloadActiveWorkspace();
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.componentInstance.formSignal()!.pristine).toBe(true);
    expect(execute).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ entityKind: 'meter', changeKind: 'add', entityGuid: created.guid }), expect.any(Function));
    expect(updateSettings).not.toHaveBeenCalled();
    expect(await harness.getAll('utilityMeter')).toEqual(persisted);

    fixture.destroy(); fixture = undefined;
    await harness.reopen();
    expect(await harness.getAll('utilityMeter')).toEqual(persisted);
    expect(execute).toHaveBeenCalledOnce();
    expect(updateSettings).not.toHaveBeenCalled();
  });
});
