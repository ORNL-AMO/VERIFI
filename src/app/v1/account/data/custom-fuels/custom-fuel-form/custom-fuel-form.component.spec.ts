import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewAccountCustomFuel, IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { AccountDataModule } from '../../account-data.module';
import { CustomFuelService } from '../custom-fuel.service';
import { CustomFuelFormComponent } from './custom-fuel-form.component';

describe('CustomFuelFormComponent', () => {
  const accountValue = { ...getNewIdbAccount(), guid: 'account-a', energyUnit: 'MMBtu' };
  const account = signal(accountValue);
  const customFuels = signal<IdbCustomFuel[]>([]);
  let fixture: ComponentFixture<CustomFuelFormComponent>;
  let service: {
    newFuel: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    account.set(accountValue);
    customFuels.set([]);
    service = {
      newFuel: vi.fn(() => getNewAccountCustomFuel(accountValue)),
      create: vi.fn(async fuel => ({ ...fuel, id: 1 })),
      update: vi.fn(async fuel => fuel)
    };
    TestBed.configureTestingModule({
      imports: [AccountDataModule],
      providers: [
        { provide: AccountWorkspaceStore, useValue: { account, customFuels } },
        { provide: CustomFuelService, useValue: service }
      ]
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('requires a unique fuel name across standard and account custom fuels', () => {
    customFuels.set([{ ...getNewAccountCustomFuel(accountValue), guid: 'other', value: 'Account fuel' }]);
    fixture = TestBed.createComponent(CustomFuelFormComponent);
    fixture.detectChanges();

    const name = fixture.componentInstance.form.controls['fuelName'];
    name.setValue('Account fuel');
    expect(name.hasError('duplicateFuelName')).toBe(true);

    name.setValue('Blast Furnace Gas');
    expect(name.hasError('duplicateFuelName')).toBe(true);

    name.setValue('Unique custom fuel');
    expect(name.valid).toBe(true);
  });

  it('switches stationary fields and validation when mobile use is selected', () => {
    fixture = TestBed.createComponent(CustomFuelFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.controls['isMobile'].setValue(true);
    component.onMobileChanged();

    expect(component.form.controls['phase'].value).toBe('Liquid');
    expect(component.form.controls['heatCapacityValue'].value).toBe(1);
    expect(component.form.controls['siteToSourceMultiplier'].value).toBe(1);
    component.form.controls['heatCapacityValue'].setValue(null);
    expect(component.form.controls['heatCapacityValue'].hasError('required')).toBe(false);
  });

  it('calculates AR5 output and saves a valid add through the feature service', async () => {
    fixture = TestBed.createComponent(CustomFuelFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.patchValue({
      fuelName: 'Custom gas',
      isMobile: false,
      phase: 'Gas',
      heatCapacityValue: 1.1,
      siteToSourceMultiplier: 1,
      isBiofuel: false,
      directEmissionsRate: false,
      CO2: 50,
      CH4: 2,
      N2O: 1
    });
    component.recalculateOutputRate();

    expect(component.form.controls['emissionsOutputRate'].value).toBe(50.321);
    await component.save();

    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({
      value: 'Custom gas',
      emissionsOutputRate: 50.321,
      startingUnit: accountValue.volumeGasUnit
    }));
  });

  it('preserves an edited record name while excluding itself from duplicate validation', () => {
    const fuel = { ...getNewAccountCustomFuel(accountValue), id: 1, value: 'Existing custom fuel' };
    customFuels.set([fuel]);
    fixture = TestBed.createComponent(CustomFuelFormComponent);
    fixture.componentRef.setInput('fuel', fuel);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls['fuelName'].valid).toBe(true);
  });

  it('requires a direct output rate instead of component factors in direct-rate mode', () => {
    fixture = TestBed.createComponent(CustomFuelFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.controls['directEmissionsRate'].setValue(true);
    component.onDirectRateChanged();
    component.form.controls['emissionsOutputRate'].setValue(null);

    expect(component.form.controls['CO2'].hasError('required')).toBe(false);
    expect(component.form.controls['emissionsOutputRate'].hasError('required')).toBe(true);
  });

  it('keeps a failed save open with actionable feedback', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    service.create.mockRejectedValueOnce(new Error('write failed'));
    fixture = TestBed.createComponent(CustomFuelFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.patchValue({
      fuelName: 'Failed custom gas',
      heatCapacityValue: 1,
      siteToSourceMultiplier: 1,
      CO2: 50,
      CH4: 2,
      N2O: 1
    });
    component.recalculateOutputRate();
    component.form.markAsDirty();
    const saved = vi.fn();
    component.saved.subscribe(saved);

    await component.save();

    expect(saved).not.toHaveBeenCalled();
    expect(component.isSaving).toBe(false);
    expect(component.saveError).toContain('could not be saved');
    expect(component.form.dirty).toBe(true);
  });
});
