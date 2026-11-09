import { CommonModule } from '@angular/common';
import { NgModule, NO_ERRORS_SCHEMA, Pipe, PipeTransform, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { defer, of } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CustomDataCommandHandler } from '@data/account-workspace/handlers/custom-data-command-handler.service';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IdbAccount, getNewIdbAccount } from '@data/models/idbModels/account';
import { IdbCustomFuel, getNewAccountCustomFuel } from '@data/models/idbModels/customFuel';
import { FuelTypeOption } from '@shared/fuel-options/fuelTypeOption';
import { StationaryGasOptions } from '@shared/fuel-options/stationaryGasOptions';
import { CustomFuelDataDashboardComponent } from './custom-fuel-data-dashboard/custom-fuel-data-dashboard.component';
import { CustomFuelDataFormComponent } from './custom-fuel-data-form/custom-fuel-data-form.component';
import { ExistingFuelsModalComponent } from './custom-fuel-data-form/existing-fuels-modal/existing-fuels-modal.component';

@Pipe({ name: 'settingsLabel', standalone: false })
export class SettingsLabelPipeStub implements PipeTransform {
  transform(value: unknown): unknown {
    return value;
  }
}

@Pipe({ name: 'emissionsDisplay', standalone: false })
export class EmissionsDisplayPipeStub implements PipeTransform {
  transform(value: FuelTypeOption, _energyUnit: string, property: string): unknown {
    return property === 'HHV' ? value.heatCapacityValue : value[property as keyof FuelTypeOption];
  }
}

@Pipe({ name: 'orderBy', standalone: false })
export class OrderByPipeStub implements PipeTransform {
  transform<T>(value: Array<T>, _property: string): Array<T> {
    return value;
  }
}

@NgModule({
  declarations: [
    CustomFuelDataDashboardComponent,
    CustomFuelDataFormComponent,
    ExistingFuelsModalComponent,
    SettingsLabelPipeStub,
    EmissionsDisplayPipeStub,
    OrderByPipeStub
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  schemas: [NO_ERRORS_SCHEMA]
})
class CustomFuelEmissionsDisplayTestModule { }

describe('custom fuel emissions display', () => {
  const account = signal<IdbAccount>(buildAccount(false));
  const customFuels = signal<Array<IdbCustomFuel>>([]);
  let routeParamValue: Record<string, string> = {};
  const router = {
    url: '/custom-data/fuels/add',
    navigate: vi.fn().mockResolvedValue(true)
  };
  const customDataHandler = {
    addCustomFuel: vi.fn(async (fuel: IdbCustomFuel) => fuel),
    updateCustomFuel: vi.fn(async (fuel: IdbCustomFuel) => fuel),
    deleteCustomFuel: vi.fn()
  };

  beforeEach(() => {
    account.set(buildAccount(false));
    customFuels.set([]);
    routeParamValue = {};
    router.url = '/custom-data/fuels/add';
    router.navigate.mockClear();
    customDataHandler.addCustomFuel.mockClear();
    customDataHandler.updateCustomFuel.mockClear();

    TestBed.configureTestingModule({
      imports: [CustomFuelEmissionsDisplayTestModule],
      providers: [
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account,
            customFuels,
            meters: () => []
          }
        },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { params: defer(() => of(routeParamValue)) } },
        {
          provide: WorkspaceCommandBoundary,
          useValue: {
            execute: vi.fn(async (_metadata: unknown, operation: () => Promise<unknown>) => operation())
          }
        },
        { provide: CustomDataCommandHandler, useValue: customDataHandler },
        { provide: MeterCommandHandler, useValue: { updateMeter: vi.fn() } }
      ]
    });
  });

  it('hides emissions fields and keeps required non-emissions fields as the save gate', () => {
    const fixture = createFormFixture();
    const component = fixture.componentInstance;

    expect(formText(fixture)).not.toContain('CO2 Factor');
    expect(formText(fixture)).not.toContain('CH4 Factor');
    expect(formText(fixture)).not.toContain('N2O Factor');
    expect(formText(fixture)).not.toContain('Emissions Output Rate');
    expect(component.form.value).toMatchObject({ CO2: 0, CH4: 0, N2O: 0 });
    expect(component.form.controls.emissionsOutputRate.value).toBe(0);
    expect(saveButton(fixture).disabled).toBe(true);

    component.form.patchValue({
      fuelName: 'Zero Emissions Fuel',
      heatCapacityValue: 1,
      siteToSourceMultiplier: 1,
      isBiofuel: true
    });
    fixture.detectChanges();

    expect(saveButton(fixture).disabled).toBe(false);
  });

  it('saves zero emissions values for a new fuel when emissions are hidden', async () => {
    const fixture = createFormFixture();
    const component = fixture.componentInstance;
    component.form.patchValue({
      fuelName: 'Zero Emissions Fuel',
      heatCapacityValue: 1,
      siteToSourceMultiplier: 1,
      isBiofuel: true
    });

    await component.save();

    expect(customDataHandler.addCustomFuel).toHaveBeenCalledWith(
      expect.objectContaining({
        CO2: 0,
        CH4: 0,
        N2O: 0,
        emissionsOutputRate: 0
      }),
      'account-a'
    );
  });

  it('preserves stored emissions values when an existing fuel is edited with emissions hidden', async () => {
    const existingFuel = buildCustomFuel(account(), {
      CO2: 10,
      CH4: 20,
      N2O: 30,
      emissionsOutputRate: 40,
      directEmissionsRate: true
    });
    customFuels.set([existingFuel]);
    routeParamValue = { id: existingFuel.guid };
    router.url = `/custom-data/fuels/edit/${existingFuel.guid}`;
    const fixture = createFormFixture();
    const component = fixture.componentInstance;

    expect(component.form.value).toMatchObject({
      CO2: 0,
      CH4: 0,
      N2O: 0,
      emissionsOutputRate: 0
    });
    component.form.controls.fuelName.patchValue('Edited Fuel');
    await component.save();

    expect(customDataHandler.updateCustomFuel).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 'Edited Fuel',
        CO2: 10,
        CH4: 20,
        N2O: 30,
        emissionsOutputRate: 40,
        directEmissionsRate: true
      }),
      'account-a'
    );
  });

  it('does not copy predefined emissions values into a hidden-emissions form', () => {
    const fixture = createFormFixture();
    const component = fixture.componentInstance;
    const option = StationaryGasOptions[0];

    component.hideFuelModal({ phase: 'Gas', option });

    expect(component.form.controls.fuelName.value).toBe(`${option.value} (Modified)`);
    expect(component.form.value).toMatchObject({ CO2: 0, CH4: 0, N2O: 0 });
    expect(component.form.controls.emissionsOutputRate.value).toBe(0);
  });

  it('retains the existing emissions form when emissions are enabled', () => {
    account.set(buildAccount(true));
    const fixture = createFormFixture();

    expect(formText(fixture)).toContain('CO2 Factor');
    expect(formText(fixture)).toContain('CH4 Factor');
    expect(formText(fixture)).toContain('N2O Factor');
    expect(formText(fixture)).toContain('Emissions Output Rate');
    expect(formText(fixture)).toContain('AR5 GWP factors');
  });

  it.each([
    { displayEmissions: false, expected: false },
    { displayEmissions: true, expected: true }
  ])('renders dashboard emissions rows according to the account setting', async ({ displayEmissions, expected }) => {
    account.set(buildAccount(displayEmissions));
    customFuels.set([buildCustomFuel(account())]);
    const fixture = TestBed.createComponent(CustomFuelDataDashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.includes('CO2 Factor')).toBe(expected);
    expect(fixture.nativeElement.textContent.includes('Emissions Output Rate')).toBe(expected);
  });

  it.each([
    { displayEmissions: false, expected: false },
    { displayEmissions: true, expected: true }
  ])('renders predefined-fuel emissions columns according to the account setting', ({ displayEmissions, expected }) => {
    vi.useFakeTimers();
    account.set(buildAccount(displayEmissions));
    const fixture = TestBed.createComponent(ExistingFuelsModalComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.includes('CO2 Factor')).toBe(expected);
    expect(fixture.nativeElement.textContent.includes('Emissions Output Rate')).toBe(expected);

    fixture.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  function createFormFixture(): ComponentFixture<CustomFuelDataFormComponent> {
    const fixture = TestBed.createComponent(CustomFuelDataFormComponent);
    fixture.detectChanges();
    return fixture;
  }
});

function buildAccount(displayEmissions: boolean): IdbAccount {
  return {
    ...getNewIdbAccount(),
    guid: 'account-a',
    displayEmissions,
    energyUnit: 'MMBtu',
    volumeGasUnit: 'SCF',
    volumeLiquidUnit: 'gal',
    massUnit: 'lb'
  };
}

function buildCustomFuel(account: IdbAccount, overrides: Partial<IdbCustomFuel> = {}): IdbCustomFuel {
  return {
    ...getNewAccountCustomFuel(account),
    guid: 'fuel-a',
    value: 'Existing Fuel',
    startingUnit: 'SCF',
    heatCapacityValue: 1,
    siteToSourceMultiplier: 1,
    CO2: 1,
    CH4: 2,
    N2O: 3,
    emissionsOutputRate: 4,
    isBiofuel: true,
    ...overrides
  };
}

function formText(fixture: ComponentFixture<CustomFuelDataFormComponent>): string {
  return fixture.nativeElement.textContent ?? '';
}

function saveButton(fixture: ComponentFixture<CustomFuelDataFormComponent>): HTMLButtonElement {
  const element = fixture.nativeElement as HTMLElement;
  return Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
    .find(button => button.textContent?.includes('Save')) as HTMLButtonElement;
}
