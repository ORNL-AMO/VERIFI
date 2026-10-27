import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule, Pipe, PipeTransform, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { MeterSource } from '@data/models/constantsAndTypes';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { UtilityMeterDataService } from './utility-meter-data.service';
import { EditUtilityBillComponent } from './edit-bill/edit-utility-bill/edit-utility-bill.component';
import { EditVehicleMeterBillComponent } from './edit-bill/edit-vehicle-meter-bill/edit-vehicle-meter-bill.component';
import { EditOtherEmissionsBillComponent } from './edit-bill/edit-other-emissions-bill/edit-other-emissions-bill.component';

@Pipe({ name: 'settingsLabel', standalone: false })
export class SettingsLabelStub implements PipeTransform {
  transform(value: string): string { return value; }
}

@NgModule({
  declarations: [EditUtilityBillComponent, EditVehicleMeterBillComponent, EditOtherEmissionsBillComponent, SettingsLabelStub],
  imports: [CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
class ReadingInputsTestModule { }

describe('UtilityMeterDataService consumption validation', () => {
  let service: UtilityMeterDataService;
  const meter = {
    guid: 'meter-a', source: 'Other Energy', startingUnit: 'klb', energyUnit: 'MMBtu',
    heatCapacity: 2, scope: 3, vehicleCollectionType: 1, vehicleCategory: 1
  } as IdbUtilityMeter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReadingInputsTestModule],
      providers: [
        UtilityMeterDataService,
        { provide: AccountWorkspaceStore, useValue: {
          account: signal({ displayEmissions: false }), selectedFacility: signal(null),
          meterData: signal([]), customFuels: signal([])
        } },
        { provide: AccountWorkspaceQueryService, useValue: { getMeterData: () => [] } },
        { provide: EGridService, useValue: {} }
      ]
    });
    service = TestBed.inject(UtilityMeterDataService);
  });

  function reading() {
    return { ...getNewIdbUtilityMeterData(meter, []), day: 15, month: 1, year: 2025,
      totalVolume: -10, totalEnergyUse: -20, heatCapacity: 2, vehicleFuelEfficiency: 3 };
  }

  const sources: MeterSource[] = ['Natural Gas', 'Other Fuels', 'Other Energy', 'Water Intake', 'Water Discharge', 'Other'];
  it.each(sources)('honors the negative-consumption setting for %s', source => {
    for (const enabled of [true, false, undefined]) {
      const form = service.getGeneralMeterDataForm(reading(), true, false, false, false, source, enabled);
      expect(form.valid).toBe(enabled === true);
      form.controls.totalVolume.setValue(null);
      expect(form.controls.totalVolume.hasError('required')).toBe(true);
      for (const value of [0, 10]) {
        form.controls.totalVolume.setValue(value);
        expect(form.valid).toBe(true);
      }
    }
  });

  it('defaults to nonnegative consumption and leaves hidden consumption optional', () => {
    expect(service.getGeneralMeterDataForm(reading(), true, false, false, false, meter.source).invalid).toBe(true);
    expect(service.getGeneralMeterDataForm(reading(), false, false, false, false, meter.source).valid).toBe(true);
  });

  it.each(['Natural Gas', 'Other Fuels', 'Other Energy'] as MeterSource[])('preserves direct-energy behavior for %s', source => {
    for (const enabled of [true, false]) {
      const form = service.getGeneralMeterDataForm(reading(), false, true, false, false, source, enabled);
      expect(form.valid).toBe(true);
      form.controls.totalEnergyUse.setValue(null);
      expect(form.controls.totalEnergyUse.hasError('required')).toBe(true);
    }
    expect(service.getElectricityMeterDataForm(reading()).valid).toBe(true);
  });

  it('retains minimum validation for editable heat capacity and fuel efficiency', () => {
    const form = service.getGeneralMeterDataForm(reading(), true, true, true, true, meter.source, true);
    for (const name of ['heatCapacity', 'vehicleFuelEfficiency']) {
      form.controls[name].enable();
      form.controls[name].setValue(-1);
      expect(form.controls[name].hasError('min')).toBe(true);
      form.controls[name].setValue(null);
      expect(form.controls[name].hasError('required')).toBe(true);
    }
  });

  for (const componentType of [EditUtilityBillComponent, EditVehicleMeterBillComponent, EditOtherEmissionsBillComponent]) {
    it(`renders the consumption minimum correctly in ${componentType.name}`, () => {
      const fixture = TestBed.createComponent<EditUtilityBillComponent | EditVehicleMeterBillComponent | EditOtherEmissionsBillComponent>(componentType);
      const component = fixture.componentInstance;
      // Emissions are independent of input validation and have separate calculation coverage.
      vi.spyOn(component, 'setTotalEmissions').mockImplementation(() => {});
      const editMeter = { ...meter, canBeNegative: true };
      const form = service.getGeneralMeterDataForm(reading(), true, true, true, false, meter.source, true);
      fixture.componentRef.setInput('editMeter', editMeter);
      fixture.componentRef.setInput('editMeterData', reading());
      fixture.componentRef.setInput('addOrEdit', 'add');
      fixture.componentRef.setInput('meterDataForm', form);
      if (component instanceof EditUtilityBillComponent) {
        fixture.componentRef.setInput('displayVolumeInput', true);
        fixture.componentRef.setInput('displayEnergyUse', true);
        fixture.componentRef.setInput('displayHeatCapacity', true);
      }
      fixture.detectChanges();
      const input: HTMLInputElement = fixture.nativeElement.querySelector('#totalVolume');
      expect(input.hasAttribute('min')).toBe(false);
      input.value = '-5';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(form.valid).toBe(true);
      expect(form.controls.totalEnergyUse.value).toBe(-10);

      fixture.componentRef.setInput('editMeter', { ...editMeter, canBeNegative: false });
      fixture.detectChanges();
      expect(input.min).toBe('0');
      expect(form.controls.totalVolume.hasError('min')).toBe(true);
      input.value = '0';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(form.valid).toBe(true);
      expect(fixture.nativeElement.querySelector('.alert-warning')).not.toBeNull();
    });
  }
});
