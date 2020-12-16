import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IdbAccount, IdbFacility } from '../models/idb';
import { EnergyUnitOptions, MassUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from '../shared/unitOptions';

@Injectable({
  providedIn: 'root'
})
export class AccountManagementService {

  constructor(private formBuilder: FormBuilder) { }

  getAccountForm(account: IdbAccount): FormGroup {
    let form: FormGroup = this.formBuilder.group({
      name: [account.name, [Validators.required]],
      industry: [account.industry, [Validators.required]],
      naics: [account.naics, [Validators.required]],
      notes: [account.notes, [Validators.required]],
      unitsOfMeasure: [account.unitsOfMeasure, [Validators.required]],
      energyUnit: [account.energyUnit, [Validators.required]],
      massUnit: [account.massUnit, [Validators.required]],
      volumeLiquidUnit: [account.volumeLiquidUnit, [Validators.required]],
      volumeGasUnit: [account.volumeGasUnit, [Validators.required]],
      chilledWaterUnit: [account.chilledWaterUnit, [Validators.required]],
    });
    return form;

  }

  updateAccountFromForm(form: FormGroup, account: IdbAccount): IdbAccount {
    account.name = form.controls.name.value;
    account.industry = form.controls.industry.value;
    account.naics = form.controls.naics.value;
    account.notes = form.controls.notes.value;
    account.unitsOfMeasure = form.controls.unitsOfMeasure.value;
    account.energyUnit = form.controls.energyUnit.value;
    account.massUnit = form.controls.massUnit.value;
    account.volumeLiquidUnit = form.controls.volumeLiquidUnit.value;
    account.volumeGasUnit = form.controls.volumeGasUnit.value;
    account.chilledWaterUnit = form.controls.chilledWaterUnit.value;
    return account;
  }

  getFacilityForm(facility: IdbFacility): FormGroup {
    let form: FormGroup = this.formBuilder.group({
      name: [facility.name, [Validators.required]],
      country: [facility.country, [Validators.required]],
      state: [facility.state, [Validators.required]],
      address: [facility.address, [Validators.required]],
      type: [facility.type, [Validators.required]],
      tier: [facility.tier, [Validators.required]],
      size: [facility.size, [Validators.required]],
      division: [facility.division, [Validators.required]],
      unitsOfMeasure: [facility.unitsOfMeasure, [Validators.required]],
      energyUnit: [facility.energyUnit, [Validators.required]],
      massUnit: [facility.massUnit, [Validators.required]],
      volumeLiquidUnit: [facility.volumeLiquidUnit, [Validators.required]],
      volumeGasUnit: [facility.volumeGasUnit, [Validators.required]],
      chilledWaterUnit: [facility.chilledWaterUnit, [Validators.required]],
    });
    return form;
  }

  updateFacilityFromForm(form: FormGroup, facility: IdbFacility): IdbFacility {
    facility.name = form.controls.name.value;
    facility.country = form.controls.country.value;
    facility.state = form.controls.state.value;
    facility.address = form.controls.address.value;
    facility.type = form.controls.type.value;
    facility.tier = form.controls.tier.value;
    facility.size = form.controls.size.value;
    facility.division = form.controls.division.value;
    facility.unitsOfMeasure = form.controls.unitsOfMeasure.value;
    facility.energyUnit = form.controls.energyUnit.value;
    facility.massUnit = form.controls.massUnit.value;
    facility.volumeLiquidUnit = form.controls.volumeLiquidUnit.value;
    facility.volumeGasUnit = form.controls.volumeGasUnit.value;
    facility.chilledWaterUnit = form.controls.chilledWaterUnit.value;
    return facility;
  }

  setUnitsOfMeasure(form: FormGroup): FormGroup {
    if (form.controls.unitsOfMeasure.value == 'Imperial') {
      form.controls.energyUnit.setValue('kWh');
      form.controls.volumeLiquidUnit.setValue('ft3');
      form.controls.volumeGasUnit.setValue('SCF');
      form.controls.massUnit.setValue('lb');
    } else if (form.controls.unitsOfMeasure.value == 'Metric') {
      form.controls.energyUnit.setValue('MMBtu');
      form.controls.volumeLiquidUnit.setValue('m3');
      form.controls.volumeGasUnit.setValue('m3');
      form.controls.massUnit.setValue('kg');
    }
    return form;
  }

  checkCustom(form: FormGroup): FormGroup {
    let selectedEnergyOption: UnitOption = EnergyUnitOptions.find(option => { return option.value == form.controls.energyUnit.value });
    let selectedVolumeGasOption: UnitOption = VolumeGasOptions.find(option => { return option.value == form.controls.volumeGasUnit.value });
    let selectedVolumeLiquidOption: UnitOption = VolumeLiquidOptions.find(option => { return option.value == form.controls.volumeLiquidUnit.value });
    // let selectedSizeOption: UnitOption = this.sizeUnitOptions.find(option => { return option.value == form.controls.sizeUnit.value });
    let selectedMassOption: UnitOption = MassUnitOptions.find(option => { return option.value == form.controls.massUnit.value });
    if (selectedEnergyOption && selectedVolumeGasOption && selectedVolumeLiquidOption && selectedMassOption) {
      if (selectedEnergyOption.unitsOfMeasure == 'Metric' && selectedVolumeLiquidOption.unitsOfMeasure == 'Metric' && selectedVolumeGasOption.unitsOfMeasure == 'Metric' && selectedMassOption.unitsOfMeasure == 'Metric') {
        form.controls.unitsOfMeasure.patchValue('Metric');
      } else if (selectedEnergyOption.unitsOfMeasure == 'Imperial' && selectedVolumeLiquidOption.unitsOfMeasure == 'Imperial' && selectedVolumeGasOption.unitsOfMeasure == 'Imperial' && selectedMassOption.unitsOfMeasure == 'Imperial') {
        form.controls.unitsOfMeasure.patchValue('Imperial');
      } else {
        form.controls.unitsOfMeasure.patchValue('Custom');
      }
    }
    return form;
  }

  areAccountAndFacilityUnitsDifferent(account: IdbAccount, facility: IdbFacility): boolean {
    if (account && facility) {
      return (
        account.unitsOfMeasure != facility.unitsOfMeasure ||
        account.massUnit != facility.massUnit ||
        account.energyUnit != facility.energyUnit ||
        account.volumeGasUnit != facility.volumeGasUnit ||
        account.volumeLiquidUnit != facility.volumeLiquidUnit ||
        account.chilledWaterUnit != facility.chilledWaterUnit
      )
    } else {
      return false;
    }
  }

  setAccountUnits(facilityForm: FormGroup, account: IdbAccount): FormGroup {
    facilityForm.controls.energyUnit.patchValue(account.energyUnit);
    facilityForm.controls.volumeLiquidUnit.patchValue(account.volumeLiquidUnit);
    facilityForm.controls.volumeGasUnit.patchValue(account.volumeGasUnit);
    facilityForm.controls.massUnit.patchValue(account.massUnit);
    facilityForm.controls.unitsOfMeasure.patchValue(account.unitsOfMeasure);
    return facilityForm;
  }

}
