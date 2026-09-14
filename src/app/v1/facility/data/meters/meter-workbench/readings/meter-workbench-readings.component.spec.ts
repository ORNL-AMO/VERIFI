import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { ElectronService } from '@platform/electron/electron.service';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { WorkspaceNavigationService } from '../../../../../shell/workspace-navigation.service';
import { ModalPortalService } from '../../../../../shell/modal-portal.service';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { account, facility, meter, reading } from '../../facility-meters.testing';
import { MeterReadingColumnDraft, buildColumnDraft } from './meter-workbench-readings.models';
import { MeterReadingBillSlideoutComponent } from './meter-reading-bill-slideout/meter-reading-bill-slideout.component';
import { MeterReadingsColumnsSlideoutComponent } from './meter-readings-columns-slideout/meter-readings-columns-slideout.component';
import { MeterReadingsStatusComponent } from './meter-readings-status/meter-readings-status.component';
import { MeterReadingsTableComponent } from './meter-readings-table/meter-readings-table.component';
import { MeterWorkbenchReadingsComponent } from './meter-workbench-readings.component';

describe('MeterWorkbenchReadingsComponent', () => {
  it('renders readings table actions without legacy navigation buttons', () => {
    const fixture = setup();

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Choose Columns');
    expect(text).toContain('Add New Bill');
    expect(text).toContain('Delete Selected');
    expect(text).not.toContain('bills tracked');
    expect(text).not.toContain('Import Data');
    expect(text).not.toContain('Meter Settings');
    expect(text).not.toContain('Data Quality Report');
    expect(fixture.nativeElement.querySelector('.meter-readings-table__action-row')).not.toBeNull();
  });

  it('shows the empty state with add bill only', () => {
    const fixture = setup({ readings: [] });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('No bills found');
    expect(text).toContain('Add New Bill');
    expect(text).not.toContain('Import');
  });

  it('opens column and bill slideouts from workbench actions', () => {
    const fixture = setup();
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find(button => button.textContent?.includes('Choose Columns'))?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-meter-readings-columns-slideout')).not.toBeNull();

    buttons.find(button => button.textContent?.includes('Add New Bill'))?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-meter-reading-bill-slideout')).not.toBeNull();
  });

  it('disables mutating actions while the workspace is read only', () => {
    const fixture = setup({ canWrite: false });

    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.find(button => button.textContent?.includes('Choose Columns'))?.disabled).toBe(true);
    expect(buttons.find(button => button.textContent?.includes('Add New Bill'))?.disabled).toBe(true);
    expect(buttons.find(button => button.textContent?.includes('Delete Selected'))?.disabled).toBe(true);
  });

  it('persists column choices through the command boundary', async () => {
    const { fixture, meterHandler, commandBoundary } = setupHarness({
      meterValue: meter({
        id: 2,
        guid: 'meter-a',
        name: 'Electric Main',
        source: 'Electricity',
        charges: [{
          guid: 'charge-a',
          name: 'Demand Charge',
          chargeType: 'demand',
          displayUsageInTable: false,
          displayChargeInTable: false
        }]
      })
    });
    const component = fixture.componentInstance;
    const draft: MeterReadingColumnDraft = buildColumnDraft(component.account(), component.facility(), component.meter());
    draft.electricityFilters.generalInformationFilters.totalCost = false;
    draft.charges = [{
      ...draft.charges[0],
      displayUsageInTable: true,
      displayChargeInTable: true
    }];

    await component.applyColumns(draft);

    const commandOptions = commandBoundary.execute.mock.calls[0][0];
    expect(commandOptions.publication).toEqual({ mode: 'reload' });
    expect(meterHandler.updateMeterWithFacility).toHaveBeenCalledWith(
      expect.objectContaining({
        guid: 'meter-a',
        charges: [expect.objectContaining({ displayUsageInTable: true, displayChargeInTable: true })]
      }),
      expect.objectContaining({
        tableElectricityFilters: expect.objectContaining({
          generalInformationFilters: expect.objectContaining({ totalCost: false })
        })
      }),
      'account-a'
    );
    expect(component.columnsOpen()).toBe(false);
  });

  it('adds a bill through the shared bill panel and publishes a meter-data patch', async () => {
    const { fixture, meterHandler, commandBoundary } = setupHarness();
    const component = fixture.componentInstance;
    const newReading = reading({ guid: 'reading-new', meterId: 'meter-a', month: 2, totalEnergyUse: 25 });

    component.openAddBill();
    await component.saveBill({ reading: newReading, addAnother: false });

    expect(meterHandler.addMeterData).toHaveBeenCalledWith(
      expect.not.objectContaining({ id: expect.any(Number) }),
      'account-a'
    );
    expect(commandBoundary.execute.mock.calls[0][0].publication.mode).toBe('patch');
    expect(component.billPanel()).toBeUndefined();
  });

  it('blocks adding a bill on an existing reading date', async () => {
    const existingReading = reading({ guid: 'reading-a', meterId: 'meter-a', month: 1, day: 1 });
    const { fixture, meterHandler, commandBoundary } = setupHarness({ readings: [existingReading] });
    const component = fixture.componentInstance;

    component.openAddBill();
    await component.saveBill({
      reading: reading({ guid: 'reading-new', meterId: 'meter-a', month: 1, day: 1 }),
      addAnother: false
    });

    expect(component.actionError()).toBe('A reading already exists for this date.');
    expect(commandBoundary.execute).not.toHaveBeenCalled();
    expect(meterHandler.addMeterData).not.toHaveBeenCalled();
  });

  it('blocks editing a bill onto another reading date while allowing the current reading date', async () => {
    const firstReading = reading({ guid: 'reading-a', meterId: 'meter-a', month: 1, day: 1 });
    const secondReading = reading({ guid: 'reading-b', meterId: 'meter-a', month: 2, day: 1 });
    const { fixture, meterHandler, commandBoundary } = setupHarness({ readings: [firstReading, secondReading] });
    const component = fixture.componentInstance;

    component.openEditBill(firstReading);
    await component.saveBill({
      reading: reading({ guid: 'reading-a', meterId: 'meter-a', month: 1, day: 1, totalEnergyUse: 15 }),
      addAnother: false
    });
    expect(meterHandler.updateMeterData).toHaveBeenCalledWith(expect.objectContaining({ totalEnergyUse: 15 }), 'account-a');

    commandBoundary.execute.mockClear();
    meterHandler.updateMeterData.mockClear();
    component.openEditBill(firstReading);
    await component.saveBill({
      reading: reading({ guid: 'reading-a', meterId: 'meter-a', month: 2, day: 1 }),
      addAnother: false
    });

    expect(component.actionError()).toBe('A reading already exists for this date.');
    expect(commandBoundary.execute).not.toHaveBeenCalled();
    expect(meterHandler.updateMeterData).not.toHaveBeenCalled();
  });

  it('deletes a reading through a patch action', async () => {
    const deletedReading = reading({ guid: 'reading-a', id: 3, meterId: 'meter-a' });
    const { fixture, meterHandler, modalPortal } = setupHarness({ readings: [deletedReading] });
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.requestDelete(deletedReading);
    expect(modalPortal.show).toHaveBeenCalledOnce();

    await component.confirmDelete();

    expect(meterHandler.deleteMeterData).toHaveBeenCalledWith(3);
    expect(component.deleteTarget()).toBeUndefined();
    expect(modalPortal.hide).toHaveBeenCalledOnce();
  });

  it('bulk deletes the readings emitted by the table', async () => {
    const firstReading = reading({ guid: 'reading-a', id: 3, meterId: 'meter-a' });
    const secondReading = reading({ guid: 'reading-b', id: 4, meterId: 'meter-a' });
    const { fixture, meterHandler, modalPortal } = setupHarness({ readings: [firstReading, secondReading] });
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.requestBulkDelete([firstReading, secondReading]);
    expect(modalPortal.show).toHaveBeenCalledOnce();

    await component.confirmBulkDelete();

    expect(meterHandler.deleteMeterData).toHaveBeenCalledWith(3);
    expect(meterHandler.deleteMeterData).toHaveBeenCalledWith(4);
    expect(component.bulkDeleteOpen()).toBe(false);
    expect(component.bulkDeleteReadings()).toEqual([]);
    expect(modalPortal.hide).toHaveBeenCalledOnce();
  });

  it('fills missing months with zero readings through the command boundary', async () => {
    const { fixture, meterHandler } = setupHarness({
      status: {
        meterId: 'meter-a',
        isMeterValid: true,
        isDataOutdated: false,
        hasNegativeReadings: false,
        hasDuplicateEntries: false,
        duplicateEntryDates: [],
        missingDataMonths: [{ month: 3, year: 2026 }],
        missingDataYears: [],
        isDataCurrent: true
      }
    });
    const component = fixture.componentInstance;

    component.requestFillMissing();
    await component.confirmFillMissing();

    expect(meterHandler.addMeterData).toHaveBeenCalledWith(
      expect.objectContaining({
        month: 3,
        year: 2026,
        totalEnergyUse: 0,
        totalVolume: 0,
        totalCost: 0
      }),
      'account-a'
    );
    expect(component.fillMissingOpen()).toBe(false);
  });

  it('opens settings with the status settings fragment from status alerts', () => {
    const { fixture, router } = setupHarness();
    fixture.detectChanges();

    fixture.componentInstance.openSettings();

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-a',
      'settings'
    ], { fragment: 'meter-settings-status' });
  });
});

function setup(options: {
  readings?: ReturnType<typeof reading>[];
  canWrite?: boolean;
  hasPending?: boolean;
} = {}): ComponentFixture<MeterWorkbenchReadingsComponent> {
  return setupHarness(options).fixture;
}

interface SetupOptions {
  readonly readings?: ReturnType<typeof reading>[];
  readonly canWrite?: boolean;
  readonly hasPending?: boolean;
  readonly facilityValue?: ReturnType<typeof facility>;
  readonly meterValue?: ReturnType<typeof meter>;
  readonly status?: ReturnType<typeof defaultStatus>;
}

function setupHarness(options: SetupOptions = {}) {
  const accountValue = account({ displayEmissions: false });
  const facilityValue = options.facilityValue ?? facility({ id: 1 });
  const meterValue = options.meterValue ?? meter({ id: 2, guid: 'meter-a', name: 'Electric Main', source: 'Electricity' });
  const readings = options.readings ?? [
    reading({ guid: 'reading-a', meterId: 'meter-a', month: 1, totalEnergyUse: 10 })
  ];
  const commandBoundary = {
    execute: vi.fn(async (
      metadata: { publication?: { mode?: string; buildPatch?: (value: unknown) => unknown } },
      action: () => Promise<unknown>
    ) => {
      const value = await action();
      if (metadata.publication?.mode === 'patch') {
        metadata.publication.buildPatch?.(value);
      }
      return { value };
    })
  };
  const meterHandler = {
    addMeterData: vi.fn(async item => ({ ...item, id: 7 })),
    updateMeterData: vi.fn(async item => item),
    deleteMeterData: vi.fn(async id => id),
    updateMeterWithFacility: vi.fn(async item => item)
  };
  const modalPortal = {
    show: vi.fn(),
    hide: vi.fn()
  };
  const router = { navigate: vi.fn() };

  TestBed.configureTestingModule({
    declarations: [MeterWorkbenchReadingsComponent],
    imports: [
      CommonModule,
      MeterReadingBillSlideoutComponent,
      MeterReadingsColumnsSlideoutComponent,
      MeterReadingsStatusComponent,
      MeterReadingsTableComponent
    ],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          account: signal(accountValue),
          facility: signal(facilityValue),
          selectedMeter: signal(meterValue),
          selectedMeterData: signal(readings),
          meterStatusChecks: signal([options.status ?? defaultStatus()]),
          canWrite: signal(options.canWrite ?? true),
          hasPending: signal(options.hasPending ?? false)
        }
      },
      {
        provide: AccountWorkspaceStore,
        useValue: {
          account: signal(accountValue),
          selectedFacility: signal(facilityValue),
          meterData: signal(readings),
          customFuels: signal([]),
          customGWPs: signal([])
        }
      },
      {
        provide: WorkspaceCommandBoundary,
        useValue: commandBoundary
      },
      {
        provide: MeterCommandHandler,
        useValue: meterHandler
      },
      { provide: ToastNotificationsService, useValue: { showToast: vi.fn() } },
      {
        provide: ElectronService,
        useValue: {
          isElectron: false,
          checkKeyExists: vi.fn(),
          openFileLocation: vi.fn(),
          savedUtilityFilePath: {}
        }
      },
      { provide: EGridService, useValue: { co2Emissions: [] } },
      { provide: CopyTableService, useValue: { copyTable: vi.fn() } },
      { provide: ModalPortalService, useValue: modalPortal },
      { provide: Router, useValue: router },
      {
        provide: WorkspaceNavigationService,
        useValue: {
          facilityMeterRoute: (facilityGuid: string, meterGuid: string, tab: string) => [
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

  return {
    fixture: TestBed.createComponent(MeterWorkbenchReadingsComponent),
    commandBoundary,
    meterHandler,
    modalPortal,
    router
  };
}

function defaultStatus() {
  return {
    meterId: 'meter-a',
    isMeterValid: true,
    isDataOutdated: false,
    hasNegativeReadings: false,
    hasDuplicateEntries: false,
    duplicateEntryDates: [],
    missingDataMonths: [],
    missingDataYears: [],
    isDataCurrent: true
  };
}
