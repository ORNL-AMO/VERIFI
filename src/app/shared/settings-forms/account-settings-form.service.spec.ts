import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { DEFAULT_DATA_STALENESS_MONTHS } from '@domain/calculations/status-check-calculations/statusCheckModels';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { SettingsFormService } from './settings-form.service';

describe('SettingsFormService', () => {
  let service: SettingsFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormBuilder, SettingsFormService]
    });
    service = TestBed.inject(SettingsFormService);
  });

  it('maps account profile fields without changing identifiers', () => {
    const account = accountFixture();
    const form = service.getGeneralInformationForm(account);

    form.patchValue({
      name: ' Updated Account ',
      country: 'CA',
      city: 'Toronto',
      contactEmail: 'energy@example.com'
    });

    const updated = service.updateAccountFromGeneralInformationForm(form, { ...account });

    expect(updated.guid).toBe('account-a');
    expect(updated.name).toBe('Updated Account');
    expect(updated.country).toBe('CA');
    expect(updated.city).toBe('Toronto');
    expect(updated.contactEmail).toBe('energy@example.com');
  });

  it('normalizes missing optional account settings for older records', () => {
    const olderAccount = {
      ...accountFixture(),
      assessmentReportVersion: undefined,
      displayEmissions: undefined,
      dataStalenessSettings: undefined
    } as unknown as IdbAccount;

    const unitsForm = service.getUnitsForm(olderAccount);
    const goalsForm = service.getSustainabilityQuestionsForm(olderAccount);
    const stalenessForm = service.getStalenessForm(olderAccount.dataStalenessSettings);

    expect(unitsForm.controls['assessmentReportVersion']).toBeUndefined();
    expect(unitsForm.controls['displayEmissions']).toBeUndefined();
    expect(goalsForm.controls['assessmentReportVersion'].value).toBe('AR6');
    expect(goalsForm.controls['displayEmissions'].value).toBe(false);
    expect(stalenessForm.controls['enabled'].value).toBe(true);
    expect(stalenessForm.controls['thresholdMonths'].value).toBe(DEFAULT_DATA_STALENESS_MONTHS);
  });

  it('sets unit presets and identifies custom unit selections', () => {
    const form = service.getUnitsForm(accountFixture());

    form.controls['unitsOfMeasure'].setValue('Metric');
    service.setUnitsOfMeasure(form);

    expect(form.controls['energyUnit'].value).toBe('MMBtu');
    expect(form.controls['volumeLiquidUnit'].value).toBe('m3');
    expect(form.controls['volumeGasUnit'].value).toBe('m3');
    expect(form.controls['massUnit'].value).toBe('kg');

    form.controls['energyUnit'].setValue('kWh');
    service.checkCustom(form);

    expect(form.controls['unitsOfMeasure'].value).toBe('Custom');
  });

  it('writes sustainability, financial, and staleness fields back to account copies', () => {
    const account = accountFixture();
    const goalsForm = service.getSustainabilityQuestionsForm(account);
    const financialForm = service.getFiscalYearForm(account);
    const stalenessForm = service.getStalenessForm(account.dataStalenessSettings);

    goalsForm.patchValue({
      displayEmissions: true,
      assessmentReportVersion: 'AR5',
      isBetterPlantsPartner: true,
      waterReductionGoal: true,
      waterReductionPercent: 12
    });
    financialForm.patchValue({
      fiscalYear: 'nonCalendarYear',
      fiscalYearMonth: 6,
      fiscalYearCalendarEnd: false
    });
    stalenessForm.patchValue({
      enabled: false,
      thresholdMonths: 18
    });

    const updated = service.updateAccountFromStalenessForm(
      stalenessForm,
      service.updateAccountFromFiscalForm(
        financialForm,
        service.updateAccountFromSustainabilityQuestionsForm(goalsForm, { ...account })
      )
    );

    expect(updated.displayEmissions).toBe(true);
    expect(updated.assessmentReportVersion).toBe('AR5');
    expect(updated.isBetterPlantsPartner).toBe(true);
    expect(updated.sustainabilityQuestions.waterReductionGoal).toBe(true);
    expect(updated.sustainabilityQuestions.waterReductionPercent).toBe(12);
    expect(updated.fiscalYear).toBe('nonCalendarYear');
    expect(updated.fiscalYearMonth).toBe(6);
    expect(updated.fiscalYearCalendarEnd).toBe(false);
    expect(updated.dataStalenessSettings).toEqual({ enabled: false, thresholdMonths: 18 });
  });

  it('maps facility profile fields without changing identifiers', () => {
    const facility = facilityFixture();
    const form = service.getGeneralInformationForm(facility);

    form.patchValue({
      name: ' Updated Facility ',
      city: 'Oak Ridge',
      size: 45000
    });

    const updated = service.updateFacilityFromGeneralInformationForm(form, { ...facility });

    expect(updated.guid).toBe('facility-a');
    expect(updated.accountId).toBe('account-a');
    expect(updated.name).toBe('Updated Facility');
    expect(updated.city).toBe('Oak Ridge');
    expect(updated.size).toBe(45000);
  });

  it('detects and copies account unit settings for facilities', () => {
    const account = accountFixture();
    const facility = {
      ...facilityFixture(),
      energyUnit: 'GJ',
      eGridSubregion: 'SRTV'
    };
    const form = service.getUnitsForm(facility);

    expect(service.areAccountAndFacilityUnitsDifferent(account, facility)).toBe(true);

    service.setAccountUnits(form, account);
    const updated = service.updateFacilityFromUnitsForm(form, { ...facility });

    expect(updated.energyUnit).toBe(account.energyUnit);
    expect(updated.eGridSubregion).toBe(account.eGridSubregion);
    expect(service.areAccountAndFacilityUnitsDifferent(account, updated)).toBe(false);
  });

  it('detects and copies account goal settings for facilities without account-only controls', () => {
    const account = accountFixture();
    const facility = {
      ...facilityFixture(),
      sustainabilityQuestions: {
        ...account.sustainabilityQuestions,
        energyReductionPercent: 10
      }
    };
    const form = service.getFacilitySustainabilityQuestionsForm(facility);

    expect(form.controls['displayEmissions']).toBeUndefined();
    expect(service.areAccountAndFacilitySustainabilityQuestionsDifferent(account, facility)).toBe(true);

    service.setAccountSustainabilityQuestions(form, account);
    const updatedFacility = service.updateFacilityFromSustainabilityQuestionsForm(form, { ...facility });
    const updatedAccount = service.updateAccountFromSustainabilityQuestionsForm(form, { ...account });

    expect(updatedFacility.sustainabilityQuestions.energyReductionPercent).toBe(25);
    expect(updatedAccount.displayEmissions).toBe(false);
    expect(service.areAccountAndFacilitySustainabilityQuestionsDifferent(account, updatedFacility)).toBe(false);
  });

  it('detects and copies account financial reporting for facilities', () => {
    const account = { ...accountFixture(), fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6 };
    const facility = facilityFixture();
    const form = service.getFiscalYearForm(facility);

    expect(service.areAccountAndFacilityFinancialReportingDifferent(account, facility)).toBe(true);

    service.setAccountFinancialReporting(form, account);
    const updated = service.updateFacilityFromFiscalForm(form, { ...facility });

    expect(updated.fiscalYear).toBe('nonCalendarYear');
    expect(updated.fiscalYearMonth).toBe(6);
    expect(service.areAccountAndFacilityFinancialReportingDifferent(account, updated)).toBe(false);
  });

  it('normalizes and copies facility staleness settings', () => {
    const account = {
      ...accountFixture(),
      dataStalenessSettings: { enabled: false, thresholdMonths: 12 as const }
    };
    const facility = {
      ...facilityFixture(),
      dataStalenessSettings: undefined
    } as IdbFacility;
    const form = service.getFacilityStalenessForm(facility.dataStalenessSettings, account.dataStalenessSettings);

    expect(form.controls['enabled'].value).toBe(false);
    expect(form.controls['thresholdMonths'].value).toBe(12);
    expect(form.controls['useAccountSettings'].value).toBe(true);

    service.setAccountStaleness(form, account);
    const updated = service.updateFacilityFromStalenessForm(form, { ...facility });

    expect(updated.dataStalenessSettings).toEqual({ enabled: false, thresholdMonths: 12, useAccountSettings: true });
    expect(service.areAccountAndFacilityStalenessDifferent(account, updated)).toBe(false);
  });
});

function accountFixture(): IdbAccount {
  return {
    guid: 'account-a',
    name: 'Account A',
    country: 'US',
    city: 'Knoxville',
    state: 'TN',
    zip: '37932',
    address: '1 Main St',
    naics1: '31',
    naics2: undefined,
    naics3: undefined,
    size: 0,
    notes: '',
    color: undefined,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    unitsOfMeasure: 'Imperial',
    energyUnit: 'MMBtu',
    electricityUnit: 'kWh',
    volumeLiquidUnit: 'gal',
    volumeGasUnit: 'SCF',
    massUnit: 'lb',
    energyIsSource: true,
    fiscalYear: 'calendarYear',
    fiscalYearMonth: 0,
    fiscalYearCalendarEnd: true,
    archiveOption: 'skip',
    assessmentReportVersion: 'AR6',
    displayEmissions: false,
    sustainabilityQuestions: {
      energyReductionGoal: true,
      energyReductionPercent: 25,
      energyReductionBaselineYear: 2020,
      energyReductionTargetYear: 2030,
      energyIsAbsolute: false,
      greenhouseReductionGoal: false,
      greenhouseReductionPercent: 0,
      greenhouseReductionBaselineYear: 2020,
      greenhouseReductionTargetYear: 2030,
      greenhouseIsAbsolute: true,
      waterReductionGoal: false,
      waterReductionPercent: 0,
      waterReductionBaselineYear: 2020,
      waterReductionTargetYear: 2030,
      waterIsAbsolute: false
    },
    dataStalenessSettings: {
      enabled: true,
      thresholdMonths: DEFAULT_DATA_STALENESS_MONTHS
    }
  } as IdbAccount;
}

function facilityFixture(): IdbFacility {
  return {
    ...accountFixture(),
    guid: 'facility-a',
    accountId: 'account-a',
    name: 'Facility A',
    size: 10000,
    classification: 'Manufacturing',
    isNewFacility: false,
    dataStalenessSettings: {
      enabled: true,
      thresholdMonths: DEFAULT_DATA_STALENESS_MONTHS,
      useAccountSettings: false
    }
  } as IdbFacility;
}
