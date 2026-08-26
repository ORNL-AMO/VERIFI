import { Injectable } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { DEFAULT_DATA_STALENESS_MONTHS, DataStalenessMonths } from '@domain/calculations/status-check-calculations/statusCheckModels';
import { AccountAndFacility, DataStalenessSettings } from '@data/models/idbModels/accountAndFacility';
import { AssessmentReportVersion, IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { SustainabilityQuestions } from '@data/models/sustainabilityQuestions';
import { EnergyUnitOptions, MassUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from '@shared/unitOptions';

export type SettingsForm = FormGroup<Record<string, FormControl<unknown>>>;

@Injectable({ providedIn: 'root' })
export class SettingsFormService {
  constructor(private readonly formBuilder: FormBuilder) { }

  getGeneralInformationForm(generalInformation: AccountAndFacility): FormGroup {
    return this.formBuilder.group({
      name: [generalInformation.name, [Validators.required, Validators.maxLength(42)]],
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
  }

  updateAccountFromGeneralInformationForm(form: FormGroup, account: IdbAccount): IdbAccount {
    account.name = String(form.controls['name'].value || '').trim();
    account.country = form.controls['country'].value;
    account.city = form.controls['city'].value;
    account.state = form.controls['state'].value;
    account.zip = form.controls['zip'].value;
    account.address = form.controls['address'].value;
    account.naics1 = form.controls['naics1'].value;
    account.naics2 = form.controls['naics2'].value;
    account.naics3 = form.controls['naics3'].value;
    account.notes = form.controls['notes'].value;
    account.color = form.controls['color'].value;
    account.contactName = form.controls['contactName'].value;
    account.contactEmail = form.controls['contactEmail'].value;
    account.contactPhone = form.controls['contactPhone'].value;
    return account;
  }

  updateFacilityFromGeneralInformationForm(form: FormGroup, facility: IdbFacility): IdbFacility {
    facility.name = String(form.controls['name'].value || '').trim();
    facility.country = form.controls['country'].value;
    facility.city = form.controls['city'].value;
    facility.state = form.controls['state'].value;
    facility.zip = form.controls['zip'].value;
    facility.address = form.controls['address'].value;
    facility.naics1 = form.controls['naics1'].value;
    facility.naics2 = form.controls['naics2'].value;
    facility.naics3 = form.controls['naics3'].value;
    facility.notes = form.controls['notes'].value;
    facility.color = form.controls['color'].value;
    facility.contactName = form.controls['contactName'].value;
    facility.contactEmail = form.controls['contactEmail'].value;
    facility.contactPhone = form.controls['contactPhone'].value;
    facility.size = form.controls['size'].value;
    return facility;
  }

  getUnitsForm(accountOrFacility: AccountAndFacility): FormGroup {
    return this.formBuilder.group({
      unitsOfMeasure: [accountOrFacility.unitsOfMeasure, [Validators.required]],
      energyUnit: [accountOrFacility.energyUnit, [Validators.required]],
      massUnit: [accountOrFacility.massUnit, [Validators.required]],
      volumeLiquidUnit: [accountOrFacility.volumeLiquidUnit, [Validators.required]],
      volumeGasUnit: [accountOrFacility.volumeGasUnit, [Validators.required]],
      energyIsSource: [accountOrFacility.energyIsSource],
      eGridSubregion: [accountOrFacility.eGridSubregion],
      electricityUnit: [accountOrFacility.electricityUnit]
    });
  }

  updateAccountFromUnitsForm(form: FormGroup, account: IdbAccount): IdbAccount {
    account.unitsOfMeasure = form.controls['unitsOfMeasure'].value;
    account.energyUnit = form.controls['energyUnit'].value;
    account.massUnit = form.controls['massUnit'].value;
    account.volumeLiquidUnit = form.controls['volumeLiquidUnit'].value;
    account.volumeGasUnit = form.controls['volumeGasUnit'].value;
    account.energyIsSource = form.controls['energyIsSource'].value;
    account.eGridSubregion = form.controls['eGridSubregion'].value;
    account.electricityUnit = form.controls['electricityUnit'].value;
    return account;
  }

  updateFacilityFromUnitsForm(form: FormGroup, facility: IdbFacility): IdbFacility {
    facility.unitsOfMeasure = form.controls['unitsOfMeasure'].value;
    facility.energyUnit = form.controls['energyUnit'].value;
    facility.massUnit = form.controls['massUnit'].value;
    facility.volumeLiquidUnit = form.controls['volumeLiquidUnit'].value;
    facility.volumeGasUnit = form.controls['volumeGasUnit'].value;
    facility.energyIsSource = form.controls['energyIsSource'].value;
    facility.eGridSubregion = form.controls['eGridSubregion'].value;
    facility.electricityUnit = form.controls['electricityUnit'].value;
    return facility;
  }

  getFiscalYearForm(accountOrFacility: AccountAndFacility): FormGroup {
    return this.formBuilder.group({
      fiscalYear: [accountOrFacility.fiscalYear || 'calendarYear'],
      fiscalYearMonth: [accountOrFacility.fiscalYearMonth ?? 0],
      fiscalYearCalendarEnd: [accountOrFacility.fiscalYearCalendarEnd ?? true]
    });
  }

  updateAccountFromFiscalForm(form: FormGroup, account: IdbAccount): IdbAccount {
    account.fiscalYear = form.controls['fiscalYear'].value;
    account.fiscalYearMonth = form.controls['fiscalYearMonth'].value;
    account.fiscalYearCalendarEnd = form.controls['fiscalYearCalendarEnd'].value;
    return account;
  }

  updateFacilityFromFiscalForm(form: FormGroup, facility: IdbFacility): IdbFacility {
    facility.fiscalYear = form.controls['fiscalYear'].value;
    facility.fiscalYearMonth = form.controls['fiscalYearMonth'].value;
    facility.fiscalYearCalendarEnd = form.controls['fiscalYearCalendarEnd'].value;
    return facility;
  }

  getSustainabilityQuestionsForm(account: IdbAccount): FormGroup {
    const questions = this.normalizeSustainabilityQuestions(account.sustainabilityQuestions);
    return this.formBuilder.group({
      displayEmissions: [!!account.displayEmissions],
      assessmentReportVersion: [account.assessmentReportVersion || 'AR6'],
      isBetterPlantsPartner: [!!account.isBetterPlantsPartner],
      ...this.getSustainabilityQuestionControlConfig(questions)
    });
  }

  getFacilitySustainabilityQuestionsForm(facility: IdbFacility): FormGroup {
    const questions = this.normalizeSustainabilityQuestions(facility.sustainabilityQuestions);
    return this.formBuilder.group({
      ...this.getSustainabilityQuestionControlConfig(questions),
      isNewFacility: [!!facility.isNewFacility]
    });
  }

  updateAccountFromSustainabilityQuestionsForm(form: FormGroup, account: IdbAccount): IdbAccount {
    if (form.controls['displayEmissions']) {
      account.displayEmissions = !!form.controls['displayEmissions'].value;
    }
    if (form.controls['assessmentReportVersion']) {
      account.assessmentReportVersion = (form.controls['assessmentReportVersion'].value || 'AR6') as AssessmentReportVersion;
    }
    account.sustainabilityQuestions = this.getSustainabilityQuestionsFromForm(form);
    if (form.controls['isBetterPlantsPartner']) {
      account.isBetterPlantsPartner = !!form.controls['isBetterPlantsPartner'].value;
    }
    return account;
  }

  updateFacilityFromSustainabilityQuestionsForm(form: FormGroup, facility: IdbFacility): IdbFacility {
    facility.sustainabilityQuestions = this.getSustainabilityQuestionsFromForm(form);
    facility.isNewFacility = !!form.controls['isNewFacility']?.value;
    return facility;
  }

  getStalenessForm(settings: DataStalenessSettings | undefined): FormGroup {
    const current = this.normalizeDataStalenessSettings(settings);
    return this.formBuilder.group({
      enabled: [current.enabled],
      thresholdMonths: [current.thresholdMonths]
    });
  }

  getFacilityStalenessForm(
    facilitySettings: DataStalenessSettings | undefined,
    accountSettings?: DataStalenessSettings
  ): FormGroup {
    const current = this.normalizeFacilityDataStalenessSettings(facilitySettings, accountSettings);
    return this.formBuilder.group({
      enabled: [current.enabled],
      thresholdMonths: [current.thresholdMonths],
      useAccountSettings: [!!current.useAccountSettings]
    });
  }

  updateAccountFromStalenessForm(form: FormGroup, account: IdbAccount): IdbAccount {
    account.dataStalenessSettings = {
      enabled: !!form.controls['enabled'].value,
      thresholdMonths: form.controls['thresholdMonths'].value as DataStalenessMonths
    };
    return account;
  }

  updateFacilityFromStalenessForm(form: FormGroup, facility: IdbFacility): IdbFacility {
    facility.dataStalenessSettings = {
      enabled: !!form.controls['enabled'].value,
      thresholdMonths: form.controls['thresholdMonths'].value as DataStalenessMonths,
      useAccountSettings: !!form.controls['useAccountSettings']?.value
    };
    return facility;
  }

  setUnitsOfMeasure(form: FormGroup): FormGroup {
    if (form.controls['unitsOfMeasure'].value === 'Imperial') {
      form.controls['energyUnit'].setValue('kWh');
      form.controls['volumeLiquidUnit'].setValue('ft3');
      form.controls['volumeGasUnit'].setValue('SCF');
      form.controls['massUnit'].setValue('lb');
    } else if (form.controls['unitsOfMeasure'].value === 'Metric') {
      form.controls['energyUnit'].setValue('MMBtu');
      form.controls['volumeLiquidUnit'].setValue('m3');
      form.controls['volumeGasUnit'].setValue('m3');
      form.controls['massUnit'].setValue('kg');
    }
    return form;
  }

  checkCustom(form: FormGroup): FormGroup {
    const selectedEnergyOption = EnergyUnitOptions.find(option => option.value === form.controls['energyUnit'].value);
    const selectedVolumeGasOption = VolumeGasOptions.find(option => option.value === form.controls['volumeGasUnit'].value);
    const selectedVolumeLiquidOption = VolumeLiquidOptions.find(option => option.value === form.controls['volumeLiquidUnit'].value);
    const selectedMassOption = MassUnitOptions.find(option => option.value === form.controls['massUnit'].value);
    if (selectedEnergyOption && selectedVolumeGasOption && selectedVolumeLiquidOption && selectedMassOption) {
      this.patchUnitsOfMeasure(form, selectedEnergyOption, selectedVolumeLiquidOption, selectedVolumeGasOption, selectedMassOption);
    }
    return form;
  }

  setAccountUnits(form: FormGroup, account: IdbAccount): FormGroup {
    form.patchValue({
      energyUnit: account.energyUnit,
      volumeLiquidUnit: account.volumeLiquidUnit,
      volumeGasUnit: account.volumeGasUnit,
      massUnit: account.massUnit,
      unitsOfMeasure: account.unitsOfMeasure,
      energyIsSource: account.energyIsSource,
      electricityUnit: account.electricityUnit,
      eGridSubregion: account.eGridSubregion
    });
    return form;
  }

  setAccountSustainabilityQuestions(form: FormGroup, account: IdbAccount): FormGroup {
    const questions = this.normalizeSustainabilityQuestions(account.sustainabilityQuestions);
    form.patchValue({
      energyReductionGoal: questions.energyReductionGoal,
      energyReductionPercent: questions.energyReductionPercent,
      energyReductionBaselineYear: questions.energyReductionBaselineYear,
      energyReductionTargetYear: questions.energyReductionTargetYear,
      energyIsAbsolute: questions.energyIsAbsolute,
      greenhouseReductionGoal: questions.greenhouseReductionGoal,
      greenhouseReductionPercent: questions.greenhouseReductionPercent,
      greenhouseReductionBaselineYear: questions.greenhouseReductionBaselineYear,
      greenhouseReductionTargetYear: questions.greenhouseReductionTargetYear,
      greenhouseIsAbsolute: questions.greenhouseIsAbsolute,
      waterReductionGoal: questions.waterReductionGoal,
      waterReductionPercent: questions.waterReductionPercent,
      waterReductionBaselineYear: questions.waterReductionBaselineYear,
      waterReductionTargetYear: questions.waterReductionTargetYear,
      waterIsAbsolute: questions.waterIsAbsolute
    });
    return form;
  }

  setAccountFinancialReporting(form: FormGroup, account: IdbAccount): FormGroup {
    form.patchValue({
      fiscalYear: account.fiscalYear || 'calendarYear',
      fiscalYearMonth: account.fiscalYearMonth ?? 0,
      fiscalYearCalendarEnd: account.fiscalYearCalendarEnd ?? true
    });
    return form;
  }

  setAccountStaleness(form: FormGroup, account: IdbAccount): FormGroup {
    const accountSettings = this.normalizeDataStalenessSettings(account.dataStalenessSettings);
    const accountValues: Record<string, unknown> = {
      enabled: accountSettings.enabled,
      thresholdMonths: accountSettings.thresholdMonths
    };
    if (form.controls['useAccountSettings']) {
      accountValues['useAccountSettings'] = true;
    }
    form.patchValue(accountValues);
    return form;
  }

  areAccountAndFacilityUnitsDifferent(account: IdbAccount, facility: IdbFacility): boolean {
    return account.unitsOfMeasure !== facility.unitsOfMeasure
      || account.massUnit !== facility.massUnit
      || account.energyUnit !== facility.energyUnit
      || account.volumeGasUnit !== facility.volumeGasUnit
      || account.volumeLiquidUnit !== facility.volumeLiquidUnit
      || account.energyIsSource !== facility.energyIsSource
      || account.electricityUnit !== facility.electricityUnit
      || account.eGridSubregion !== facility.eGridSubregion;
  }

  areAccountAndFacilitySustainabilityQuestionsDifferent(account: IdbAccount, facility: IdbFacility): boolean {
    const accountQuestions = this.normalizeSustainabilityQuestions(account.sustainabilityQuestions);
    const facilityQuestions = this.normalizeSustainabilityQuestions(facility.sustainabilityQuestions);
    return Object.keys(accountQuestions).some(key =>
      accountQuestions[key as keyof SustainabilityQuestions] !== facilityQuestions[key as keyof SustainabilityQuestions]
    );
  }

  areAccountAndFacilityFinancialReportingDifferent(account: IdbAccount, facility: IdbFacility): boolean {
    return (account.fiscalYear || 'calendarYear') !== (facility.fiscalYear || 'calendarYear')
      || (account.fiscalYearMonth ?? 0) !== (facility.fiscalYearMonth ?? 0)
      || (account.fiscalYearCalendarEnd ?? true) !== (facility.fiscalYearCalendarEnd ?? true);
  }

  areAccountAndFacilityStalenessDifferent(account: IdbAccount, facility: IdbFacility): boolean {
    const facilitySettings = facility.dataStalenessSettings;
    if (facilitySettings?.useAccountSettings) {
      return false;
    }
    const accountSettings = this.normalizeDataStalenessSettings(account.dataStalenessSettings);
    const normalizedFacilitySettings = this.normalizeDataStalenessSettings(facilitySettings);
    return accountSettings.enabled !== normalizedFacilitySettings.enabled
      || accountSettings.thresholdMonths !== normalizedFacilitySettings.thresholdMonths;
  }

  normalizeDataStalenessSettings(settings: DataStalenessSettings | undefined): DataStalenessSettings {
    return {
      enabled: settings?.enabled ?? true,
      thresholdMonths: settings?.thresholdMonths ?? DEFAULT_DATA_STALENESS_MONTHS
    };
  }

  normalizeFacilityDataStalenessSettings(
    facilitySettings: DataStalenessSettings | undefined,
    accountSettings?: DataStalenessSettings
  ): DataStalenessSettings {
    const useAccountSettings = facilitySettings?.useAccountSettings ?? true;
    if (useAccountSettings && accountSettings) {
      const normalizedAccountSettings = this.normalizeDataStalenessSettings(accountSettings);
      return {
        ...normalizedAccountSettings,
        useAccountSettings: true
      };
    }
    return {
      ...this.normalizeDataStalenessSettings(facilitySettings),
      useAccountSettings
    };
  }

  normalizeSustainabilityQuestions(questions: SustainabilityQuestions | undefined): SustainabilityQuestions {
    const currentYear = this.currentYear();
    return {
      energyReductionGoal: questions?.energyReductionGoal ?? true,
      energyReductionPercent: questions?.energyReductionPercent ?? 25,
      energyReductionBaselineYear: questions?.energyReductionBaselineYear ?? currentYear,
      energyReductionTargetYear: questions?.energyReductionTargetYear ?? Math.min(currentYear + 10, 2050),
      energyIsAbsolute: questions?.energyIsAbsolute ?? false,
      greenhouseReductionGoal: questions?.greenhouseReductionGoal ?? false,
      greenhouseReductionPercent: questions?.greenhouseReductionPercent ?? 0,
      greenhouseReductionBaselineYear: questions?.greenhouseReductionBaselineYear ?? currentYear,
      greenhouseReductionTargetYear: questions?.greenhouseReductionTargetYear ?? Math.min(currentYear + 10, 2050),
      greenhouseIsAbsolute: questions?.greenhouseIsAbsolute ?? true,
      waterReductionGoal: questions?.waterReductionGoal ?? false,
      waterReductionPercent: questions?.waterReductionPercent ?? 0,
      waterReductionBaselineYear: questions?.waterReductionBaselineYear ?? currentYear,
      waterReductionTargetYear: questions?.waterReductionTargetYear ?? Math.min(currentYear + 10, 2050),
      waterIsAbsolute: questions?.waterIsAbsolute ?? false
    };
  }

  private getSustainabilityQuestionControlConfig(questions: SustainabilityQuestions) {
    return {
      energyReductionGoal: [questions.energyReductionGoal],
      energyReductionPercent: [questions.energyReductionPercent],
      energyReductionBaselineYear: [questions.energyReductionBaselineYear],
      energyReductionTargetYear: [questions.energyReductionTargetYear],
      energyIsAbsolute: [questions.energyIsAbsolute],
      greenhouseReductionGoal: [questions.greenhouseReductionGoal],
      greenhouseReductionPercent: [questions.greenhouseReductionPercent],
      greenhouseReductionBaselineYear: [questions.greenhouseReductionBaselineYear],
      greenhouseReductionTargetYear: [questions.greenhouseReductionTargetYear],
      greenhouseIsAbsolute: [questions.greenhouseIsAbsolute],
      waterReductionGoal: [questions.waterReductionGoal],
      waterReductionPercent: [questions.waterReductionPercent],
      waterReductionBaselineYear: [questions.waterReductionBaselineYear],
      waterReductionTargetYear: [questions.waterReductionTargetYear],
      waterIsAbsolute: [questions.waterIsAbsolute]
    };
  }

  private getSustainabilityQuestionsFromForm(form: FormGroup): SustainabilityQuestions {
    return {
      energyReductionGoal: !!form.controls['energyReductionGoal'].value,
      energyReductionPercent: Number(form.controls['energyReductionPercent'].value || 0),
      energyReductionBaselineYear: Number(form.controls['energyReductionBaselineYear'].value || this.currentYear()),
      energyReductionTargetYear: Number(form.controls['energyReductionTargetYear'].value || this.currentYear() + 10),
      energyIsAbsolute: !!form.controls['energyIsAbsolute'].value,
      greenhouseReductionGoal: !!form.controls['greenhouseReductionGoal'].value,
      greenhouseReductionPercent: Number(form.controls['greenhouseReductionPercent'].value || 0),
      greenhouseReductionBaselineYear: Number(form.controls['greenhouseReductionBaselineYear'].value || this.currentYear()),
      greenhouseReductionTargetYear: Number(form.controls['greenhouseReductionTargetYear'].value || this.currentYear() + 10),
      greenhouseIsAbsolute: !!form.controls['greenhouseIsAbsolute'].value,
      waterReductionGoal: !!form.controls['waterReductionGoal'].value,
      waterReductionPercent: Number(form.controls['waterReductionPercent'].value || 0),
      waterReductionBaselineYear: Number(form.controls['waterReductionBaselineYear'].value || this.currentYear()),
      waterReductionTargetYear: Number(form.controls['waterReductionTargetYear'].value || this.currentYear() + 10),
      waterIsAbsolute: !!form.controls['waterIsAbsolute'].value
    };
  }

  private patchUnitsOfMeasure(
    form: FormGroup,
    selectedEnergyOption: UnitOption,
    selectedVolumeLiquidOption: UnitOption,
    selectedVolumeGasOption: UnitOption,
    selectedMassOption: UnitOption
  ): void {
    if (
      selectedEnergyOption.unitsOfMeasure === 'Metric'
      && selectedVolumeLiquidOption.unitsOfMeasure === 'Metric'
      && selectedVolumeGasOption.unitsOfMeasure === 'Metric'
      && selectedMassOption.unitsOfMeasure === 'Metric'
    ) {
      form.controls['unitsOfMeasure'].patchValue('Metric');
    } else if (
      selectedEnergyOption.unitsOfMeasure === 'Imperial'
      && selectedVolumeLiquidOption.unitsOfMeasure === 'Imperial'
      && selectedVolumeGasOption.unitsOfMeasure === 'Imperial'
      && selectedMassOption.unitsOfMeasure === 'Imperial'
    ) {
      form.controls['unitsOfMeasure'].patchValue('Imperial');
    } else {
      form.controls['unitsOfMeasure'].patchValue('Custom');
    }
  }

  private currentYear(): number {
    return new Date().getFullYear();
  }
}
