import { TestBed } from '@angular/core/testing';
import { FormArray } from '@angular/forms';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { EnergyUnitsHelperService } from '@shared/helper-services/energy-units-helper.service';
import { account, facility, meter } from '../../facility-meters.testing';
import { MeterSettingsFormService, MeterSettingsRuleContext } from './meter-settings-form.service';

describe('MeterSettingsFormService', () => {
  let service: MeterSettingsFormService;
  let context: MeterSettingsRuleContext;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MeterSettingsFormService,
        EnergyUnitsHelperService,
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account: () => account(),
            facilities: () => [facility()],
            selectedFacility: () => facility()
          }
        }
      ]
    });
    service = TestBed.inject(MeterSettingsFormService);
    context = {
      account: account({ assessmentReportVersion: 'AR6' }),
      facility: facility({
        energyUnit: 'MMBtu',
        electricityUnit: 'kWh',
        volumeGasUnit: 'CCF',
        volumeLiquidUnit: 'gal',
        massUnit: 'lb'
      }),
      customFuels: [],
      customGWPs: [],
      meterDataExists: false
    };
  });

  it('applies source defaults, validators, and charge filtering', () => {
    const form = service.buildMeterSettingsForm(meter({
      source: 'Electricity',
      scope: 3,
      startingUnit: 'kWh',
      energyUnit: 'kWh',
      charges: [{
        guid: 'charge-a',
        name: 'Demand',
        chargeType: 'demand',
        displayChargeInTable: true,
        displayUsageInTable: true
      }]
    }));

    form.controls.source.patchValue('Natural Gas');
    service.applyMeterSettingsRuleChange('source', form, context);

    expect(form.controls.scope.value).toBe(1);
    expect(form.controls.energyUnit.value).toBe('MMBtu');
    expect(form.controls.startingUnit.value).toBe('CCF');
    expect(((form.get('chargesArray') as FormArray).at(0) as any).controls.chargeType.value).toBeNull();

    form.controls.source.patchValue('Other Fuels');
    form.controls.scope.patchValue(1);
    form.controls.phase.patchValue(undefined);
    form.controls.fuel.patchValue(undefined);
    service.applyMeterSettingsRuleChange('scope', form, context);

    expect(form.controls.phase.hasError('required')).toBe(true);
    expect(form.controls.fuel.hasError('required')).toBe(true);
  });

  it('applies electricity agreement side effects and serializes multipliers and green purchase fraction', () => {
    const form = service.buildMeterSettingsForm(meter({
      source: 'Electricity',
      agreementType: 1,
      includeInEnergy: true,
      retainRECs: false,
      directConnection: false,
      greenPurchaseFraction: 0.5
    }));

    form.controls.agreementType.patchValue(5);
    form.controls.greenPurchaseFraction.patchValue(25);
    service.applyMeterSettingsRuleChange('agreementType', form, context);

    const updated = service.updateMeterFromSettingsForm(structuredClone(meter({
      source: 'Electricity'
    })), form);

    expect(form.controls.includeInEnergy.value).toBe(true);
    expect(form.controls.retainRECs.value).toBe(true);
    expect(form.controls.directConnection.value).toBe(false);
    expect(updated.greenPurchaseFraction).toBe(0.25);
    expect(updated.recsMultiplier).toBe(0.25);
    expect(updated.marketGHGMultiplier).toBe(0.75);
  });

  it('preserves charge serialization and non-electric multiplier reset', () => {
    const form = service.buildMeterSettingsForm(meter({ source: 'Natural Gas', scope: 1 }));
    service.addCharge(form);
    const chargeGroup = (form.get('chargesArray') as FormArray).at(0);
    chargeGroup.get('name')?.patchValue('Usage');
    chargeGroup.get('chargeType')?.patchValue('usage');

    const updated = service.updateMeterFromSettingsForm(structuredClone(meter({
      source: 'Natural Gas',
      locationGHGMultiplier: 0,
      marketGHGMultiplier: 0,
      recsMultiplier: 1
    })), form);

    expect(updated.charges).toEqual([expect.objectContaining({
      name: 'Usage',
      chargeType: 'usage',
      displayChargeInTable: true,
      displayUsageInTable: true
    })]);
    expect(updated.locationGHGMultiplier).toBe(1);
    expect(updated.marketGHGMultiplier).toBe(1);
    expect(updated.recsMultiplier).toBe(0);
  });

  it('derives vehicle options and required fields for mobile meters', () => {
    const form = service.buildMeterSettingsForm(meter({
      source: 'Other Fuels',
      scope: 2,
      vehicleCategory: 2,
      vehicleType: undefined,
      vehicleFuel: undefined
    }));

    service.applyMeterSettingsRuleChange('vehicleCategory', form, context);
    const viewModel = service.buildMeterSettingsViewModel(form, context);

    expect(viewModel.displayVehicle).toBe(true);
    expect(viewModel.vehicleTypes.length).toBeGreaterThan(0);
    expect(form.controls.vehicleCategory.hasError('required')).toBe(false);
    expect(form.controls.vehicleCollectionUnit.hasError('required')).toBe(false);
    expect(form.controls.vehicleFuel.value).toBeTruthy();
  });
});
