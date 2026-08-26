import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { DEFAULT_DATA_STALENESS_MONTHS } from '@domain/calculations/status-check-calculations/statusCheckModels';
import { IdbAccount } from '@data/models/idbModels/account';
import { AccountSettingsFormService } from './account-settings-form.service';

describe('AccountSettingsFormService', () => {
  let service: AccountSettingsFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormBuilder, AccountSettingsFormService]
    });
    service = TestBed.inject(AccountSettingsFormService);
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
