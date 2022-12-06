import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { EnergyUnitOptions, MassUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from '../unitOptions';

@Injectable({
  providedIn: 'root'
})
export class SettingsFormsService {
  constructor(private formBuilder: FormBuilder) { }

  //GENERAL INFORMATION
  getGeneralInformationForm(generalInformation: IdbAccount | IdbFacility): FormGroup {
    let form: FormGroup = this.formBuilder.group({
      name: [generalInformation.name, [Validators.required]],
      country: [generalInformation.country],
      city: [generalInformation.city],
      state: [generalInformation.state],
      zip: [generalInformation.zip],
      address: [generalInformation.address],
      naics1: [generalInformation.naics1],
      naics2: [generalInformation.naics2],
      naics3: [generalInformation.naics3],
      size: [generalInformation.size],
      notes: [generalInformation.notes],
      color: [generalInformation.color],
      contactName: [generalInformation.contactName],
      contactEmail: [generalInformation.contactEmail],
      contactPhone: [generalInformation.contactPhone]

    });
    return form;
  }

  updateAccountFromGeneralInformationForm(form: FormGroup, account: IdbAccount): IdbAccount {
    account.name = form.controls.name.value;
    // if (!account.name) {
    //   account.name = 'Account: ' + account.id;
    // }
    account.country = form.controls.country.value;
    account.city = form.controls.city.value;
    account.state = form.controls.state.value;
    account.zip = form.controls.zip.value;
    account.address = form.controls.address.value;
    account.naics1 = form.controls.naics1.value;
    account.naics2 = form.controls.naics2.value;
    account.naics3 = form.controls.naics3.value;
    account.notes = form.controls.notes.value;
    account.color = form.controls.color.value;
    account.contactName = form.controls.contactName.value;
    account.contactEmail = form.controls.contactEmail.value;
    account.contactPhone = form.controls.contactPhone.value;
    return account;
  }

  updateFacilityFromGeneralInformationForm(form: FormGroup, facility: IdbFacility): IdbFacility {
    facility.name = form.controls.name.value;
    // if (!facility.name) {
    //   facility.name = 'Facility: ' + facility.id;
    // }
    facility.country = form.controls.country.value;
    facility.city = form.controls.city.value;
    facility.state = form.controls.state.value;
    facility.zip = form.controls.zip.value;
    facility.address = form.controls.address.value;
    facility.naics1 = form.controls.naics1.value;
    facility.naics2 = form.controls.naics2.value;
    facility.naics3 = form.controls.naics3.value;
    facility.notes = form.controls.notes.value;
    facility.color = form.controls.color.value;
    facility.contactName = form.controls.contactName.value;
    facility.contactEmail = form.controls.contactEmail.value;
    facility.contactPhone = form.controls.contactPhone.value;
    return facility;
  }

  //UNITS
  getUnitsForm(units: IdbAccount | IdbFacility): FormGroup {
    let form: FormGroup = this.formBuilder.group({
      unitsOfMeasure: [units.unitsOfMeasure, [Validators.required]],
      energyUnit: [units.energyUnit, [Validators.required]],
      massUnit: [units.massUnit, [Validators.required]],
      volumeLiquidUnit: [units.volumeLiquidUnit, [Validators.required]],
      volumeGasUnit: [units.volumeGasUnit, [Validators.required]],
      energyIsSource: [units.energyIsSource],
      eGridSubregion: [units.eGridSubregion],
      electricityUnit: [units.electricityUnit]
    });
    return form;
  }

  updateAccountFromUnitsForm(form: FormGroup, account: IdbAccount): IdbAccount {
    account.unitsOfMeasure = form.controls.unitsOfMeasure.value;
    account.energyUnit = form.controls.energyUnit.value;
    account.massUnit = form.controls.massUnit.value;
    account.volumeLiquidUnit = form.controls.volumeLiquidUnit.value;
    account.volumeGasUnit = form.controls.volumeGasUnit.value;
    account.energyIsSource = form.controls.energyIsSource.value;
    account.eGridSubregion = form.controls.eGridSubregion.value;
    account.electricityUnit = form.controls.electricityUnit.value;
    return account;
  }

  updateFacilityFromUnitsForm(form: FormGroup, facility: IdbFacility): IdbFacility {
    facility.unitsOfMeasure = form.controls.unitsOfMeasure.value;
    facility.energyUnit = form.controls.energyUnit.value;
    facility.massUnit = form.controls.massUnit.value;
    facility.volumeLiquidUnit = form.controls.volumeLiquidUnit.value;
    facility.volumeGasUnit = form.controls.volumeGasUnit.value;
    facility.energyIsSource = form.controls.energyIsSource.value;
    facility.eGridSubregion = form.controls.eGridSubregion.value;
    facility.electricityUnit = form.controls.electricityUnit.value;
    return facility;
  }


  //FISCAL YEAR
  getFiscalYearForm(fiscalYearData: IdbAccount | IdbFacility): FormGroup {
    let form: FormGroup = this.formBuilder.group({
      fiscalYear: [fiscalYearData.fiscalYear],
      fiscalYearMonth: [fiscalYearData.fiscalYearMonth],
      fiscalYearCalendarEnd: [fiscalYearData.fiscalYearCalendarEnd],
    });
    return form;
  }

  updateAccountFromFiscalForm(form: FormGroup, account: IdbAccount): IdbAccount {
    account.fiscalYear = form.controls.fiscalYear.value;
    account.fiscalYearMonth = form.controls.fiscalYearMonth.value;
    account.fiscalYearCalendarEnd = form.controls.fiscalYearCalendarEnd.value;
    return account;
  }

  updateFacilityFromFiscalForm(form: FormGroup, facility: IdbFacility): IdbFacility {
    facility.fiscalYear = form.controls.fiscalYear.value;
    facility.fiscalYearMonth = form.controls.fiscalYearMonth.value;
    facility.fiscalYearCalendarEnd = form.controls.fiscalYearCalendarEnd.value;
    return facility;
  }


  //SUSTAINABILITY QUESTIONS
  getSustainabilityQuestionsForm(questionsData: IdbAccount | IdbFacility): FormGroup {
    let form: FormGroup = this.formBuilder.group({
      energyReductionGoal: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.energyReductionGoal : null],
      energyReductionPercent: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.energyReductionPercent : null],
      energyReductionBaselineYear: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.energyReductionBaselineYear : null],
      energyReductionTargetYear: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.energyReductionTargetYear : null],
      energyIsAbsolute: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.energyIsAbsolute : null],
      greenhouseReductionGoal: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.greenhouseReductionGoal : null],
      greenhouseReductionPercent: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.greenhouseReductionPercent : null],
      greenhouseReductionBaselineYear: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.greenhouseReductionBaselineYear : null],
      greenhouseReductionTargetYear: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.greenhouseReductionTargetYear : null],
      greenhouseIsAbsolute: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.greenhouseIsAbsolute : null],
      renewableEnergyGoal: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.renewableEnergyGoal : null],
      renewableEnergyPercent: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.renewableEnergyPercent : null],
      renewableEnergyBaselineYear: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.renewableEnergyBaselineYear : null],
      renewableEnergyTargetYear: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.renewableEnergyTargetYear : null],
      wasteReductionGoal: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.wasteReductionGoal : null],
      wasteReductionPercent: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.wasteReductionPercent : null],
      wasteReductionBaselineYear: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.wasteReductionBaselineYear : null],
      wasteReductionTargetYear: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.wasteReductionTargetYear : null],
      wasteIsAbsolute: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.wasteIsAbsolute : null],
      waterReductionGoal: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.waterReductionGoal : null],
      waterReductionPercent: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.waterReductionPercent : null],
      waterReductionBaselineYear: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.waterReductionBaselineYear : null],
      waterReductionTargetYear: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.waterReductionTargetYear : null],
      waterIsAbsolute: [questionsData.sustainabilityQuestions ? questionsData.sustainabilityQuestions.waterIsAbsolute : null],
    });
    return form;

  }

  updateAccountFromSustainabilityQuestionsForm(form: FormGroup, account: IdbAccount): IdbAccount {
    account.sustainabilityQuestions.energyReductionGoal = form.controls.energyReductionGoal.value;
    account.sustainabilityQuestions.energyReductionPercent = form.controls.energyReductionPercent.value;
    account.sustainabilityQuestions.energyReductionBaselineYear = form.controls.energyReductionBaselineYear.value;
    account.sustainabilityQuestions.energyReductionTargetYear = form.controls.energyReductionTargetYear.value;
    account.sustainabilityQuestions.energyIsAbsolute = form.controls.energyIsAbsolute.value;
    account.sustainabilityQuestions.greenhouseReductionGoal = form.controls.greenhouseReductionGoal.value;
    account.sustainabilityQuestions.greenhouseReductionPercent = form.controls.greenhouseReductionPercent.value;
    account.sustainabilityQuestions.greenhouseReductionBaselineYear = form.controls.greenhouseReductionBaselineYear.value;
    account.sustainabilityQuestions.greenhouseReductionTargetYear = form.controls.greenhouseReductionTargetYear.value;
    account.sustainabilityQuestions.greenhouseIsAbsolute = form.controls.greenhouseIsAbsolute.value;
    account.sustainabilityQuestions.renewableEnergyGoal = form.controls.renewableEnergyGoal.value;
    account.sustainabilityQuestions.renewableEnergyPercent = form.controls.renewableEnergyPercent.value;
    account.sustainabilityQuestions.renewableEnergyBaselineYear = form.controls.renewableEnergyBaselineYear.value;
    account.sustainabilityQuestions.renewableEnergyTargetYear = form.controls.renewableEnergyTargetYear.value;
    account.sustainabilityQuestions.wasteReductionGoal = form.controls.wasteReductionGoal.value;
    account.sustainabilityQuestions.wasteReductionPercent = form.controls.wasteReductionPercent.value;
    account.sustainabilityQuestions.wasteReductionBaselineYear = form.controls.wasteReductionBaselineYear.value;
    account.sustainabilityQuestions.wasteReductionTargetYear = form.controls.wasteReductionTargetYear.value;
    account.sustainabilityQuestions.wasteIsAbsolute = form.controls.wasteIsAbsolute.value;
    account.sustainabilityQuestions.waterReductionGoal = form.controls.waterReductionGoal.value;
    account.sustainabilityQuestions.waterReductionPercent = form.controls.waterReductionPercent.value;
    account.sustainabilityQuestions.waterReductionBaselineYear = form.controls.waterReductionBaselineYear.value;
    account.sustainabilityQuestions.waterReductionTargetYear = form.controls.waterReductionTargetYear.value;
    account.sustainabilityQuestions.waterIsAbsolute = form.controls.waterIsAbsolute.value;
    return account;
  }

  updateFacilityFromSustainabilityQuestionsForm(form: FormGroup, facility: IdbFacility): IdbFacility {
    facility.sustainabilityQuestions.energyReductionGoal = form.controls.energyReductionGoal.value;
    facility.sustainabilityQuestions.energyReductionPercent = form.controls.energyReductionPercent.value;
    facility.sustainabilityQuestions.energyReductionBaselineYear = form.controls.energyReductionBaselineYear.value;
    facility.sustainabilityQuestions.energyReductionTargetYear = form.controls.energyReductionTargetYear.value;
    facility.sustainabilityQuestions.energyIsAbsolute = form.controls.energyIsAbsolute.value;
    facility.sustainabilityQuestions.greenhouseReductionGoal = form.controls.greenhouseReductionGoal.value;
    facility.sustainabilityQuestions.greenhouseReductionPercent = form.controls.greenhouseReductionPercent.value;
    facility.sustainabilityQuestions.greenhouseReductionBaselineYear = form.controls.greenhouseReductionBaselineYear.value;
    facility.sustainabilityQuestions.greenhouseReductionTargetYear = form.controls.greenhouseReductionTargetYear.value;
    facility.sustainabilityQuestions.greenhouseIsAbsolute = form.controls.greenhouseIsAbsolute.value;
    facility.sustainabilityQuestions.renewableEnergyGoal = form.controls.renewableEnergyGoal.value;
    facility.sustainabilityQuestions.renewableEnergyPercent = form.controls.renewableEnergyPercent.value;
    facility.sustainabilityQuestions.renewableEnergyBaselineYear = form.controls.renewableEnergyBaselineYear.value;
    facility.sustainabilityQuestions.renewableEnergyTargetYear = form.controls.renewableEnergyTargetYear.value;
    facility.sustainabilityQuestions.wasteReductionGoal = form.controls.wasteReductionGoal.value;
    facility.sustainabilityQuestions.wasteReductionPercent = form.controls.wasteReductionPercent.value;
    facility.sustainabilityQuestions.wasteReductionBaselineYear = form.controls.wasteReductionBaselineYear.value;
    facility.sustainabilityQuestions.wasteReductionTargetYear = form.controls.wasteReductionTargetYear.value;
    facility.sustainabilityQuestions.wasteIsAbsolute = form.controls.wasteIsAbsolute.value;
    facility.sustainabilityQuestions.waterReductionGoal = form.controls.waterReductionGoal.value;
    facility.sustainabilityQuestions.waterReductionPercent = form.controls.waterReductionPercent.value;
    facility.sustainabilityQuestions.waterReductionBaselineYear = form.controls.waterReductionBaselineYear.value;
    facility.sustainabilityQuestions.waterReductionTargetYear = form.controls.waterReductionTargetYear.value;
    facility.sustainabilityQuestions.waterIsAbsolute = form.controls.waterIsAbsolute.value;
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
        account.energyIsSource != facility.energyIsSource
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
    facilityForm.controls.energyIsSource.patchValue(account.energyIsSource);
    return facilityForm;
  }

  areAccountAndFacilitySustainQuestionsDifferent(account: IdbAccount, facility: IdbFacility): boolean {
    if (account && facility) {
      return (
        account.sustainabilityQuestions.energyReductionGoal != facility.sustainabilityQuestions.energyReductionGoal ||
        account.sustainabilityQuestions.energyReductionPercent != facility.sustainabilityQuestions.energyReductionPercent ||
        account.sustainabilityQuestions.energyReductionBaselineYear != facility.sustainabilityQuestions.energyReductionBaselineYear ||
        account.sustainabilityQuestions.energyReductionTargetYear != facility.sustainabilityQuestions.energyReductionTargetYear ||
        account.sustainabilityQuestions.energyIsAbsolute != facility.sustainabilityQuestions.energyIsAbsolute ||
        account.sustainabilityQuestions.greenhouseReductionGoal != facility.sustainabilityQuestions.greenhouseReductionGoal ||
        account.sustainabilityQuestions.greenhouseReductionPercent != facility.sustainabilityQuestions.greenhouseReductionPercent ||
        account.sustainabilityQuestions.greenhouseReductionBaselineYear != facility.sustainabilityQuestions.greenhouseReductionBaselineYear ||
        account.sustainabilityQuestions.greenhouseReductionTargetYear != facility.sustainabilityQuestions.greenhouseReductionTargetYear ||
        account.sustainabilityQuestions.greenhouseIsAbsolute != facility.sustainabilityQuestions.greenhouseIsAbsolute ||
        account.sustainabilityQuestions.renewableEnergyGoal != facility.sustainabilityQuestions.renewableEnergyGoal ||
        account.sustainabilityQuestions.renewableEnergyPercent != facility.sustainabilityQuestions.renewableEnergyPercent ||
        account.sustainabilityQuestions.renewableEnergyBaselineYear != facility.sustainabilityQuestions.renewableEnergyBaselineYear ||
        account.sustainabilityQuestions.renewableEnergyTargetYear != facility.sustainabilityQuestions.renewableEnergyTargetYear ||
        account.sustainabilityQuestions.wasteReductionGoal != facility.sustainabilityQuestions.wasteReductionGoal ||
        account.sustainabilityQuestions.wasteReductionPercent != facility.sustainabilityQuestions.wasteReductionPercent ||
        account.sustainabilityQuestions.wasteReductionBaselineYear != facility.sustainabilityQuestions.wasteReductionBaselineYear ||
        account.sustainabilityQuestions.wasteReductionTargetYear != facility.sustainabilityQuestions.wasteReductionTargetYear ||
        account.sustainabilityQuestions.wasteIsAbsolute != facility.sustainabilityQuestions.wasteIsAbsolute ||
        account.sustainabilityQuestions.waterReductionGoal != facility.sustainabilityQuestions.waterReductionGoal ||
        account.sustainabilityQuestions.waterReductionPercent != facility.sustainabilityQuestions.waterReductionPercent ||
        account.sustainabilityQuestions.waterReductionBaselineYear != facility.sustainabilityQuestions.waterReductionBaselineYear ||
        account.sustainabilityQuestions.waterReductionTargetYear != facility.sustainabilityQuestions.waterReductionTargetYear ||
        account.sustainabilityQuestions.waterIsAbsolute != facility.sustainabilityQuestions.waterIsAbsolute
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
    facilityForm.controls.energyIsAbsolute.patchValue(account.sustainabilityQuestions.energyIsAbsolute);
    facilityForm.controls.greenhouseReductionGoal.patchValue(account.sustainabilityQuestions.greenhouseReductionGoal);
    facilityForm.controls.greenhouseReductionPercent.patchValue(account.sustainabilityQuestions.greenhouseReductionPercent);
    facilityForm.controls.greenhouseReductionBaselineYear.patchValue(account.sustainabilityQuestions.greenhouseReductionBaselineYear);
    facilityForm.controls.greenhouseReductionTargetYear.patchValue(account.sustainabilityQuestions.greenhouseReductionTargetYear);
    facilityForm.controls.greenhouseIsAbsolute.patchValue(account.sustainabilityQuestions.greenhouseIsAbsolute);
    facilityForm.controls.renewableEnergyGoal.patchValue(account.sustainabilityQuestions.renewableEnergyGoal);
    facilityForm.controls.renewableEnergyPercent.patchValue(account.sustainabilityQuestions.renewableEnergyPercent);
    facilityForm.controls.renewableEnergyBaselineYear.patchValue(account.sustainabilityQuestions.renewableEnergyBaselineYear);
    facilityForm.controls.renewableEnergyTargetYear.patchValue(account.sustainabilityQuestions.renewableEnergyTargetYear);
    facilityForm.controls.wasteReductionGoal.patchValue(account.sustainabilityQuestions.wasteReductionGoal);
    facilityForm.controls.wasteReductionPercent.patchValue(account.sustainabilityQuestions.wasteReductionPercent);
    facilityForm.controls.wasteReductionBaselineYear.patchValue(account.sustainabilityQuestions.wasteReductionBaselineYear);
    facilityForm.controls.wasteReductionTargetYear.patchValue(account.sustainabilityQuestions.wasteReductionTargetYear);
    facilityForm.controls.wasteIsAbsolute.patchValue(account.sustainabilityQuestions.wasteIsAbsolute);
    facilityForm.controls.waterReductionGoal.patchValue(account.sustainabilityQuestions.waterReductionGoal);
    facilityForm.controls.waterReductionPercent.patchValue(account.sustainabilityQuestions.waterReductionPercent);
    facilityForm.controls.waterReductionBaselineYear.patchValue(account.sustainabilityQuestions.waterReductionBaselineYear);
    facilityForm.controls.waterReductionTargetYear.patchValue(account.sustainabilityQuestions.waterReductionTargetYear);
    facilityForm.controls.waterIsAbsolute.patchValue(account.sustainabilityQuestions.waterIsAbsolute);
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
