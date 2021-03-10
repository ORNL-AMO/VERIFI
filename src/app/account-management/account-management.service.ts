import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IdbAccount, IdbFacility } from '../models/idb';
import { EnergyUnitOptions, MassUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from '../shared/unitOptions';

@Injectable({
  providedIn: 'root'
})
export class AccountManagementService {

  constructor(private formBuilder: FormBuilder) { }

  getGeneralInformationForm(generalInformation: IdbAccount | IdbFacility): FormGroup {
    let form: FormGroup = this.formBuilder.group({
      name: [generalInformation.name, [Validators.required]],
      country: [generalInformation.country],
      city: [generalInformation.city],
      state: [generalInformation.state],
      zip: [generalInformation.zip],
      address: [generalInformation.address],
      naics: [generalInformation.naics],
      size: [generalInformation.size],
      notes: [generalInformation.notes],
    });
    return form;
  }

  updateAccountFromGeneralInformationForm(form: FormGroup, account: IdbAccount): IdbAccount {
    account.name = form.controls.name.value;
    account.country = form.controls.country.value;
    account.city = form.controls.city.value;
    account.state = form.controls.state.value;
    account.zip = form.controls.zip.value;
    account.address = form.controls.address.value;
    account.naics = form.controls.naics.value;
    account.notes = form.controls.notes.value;
    return account;
  }

  updateFacilityFromGeneralInformationForm(form: FormGroup, facility: IdbFacility): IdbFacility {
    facility.name = form.controls.name.value;
    facility.country = form.controls.country.value;
    facility.city = form.controls.city.value;
    facility.state = form.controls.state.value;
    facility.zip = form.controls.zip.value;
    facility.address = form.controls.address.value;
    facility.naics = form.controls.naics.value;
    facility.notes = form.controls.notes.value;
    return facility;
  }

  getAccountForm(account: IdbAccount): FormGroup {
    let form: FormGroup = this.formBuilder.group({
      unitsOfMeasure: [account.unitsOfMeasure, [Validators.required]],
      energyUnit: [account.energyUnit, [Validators.required]],
      massUnit: [account.massUnit, [Validators.required]],
      volumeLiquidUnit: [account.volumeLiquidUnit, [Validators.required]],
      volumeGasUnit: [account.volumeGasUnit, [Validators.required]],
      chilledWaterUnit: [account.chilledWaterUnit, [Validators.required]],
      energyReductionGoal: [account.sustainabilityQuestions ? account.sustainabilityQuestions.energyReductionGoal : null],
      energyReductionPercent: [account.sustainabilityQuestions ? account.sustainabilityQuestions.energyReductionPercent : null],
      energyReductionBaselineYear: [account.sustainabilityQuestions ? account.sustainabilityQuestions.energyReductionBaselineYear : null],
      energyReductionTargetYear: [account.sustainabilityQuestions ? account.sustainabilityQuestions.energyReductionTargetYear : null],
      greenhouseReductionGoal: [account.sustainabilityQuestions ? account.sustainabilityQuestions.greenhouseReductionGoal : null],
      greenhouseReductionPercent: [account.sustainabilityQuestions ? account.sustainabilityQuestions.greenhouseReductionPercent : null],
      greenhouseReductionBaselineYear: [account.sustainabilityQuestions ? account.sustainabilityQuestions.greenhouseReductionBaselineYear : null],
      greenhouseReductionTargetYear: [account.sustainabilityQuestions ? account.sustainabilityQuestions.greenhouseReductionTargetYear : null],
      renewableEnergyGoal: [account.sustainabilityQuestions ? account.sustainabilityQuestions.renewableEnergyGoal : null],
      renewableEnergyPercent: [account.sustainabilityQuestions ? account.sustainabilityQuestions.renewableEnergyPercent : null],
      renewableEnergyBaselineYear: [account.sustainabilityQuestions ? account.sustainabilityQuestions.renewableEnergyBaselineYear : null],
      renewableEnergyTargetYear: [account.sustainabilityQuestions ? account.sustainabilityQuestions.renewableEnergyTargetYear : null],
      wasteReductionGoal: [account.sustainabilityQuestions ? account.sustainabilityQuestions.wasteReductionGoal : null],
      wasteReductionPercent: [account.sustainabilityQuestions ? account.sustainabilityQuestions.wasteReductionPercent : null],
      wasteReductionBaselineYear: [account.sustainabilityQuestions ? account.sustainabilityQuestions.wasteReductionBaselineYear : null],
      wasteReductionTargetYear: [account.sustainabilityQuestions ? account.sustainabilityQuestions.wasteReductionTargetYear : null],
      waterReductionGoal: [account.sustainabilityQuestions ? account.sustainabilityQuestions.waterReductionGoal : null],
      waterReductionPercent: [account.sustainabilityQuestions ? account.sustainabilityQuestions.waterReductionPercent : null],
      waterReductionBaselineYear: [account.sustainabilityQuestions ? account.sustainabilityQuestions.waterReductionBaselineYear : null],
      waterReductionTargetYear: [account.sustainabilityQuestions ? account.sustainabilityQuestions.waterReductionTargetYear : null],
      fiscalYear: [account.fiscalYear],
      fiscalYearMonth: [account.fiscalYearMonth],
      fiscalYearCalendarEnd: [account.fiscalYearCalendarEnd],
    });
    return form;

  }

  updateAccountFromForm(form: FormGroup, account: IdbAccount): IdbAccount {
    account.unitsOfMeasure = form.controls.unitsOfMeasure.value;
    account.energyUnit = form.controls.energyUnit.value;
    account.massUnit = form.controls.massUnit.value;
    account.volumeLiquidUnit = form.controls.volumeLiquidUnit.value;
    account.volumeGasUnit = form.controls.volumeGasUnit.value;
    account.chilledWaterUnit = form.controls.chilledWaterUnit.value;
    account.sustainabilityQuestions.energyReductionGoal = form.controls.energyReductionGoal.value;
    account.sustainabilityQuestions.energyReductionPercent = form.controls.energyReductionPercent.value;
    account.sustainabilityQuestions.energyReductionBaselineYear = form.controls.energyReductionBaselineYear.value;
    account.sustainabilityQuestions.energyReductionTargetYear = form.controls.energyReductionTargetYear.value;
    account.sustainabilityQuestions.greenhouseReductionGoal = form.controls.greenhouseReductionGoal.value;
    account.sustainabilityQuestions.greenhouseReductionPercent = form.controls.greenhouseReductionPercent.value;
    account.sustainabilityQuestions.greenhouseReductionBaselineYear = form.controls.greenhouseReductionBaselineYear.value;
    account.sustainabilityQuestions.greenhouseReductionTargetYear = form.controls.greenhouseReductionTargetYear.value;
    account.sustainabilityQuestions.renewableEnergyGoal = form.controls.renewableEnergyGoal.value;
    account.sustainabilityQuestions.renewableEnergyPercent = form.controls.renewableEnergyPercent.value;
    account.sustainabilityQuestions.renewableEnergyBaselineYear = form.controls.renewableEnergyBaselineYear.value;
    account.sustainabilityQuestions.renewableEnergyTargetYear = form.controls.renewableEnergyTargetYear.value;
    account.sustainabilityQuestions.wasteReductionGoal = form.controls.wasteReductionGoal.value;
    account.sustainabilityQuestions.wasteReductionPercent = form.controls.wasteReductionPercent.value;
    account.sustainabilityQuestions.wasteReductionBaselineYear = form.controls.wasteReductionBaselineYear.value;
    account.sustainabilityQuestions.wasteReductionTargetYear = form.controls.wasteReductionTargetYear.value;
    account.sustainabilityQuestions.waterReductionGoal = form.controls.waterReductionGoal.value;
    account.sustainabilityQuestions.waterReductionPercent = form.controls.waterReductionPercent.value;
    account.sustainabilityQuestions.waterReductionBaselineYear = form.controls.waterReductionBaselineYear.value;
    account.sustainabilityQuestions.waterReductionTargetYear = form.controls.waterReductionTargetYear.value;
    account.fiscalYear = form.controls.fiscalYear.value;
    account.fiscalYearMonth = form.controls.fiscalYearMonth.value;
    account.fiscalYearCalendarEnd = form.controls.fiscalYearCalendarEnd.value;
    return account;
  }

  getFacilityForm(facility: IdbFacility): FormGroup {
    let form: FormGroup = this.formBuilder.group({
      name: [facility.name, [Validators.required]],
      country: [facility.country],
      city: [facility.city],
      state: [facility.state],
      zip: [facility.zip],
      address: [facility.address],
      naics: [facility.naics],
      size: [facility.size],
      notes: [facility.notes],
      unitsOfMeasure: [facility.unitsOfMeasure, [Validators.required]],
      energyUnit: [facility.energyUnit, [Validators.required]],
      massUnit: [facility.massUnit, [Validators.required]],
      volumeLiquidUnit: [facility.volumeLiquidUnit, [Validators.required]],
      volumeGasUnit: [facility.volumeGasUnit, [Validators.required]],
      chilledWaterUnit: [facility.chilledWaterUnit, [Validators.required]],
      energyReductionGoal: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.energyReductionGoal : null],
      energyReductionPercent: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.energyReductionPercent : null],
      energyReductionBaselineYear: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.energyReductionBaselineYear : null],
      energyReductionTargetYear: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.energyReductionTargetYear : null],
      greenhouseReductionGoal: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.greenhouseReductionGoal : null],
      greenhouseReductionPercent: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.greenhouseReductionPercent : null],
      greenhouseReductionBaselineYear: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.greenhouseReductionBaselineYear : null],
      greenhouseReductionTargetYear: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.greenhouseReductionTargetYear : null],
      renewableEnergyGoal: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.renewableEnergyGoal : null],
      renewableEnergyPercent: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.renewableEnergyPercent : null],
      renewableEnergyBaselineYear: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.renewableEnergyBaselineYear : null],
      renewableEnergyTargetYear: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.renewableEnergyTargetYear : null],
      wasteReductionGoal: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.wasteReductionGoal : null],
      wasteReductionPercent: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.wasteReductionPercent : null],
      wasteReductionBaselineYear: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.wasteReductionBaselineYear : null],
      wasteReductionTargetYear: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.wasteReductionTargetYear : null],
      waterReductionGoal: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.waterReductionGoal : null],
      waterReductionPercent: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.waterReductionPercent : null],
      waterReductionBaselineYear: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.waterReductionBaselineYear : null],
      waterReductionTargetYear: [facility.sustainabilityQuestions ? facility.sustainabilityQuestions.waterReductionTargetYear : null],
      fiscalYear: [facility.fiscalYear],
      fiscalYearMonth: [facility.fiscalYearMonth],
      fiscalYearCalendarEnd: [facility.fiscalYearCalendarEnd],
    });
    return form;
  }

  updateFacilityFromForm(form: FormGroup, facility: IdbFacility): IdbFacility {
    facility.name = form.controls.name.value;
    facility.country = form.controls.country.value;
    facility.city = form.controls.city.value;
    facility.state = form.controls.state.value;
    facility.zip = form.controls.zip.value;
    facility.address = form.controls.address.value;
    facility.naics = form.controls.naics.value;
    facility.size = form.controls.size.value;
    facility.notes = form.controls.notes.value;
    facility.unitsOfMeasure = form.controls.unitsOfMeasure.value;
    facility.energyUnit = form.controls.energyUnit.value;
    facility.massUnit = form.controls.massUnit.value;
    facility.volumeLiquidUnit = form.controls.volumeLiquidUnit.value;
    facility.volumeGasUnit = form.controls.volumeGasUnit.value;
    facility.chilledWaterUnit = form.controls.chilledWaterUnit.value;
    facility.sustainabilityQuestions.energyReductionGoal = form.controls.energyReductionGoal.value;
    facility.sustainabilityQuestions.energyReductionPercent = form.controls.energyReductionPercent.value;
    facility.sustainabilityQuestions.energyReductionBaselineYear = form.controls.energyReductionBaselineYear.value;
    facility.sustainabilityQuestions.energyReductionTargetYear = form.controls.energyReductionTargetYear.value;
    facility.sustainabilityQuestions.greenhouseReductionGoal = form.controls.greenhouseReductionGoal.value;
    facility.sustainabilityQuestions.greenhouseReductionPercent = form.controls.greenhouseReductionPercent.value;
    facility.sustainabilityQuestions.greenhouseReductionBaselineYear = form.controls.greenhouseReductionBaselineYear.value;
    facility.sustainabilityQuestions.greenhouseReductionTargetYear = form.controls.greenhouseReductionTargetYear.value;
    facility.sustainabilityQuestions.renewableEnergyGoal = form.controls.renewableEnergyGoal.value;
    facility.sustainabilityQuestions.renewableEnergyPercent = form.controls.renewableEnergyPercent.value;
    facility.sustainabilityQuestions.renewableEnergyBaselineYear = form.controls.renewableEnergyBaselineYear.value;
    facility.sustainabilityQuestions.renewableEnergyTargetYear = form.controls.renewableEnergyTargetYear.value;
    facility.sustainabilityQuestions.wasteReductionGoal = form.controls.wasteReductionGoal.value;
    facility.sustainabilityQuestions.wasteReductionPercent = form.controls.wasteReductionPercent.value;
    facility.sustainabilityQuestions.wasteReductionBaselineYear = form.controls.wasteReductionBaselineYear.value;
    facility.sustainabilityQuestions.wasteReductionTargetYear = form.controls.wasteReductionTargetYear.value;
    facility.sustainabilityQuestions.waterReductionGoal = form.controls.waterReductionGoal.value;
    facility.sustainabilityQuestions.waterReductionPercent = form.controls.waterReductionPercent.value;
    facility.sustainabilityQuestions.waterReductionBaselineYear = form.controls.waterReductionBaselineYear.value;
    facility.sustainabilityQuestions.waterReductionTargetYear = form.controls.waterReductionTargetYear.value;
    facility.fiscalYear = form.controls.fiscalYear.value;
    facility.fiscalYearMonth = form.controls.fiscalYearMonth.value;
    facility.fiscalYearCalendarEnd = form.controls.fiscalYearCalendarEnd.value;
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

  areAccountAndFacilitySustainQuestionsDifferent(account: IdbAccount, facility: IdbFacility): boolean {
    if (account && facility) {
      return (
        account.sustainabilityQuestions.energyReductionGoal != facility.sustainabilityQuestions.energyReductionGoal ||
        account.sustainabilityQuestions.energyReductionPercent != facility.sustainabilityQuestions.energyReductionPercent ||
        account.sustainabilityQuestions.energyReductionBaselineYear != facility.sustainabilityQuestions.energyReductionBaselineYear ||
        account.sustainabilityQuestions.energyReductionTargetYear != facility.sustainabilityQuestions.energyReductionTargetYear ||
        account.sustainabilityQuestions.greenhouseReductionGoal != facility.sustainabilityQuestions.greenhouseReductionGoal ||
        account.sustainabilityQuestions.greenhouseReductionPercent != facility.sustainabilityQuestions.greenhouseReductionPercent ||
        account.sustainabilityQuestions.greenhouseReductionBaselineYear != facility.sustainabilityQuestions.greenhouseReductionBaselineYear ||
        account.sustainabilityQuestions.greenhouseReductionTargetYear != facility.sustainabilityQuestions.greenhouseReductionTargetYear ||
        account.sustainabilityQuestions.renewableEnergyGoal != facility.sustainabilityQuestions.renewableEnergyGoal ||
        account.sustainabilityQuestions.renewableEnergyPercent != facility.sustainabilityQuestions.renewableEnergyPercent ||
        account.sustainabilityQuestions.renewableEnergyBaselineYear != facility.sustainabilityQuestions.renewableEnergyBaselineYear ||
        account.sustainabilityQuestions.renewableEnergyTargetYear != facility.sustainabilityQuestions.renewableEnergyTargetYear ||
        account.sustainabilityQuestions.wasteReductionGoal != facility.sustainabilityQuestions.wasteReductionGoal ||
        account.sustainabilityQuestions.wasteReductionPercent != facility.sustainabilityQuestions.wasteReductionPercent ||
        account.sustainabilityQuestions.wasteReductionBaselineYear != facility.sustainabilityQuestions.wasteReductionBaselineYear ||
        account.sustainabilityQuestions.wasteReductionTargetYear != facility.sustainabilityQuestions.wasteReductionTargetYear ||
        account.sustainabilityQuestions.waterReductionGoal != facility.sustainabilityQuestions.waterReductionGoal ||
        account.sustainabilityQuestions.waterReductionPercent != facility.sustainabilityQuestions.waterReductionPercent ||
        account.sustainabilityQuestions.waterReductionBaselineYear != facility.sustainabilityQuestions.waterReductionBaselineYear ||
        account.sustainabilityQuestions.waterReductionTargetYear != facility.sustainabilityQuestions.waterReductionTargetYear
      )
    } else {
      return false;
    }
  }

  setAccountSustainQuestions(facilityForm: FormGroup, account: IdbAccount): FormGroup {
    facilityForm.controls.energyReductionGoal.patchValue(account.sustainabilityQuestions.energyReductionGoal);
    facilityForm.controls.energyReductionPercent.patchValue(account.sustainabilityQuestions.energyReductionPercent);
    facilityForm.controls.energyReductionBaselineYear.patchValue(account.sustainabilityQuestions.energyReductionBaselineYear);
    facilityForm.controls.energyReductionTargetYear.patchValue(account.sustainabilityQuestions.energyReductionTargetYear);
    facilityForm.controls.greenhouseReductionGoal.patchValue(account.sustainabilityQuestions.greenhouseReductionGoal);
    facilityForm.controls.greenhouseReductionPercent.patchValue(account.sustainabilityQuestions.greenhouseReductionPercent);
    facilityForm.controls.greenhouseReductionBaselineYear.patchValue(account.sustainabilityQuestions.greenhouseReductionBaselineYear);
    facilityForm.controls.greenhouseReductionTargetYear.patchValue(account.sustainabilityQuestions.greenhouseReductionTargetYear);
    facilityForm.controls.renewableEnergyGoal.patchValue(account.sustainabilityQuestions.renewableEnergyGoal);
    facilityForm.controls.renewableEnergyPercent.patchValue(account.sustainabilityQuestions.renewableEnergyPercent);
    facilityForm.controls.renewableEnergyBaselineYear.patchValue(account.sustainabilityQuestions.renewableEnergyBaselineYear);
    facilityForm.controls.renewableEnergyTargetYear.patchValue(account.sustainabilityQuestions.renewableEnergyTargetYear);
    facilityForm.controls.wasteReductionGoal.patchValue(account.sustainabilityQuestions.wasteReductionGoal);
    facilityForm.controls.wasteReductionPercent.patchValue(account.sustainabilityQuestions.wasteReductionPercent);
    facilityForm.controls.wasteReductionBaselineYear.patchValue(account.sustainabilityQuestions.wasteReductionBaselineYear);
    facilityForm.controls.wasteReductionTargetYear.patchValue(account.sustainabilityQuestions.wasteReductionTargetYear);
    facilityForm.controls.waterReductionGoal.patchValue(account.sustainabilityQuestions.waterReductionGoal);
    facilityForm.controls.waterReductionPercent.patchValue(account.sustainabilityQuestions.waterReductionPercent);
    facilityForm.controls.waterReductionBaselineYear.patchValue(account.sustainabilityQuestions.waterReductionBaselineYear);
    facilityForm.controls.waterReductionTargetYear.patchValue(account.sustainabilityQuestions.waterReductionTargetYear);
    return facilityForm;
  }

  areAccountAndFacilityFinancialReportingDifferent(account: IdbAccount, facility: IdbFacility): boolean {
    if (account && facility) {
      return (
        account.fiscalYear != facility.fiscalYear ||
        account.fiscalYearMonth != facility.fiscalYearMonth ||
        account.fiscalYearCalendarEnd != facility.fiscalYearCalendarEnd
      )
    } else {
      return false;
    }
  }

  setAccountFinancialReporting(facilityForm: FormGroup, account: IdbAccount): FormGroup {
    facilityForm.controls.fiscalYear.patchValue(account.fiscalYear);
    facilityForm.controls.fiscalYearMonth.patchValue(account.fiscalYearMonth);
    facilityForm.controls.fiscalYearCalendarEnd.patchValue(account.fiscalYearCalendarEnd);
    return facilityForm;
  }


}
