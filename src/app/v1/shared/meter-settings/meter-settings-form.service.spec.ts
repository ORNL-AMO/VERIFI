import { TestBed } from '@angular/core/testing';
import { FormArray } from '@angular/forms';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AllSources } from '@data/models/constantsAndTypes';
import { EnergyUnitsHelperService } from '@shared/helper-services/energy-units-helper.service';
import { account, facility, meter } from '@app/v1/data/meters/facility-meters.testing';
import { MeterSettingsFormService, MeterSettingsRuleContext } from './meter-settings-form.service';
import { readMeterSettings } from './meter-settings-values';
import { reconcileMeterSettings } from '@app/v1/data/meters/meter-settings-editing';

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

  it('applies source defaults and validators while retaining charges that need explicit remapping', () => {
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
    expect(((form.get('chargesArray') as FormArray).at(0) as any).controls.chargeType.value).toBe('demand');
    expect(form.hasError('incompatibleChargeTypes')).toBe(true);

    form.controls.source.patchValue('Other Fuels');
    form.controls.scope.patchValue(1);
    form.controls.phase.patchValue(undefined);
    form.controls.fuel.patchValue(undefined);
    service.applyMeterSettingsRuleChange('scope', form, context);

    expect(form.controls.phase.hasError('required')).toBe(true);
    expect(form.controls.fuel.hasError('required')).toBe(true);
  });

  it.each([
    { source: 'Electricity' as const, expected: 'consumption' },
    { source: 'Natural Gas' as const, expected: 'usage' },
    { source: 'Other Fuels' as const, expected: 'usage' },
    { source: 'Other Energy' as const, expected: 'usage' },
    { source: 'Water Intake' as const, expected: 'usage' },
    { source: 'Water Discharge' as const, expected: 'usage' },
    { source: 'Other' as const, expected: 'usage' }
  ])('adds a source-compatible default charge for $source', ({ source, expected }) => {
    const form = service.buildMeterSettingsForm(meter({ source, charges: [] }));
    service.addCharge(form);
    expect(form.controls.chargesArray.at(0).controls.chargeType.value).toBe(expected);
    expect(form.hasError('incompatibleChargeTypes')).toBe(false);
  });

  it('retains a local charge after a saved source merge but requires explicit compatible remapping', () => {
    const opened = meter({ source: 'Electricity', charges: [] });
    const baseline = readMeterSettings(opened);
    const local = { ...baseline, chargesArray: [{ guid: 'demand-charge', name: 'Custom demand rider', chargeType: 'demand' as const,
      displayChargeInTable: true, displayUsageInTable: true }] };
    const saved = readMeterSettings(meter({ source: 'Natural Gas', scope: 1, startingUnit: 'SCF', energyUnit: 'MMBtu',
      heatCapacity: .001029, siteToSource: 1, charges: [] }));
    const merged = reconcileMeterSettings(baseline, local, saved);
    expect(merged.conflicts).toEqual([]);
    const form = service.buildMeterSettingsForm(opened);
    const changes = vi.fn(); form.valueChanges.subscribe(changes);
    service.hydrate(form, merged.value);

    expect(form.invalid).toBe(true);
    expect(form.getError('incompatibleChargeTypes')).toHaveProperty('demand-charge');
    expect(form.controls.chargesArray.getRawValue()).toEqual(local.chargesArray);
    expect(form.pristine).toBe(true);
    expect(changes).not.toHaveBeenCalled();
    const charge = form.controls.chargesArray.at(0);
    charge.controls.chargeType.setValue('demandMDQ');
    service.applyMeterSettingsRuleChange('chargeType', form, context);
    expect(form.valid).toBe(true);
    expect(charge.getRawValue()).toMatchObject({ guid: 'demand-charge', name: 'Custom demand rider', chargeType: 'demandMDQ' });
  });

  it('keeps saved unsupported charges intact on hydration and leaves compatible custom charges valid', () => {
    const saved = meter({ source: 'Natural Gas', scope: 1, startingUnit: 'SCF', energyUnit: 'MMBtu', heatCapacity: .001029,
      siteToSource: 1, charges: [{ guid: 'legacy-demand', name: 'Custom saved demand', chargeType: 'demand',
        displayChargeInTable: false, displayUsageInTable: true }] });
    const form = service.buildMeterSettingsForm(saved);
    const initial = form.getRawValue();
    service.hydrate(form, readMeterSettings(saved));
    expect(form.invalid).toBe(true);
    expect(form.getRawValue()).toEqual(initial);
    expect(saved.charges![0].chargeType).toBe('demand');
    form.controls.chargesArray.at(0).controls.chargeType.setValue('other');
    expect(form.valid).toBe(true);
    expect(service.updateMeterFromSettingsForm(saved, form).charges).toEqual([{
      ...saved.charges![0], chargeType: 'other'
    }]);
  });

  it.each(AllSources)('preserves compatible custom other charges for %s', source => {
    const charge = { guid: 'custom-charge', name: 'Custom service rider', chargeType: 'other' as const,
      displayChargeInTable: false, displayUsageInTable: true };
    const saved = meter({ source, charges: [charge] });
    const form = service.buildMeterSettingsForm(saved);
    service.hydrate(form, readMeterSettings(saved));
    expect(form.hasError('incompatibleChargeTypes')).toBe(false);
    expect(form.controls.chargesArray.getRawValue()).toEqual([charge]);
  });

  it('builds, validates, and serializes the calendarization method', () => {
    const form = service.buildMeterSettingsForm(meter({
      meterReadingDataApplication: undefined
    }));

    expect(form.controls.meterReadingDataApplication.hasError('required')).toBe(true);

    form.controls.meterReadingDataApplication.patchValue('fullYear');
    const updated = service.updateMeterFromSettingsForm(structuredClone(meter({
      meterReadingDataApplication: 'backward'
    })), form);

    expect(form.controls.meterReadingDataApplication.hasError('required')).toBe(false);
    expect(updated.meterReadingDataApplication).toBe('fullYear');
  });

  it('retains group ownership on source changes until an explicit reassignment or Ungrouped choice', () => {
    const saved = meter({ groupId: 'energy-group', source: 'Natural Gas', scope: 1 });
    const form = service.buildMeterSettingsForm(saved);
    form.controls.source.setValue('Water Intake');
    service.applyMeterSettingsRuleChange('source', form, context);
    expect(form.controls.groupId.value).toBe('energy-group');
    form.controls.groupId.setValue('water-group');
    expect(service.updateMeterFromSettingsForm(saved, form).groupId).toBe('water-group');
    form.controls.groupId.setValue(null);
    expect(service.updateMeterFromSettingsForm(saved, form).groupId).toBeUndefined();
    expect(saved.groupId).toBe('energy-group');
  });

  it('rejects whitespace-only meter and charge names before a settings command is scheduled', () => {
    const form = service.buildMeterSettingsForm(meter({ name: '   ' }));
    expect(form.controls.name.hasError('pattern')).toBe(true);
    service.addCharge(form);
    form.controls.chargesArray.at(0).controls.name.setValue('   ');
    expect(form.controls.chargesArray.at(0).controls.name.hasError('pattern')).toBe(true);
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
