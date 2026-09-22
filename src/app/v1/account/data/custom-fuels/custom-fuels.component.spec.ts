import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewAccountCustomFuel, IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { AccountDataModule } from '../account-data.module';
import { CustomFuelService } from './custom-fuel.service';
import { CustomFuelsComponent } from './custom-fuels.component';

describe('CustomFuelsComponent', () => {
  const accountValue = { ...getNewIdbAccount(), guid: 'account-a' };
  const account = signal(accountValue);
  const fuels = signal<IdbCustomFuel[]>([]);
  const canWrite = signal(true);
  const hasPending = signal(false);
  const error = signal(undefined);
  let fixture: ComponentFixture<CustomFuelsComponent>;
  let customFuelService: {
    newFuel: ReturnType<typeof vi.fn>;
    impactFor: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    fuels.set([]);
    canWrite.set(true);
    hasPending.set(false);
    customFuelService = {
      newFuel: vi.fn(() => getNewAccountCustomFuel(accountValue)),
      impactFor: vi.fn(() => ({ meterCount: 0, facilityCount: 0, meterNames: [], facilityNames: [] })),
      create: vi.fn(async (fuel: IdbCustomFuel) => fuel),
      update: vi.fn(async (fuel: IdbCustomFuel) => fuel),
      delete: vi.fn(async () => undefined)
    };
    TestBed.configureTestingModule({
      imports: [AccountDataModule],
      providers: [
        {
          provide: AccountWorkspaceStore,
          useValue: { account, customFuels: fuels, canWrite, hasPending, error }
        },
        { provide: CustomFuelService, useValue: customFuelService }
      ]
    });
    fixture = TestBed.createComponent(CustomFuelsComponent);
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders an empty state and opens the add form in a large workspace slideout', () => {
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('No custom fuels');
    expect(element.querySelector('.custom-fuels__title app-ui-icon')).toBeTruthy();
    (element.querySelector('app-data-empty-state button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.editorOpen()).toBe(true);
    expect(element.querySelector('.v1-workspace-slideout--large')).toBeTruthy();
    expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
  });

  it('renders fuel cards with meter impact and disables actions while readonly', () => {
    fuels.set([{ ...getNewAccountCustomFuel(accountValue), id: 1, value: 'Custom gas', heatCapacityValue: 1 }]);
    customFuelService.impactFor.mockReturnValue({
      meterCount: 2,
      facilityCount: 1,
      meterNames: ['Boiler', 'Furnace'],
      facilityNames: ['Plant A']
    });
    canWrite.set(false);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Custom gas');
    expect(element.textContent).toContain('Used by 2 meters');
    expect(Array.from(element.querySelectorAll<HTMLButtonElement>('.custom-fuel-card__actions button')).every(button => button.disabled)).toBe(true);
  });

  it('does not submit deletion when a fuel is in use', async () => {
    const fuel = { ...getNewAccountCustomFuel(accountValue), id: 1, value: 'In use' };
    customFuelService.impactFor.mockReturnValue({
      meterCount: 1,
      facilityCount: 1,
      meterNames: ['Boiler'],
      facilityNames: ['Plant A']
    });
    fixture.detectChanges();
    fixture.componentInstance.fuelToDelete.set(fuel);

    await fixture.componentInstance.confirmDelete();

    expect(customFuelService.delete).not.toHaveBeenCalled();
  });

  it('keeps a dirty editor open when discard is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fixture.detectChanges();
    fixture.componentInstance.openAdd();
    fixture.componentInstance.setEditorDirty(true);

    fixture.componentInstance.requestCloseEditor();

    expect(fixture.componentInstance.editorOpen()).toBe(true);
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });

  it('blocks drawer close while a save is in progress', () => {
    fixture.detectChanges();
    fixture.componentInstance.openAdd();
    fixture.componentInstance.setEditorDirty(true);
    fixture.componentInstance.setEditorSaving(true);

    fixture.componentInstance.requestCloseEditor();

    expect(fixture.componentInstance.editorOpen()).toBe(true);
    expect(fixture.componentInstance.isNavigationBlocked()).toBe(true);
  });

  it('shows pending workspace feedback and disables add actions', () => {
    hasPending.set(true);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('A workspace change is being saved');
    expect((element.querySelector('.custom-fuels__header button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps deletion state and shows an inline error when delete fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fuel = { ...getNewAccountCustomFuel(accountValue), id: 1, value: 'Failed delete' };
    customFuelService.delete.mockRejectedValueOnce(new Error('write failed'));
    fixture.detectChanges();
    fixture.componentInstance.fuelToDelete.set(fuel);

    await fixture.componentInstance.confirmDelete();

    expect(fixture.componentInstance.fuelToDelete()).toBe(fuel);
    expect(fixture.componentInstance.deleteError).toContain('could not be deleted');
    expect(fixture.componentInstance.isDeleting).toBe(false);
  });
});
