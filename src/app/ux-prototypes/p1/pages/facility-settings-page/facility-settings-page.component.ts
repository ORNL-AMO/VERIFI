import { Component, effect, inject, untracked } from '@angular/core';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';
import { FacilityClassifications } from 'src/app/models/constantsAndTypes';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { FacilityCommandHandler } from 'src/app/account-workspace/handlers/facility-command-handler.service';
import { DATA_STALENESS_OPTIONS, DataStalenessMonths, DEFAULT_DATA_STALENESS_MONTHS } from 'src/app/calculations/status-check-calculations/statusCheckModels';
import { DataStalenessSettings } from 'src/app/models/idbModels/accountAndFacility';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { Countries } from 'src/app/shared/form-data/countries';
import { Months } from 'src/app/shared/form-data/months';
import { FirstNaicsList, NAICS, SecondNaicsList, ThirdNaicsList } from 'src/app/shared/form-data/naics-data';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { SettingsFormsService } from 'src/app/shared/settings-forms/settings-forms.service';
import { EnergyUnitOptions, MassUnitOptions, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { P1RouteFacade } from '../../p1-route.facade';

@Component({
  selector: 'app-p1-facility-settings-page',
  templateUrl: './facility-settings-page.component.html',
  styleUrls: [
    '../../components/workspace-main/workspace-main.component.css',
    '../account-settings-page/account-settings-page.component.css',
    './facility-settings-page.component.css'
  ],
  standalone: false
})
export class P1FacilitySettingsPageComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly facilityHandler = inject(FacilityCommandHandler);
  private readonly settingsForms = inject(SettingsFormsService);
  private readonly eGridService = inject(EGridService);
  readonly facade = inject(P1RouteFacade);
  readonly page = this;

  readonly account = this.workspace.account;
  readonly facility = this.workspace.selectedFacility;
  readonly canWrite = this.workspace.canWrite;
  readonly countries = Countries;
  readonly months = Months;
  readonly firstNaicsList = FirstNaicsList;
  readonly facilityClassifications = FacilityClassifications;
  readonly energyUnitOptions = EnergyUnitOptions;
  readonly volumeLiquidOptions = VolumeLiquidOptions;
  readonly volumeGasOptions = VolumeGasOptions;
  readonly massUnitOptions = MassUnitOptions;
  readonly stalenessOptions = DATA_STALENESS_OPTIONS;
  readonly years = Array.from({ length: 50 }, (_, index) => 2050 - index);

  profileForm: FormGroup;
  unitsForm: FormGroup;
  goalsForm: FormGroup;
  financialForm: FormGroup;
  stalenessForm: FormGroup;
  subregionOptions: string[] = ['US Average'];
  isSaving = false;
  saveMessage = '';
  saveError = '';
  private skipNextWorkspaceRefresh = false;

  constructor() {
    effect(() => {
      const facility = this.facility();
      const account = this.account();
      if (!facility || !account) {
        return;
      }
      if (this.skipNextWorkspaceRefresh) {
        this.skipNextWorkspaceRefresh = false;
        return;
      }
      this.buildForms(facility);
    });
    effect(() => {
      this.applyFormAvailability(this.canWrite());
    });
  }

  get activeDetail(): string {
    return this.facade.activeDetailId();
  }

  get unitsDontMatchAccount(): boolean {
    const account = this.account();
    const facility = this.facility();
    return !!account && !!facility && this.settingsForms.areAccountAndFacilityUnitsDifferent(account, facility);
  }

  get goalsDontMatchAccount(): boolean {
    const account = this.account();
    const facility = this.facility();
    return !!account && !!facility && this.settingsForms.areAccountAndFacilitySustainQuestionsDifferent(account, facility);
  }

  get financialDontMatchAccount(): boolean {
    const account = this.account();
    const facility = this.facility();
    return !!account && !!facility && this.settingsForms.areAccountAndFacilityFinancialReportingDifferent(account, facility);
  }

  get isUsingAccountStaleness(): boolean {
    return this.stalenessForm?.controls['useAccountSettings']?.value === true;
  }

  get backupRoute(): Array<string> {
    const account = this.account();
    const facility = this.facility();
    return account && facility ? ['/data-management', account.guid, 'facilities', facility.guid] : ['/p1'];
  }

  secondNaicsOptions(parentCode: string | undefined): NAICS[] {
    return parentCode ? SecondNaicsList.filter(item => item.matchNum === parentCode) : [];
  }

  thirdNaicsOptions(parentCode: string | undefined): NAICS[] {
    return parentCode ? ThirdNaicsList.filter(item => item.matchNum === parentCode) : [];
  }

  async saveProfile(): Promise<void> {
    if (!this.profileForm || this.profileForm.invalid) {
      this.profileForm?.markAllAsTouched();
      return;
    }
    await this.saveFacility('Saving facility information', facility => {
      const updated = this.settingsForms.updateFacilityFromGeneralInformationForm(this.profileForm, facility);
      updated.classification = this.profileForm.controls['classification'].value;
      return updated;
    });
  }

  checkNAICS(): void {
    const naics1 = this.profileForm.controls['naics1'].value;
    const naics2 = this.profileForm.controls['naics2'].value;
    const naics3 = this.profileForm.controls['naics3'].value;
    if (naics2 && !this.secondNaicsOptions(naics1).some(item => item.code === naics2)) {
      this.profileForm.controls['naics2'].patchValue(null);
      this.profileForm.controls['naics3'].patchValue(null);
    }
    if (naics3 && !this.thirdNaicsOptions(this.profileForm.controls['naics2'].value).some(item => item.code === naics3)) {
      this.profileForm.controls['naics3'].patchValue(null);
    }
    this.applyProfileControlAvailability(this.canWrite());
    void this.saveProfile();
  }

  formatPhone(event: Event): void {
    if (this.profileForm.controls['country'].value === 'US') {
      let input = (event.target as HTMLInputElement).value.replace(/\D/g, '');
      if (input.length > 3 && input.length <= 6) {
        input = input.replace(/(\d{3})(\d+)/, '$1-$2');
      } else if (input.length > 6) {
        input = input.replace(/(\d{3})(\d{3})(\d+)/, '$1-$2-$3');
      }
      this.profileForm.controls['contactPhone'].setValue(input.substring(0, 12), { emitEvent: false });
    }
    void this.saveProfile();
  }

  async setUnitsOfMeasure(): Promise<void> {
    this.unitsForm = this.settingsForms.setUnitsOfMeasure(this.unitsForm);
    this.applyFormAvailability(this.canWrite());
    await this.saveUnits();
  }

  async saveUnits(): Promise<void> {
    this.unitsForm = this.settingsForms.checkCustom(this.unitsForm);
    this.applyFormAvailability(this.canWrite());
    await this.saveFacility('Saving facility units', facility =>
      this.settingsForms.updateFacilityFromUnitsForm(this.unitsForm, facility)
    );
  }

  async useAccountUnits(): Promise<void> {
    const account = this.account();
    if (!account) {
      return;
    }
    this.unitsForm = this.settingsForms.setAccountUnits(this.unitsForm, account);
    await this.saveUnits();
  }

  async saveGoals(): Promise<void> {
    await this.saveFacility('Saving facility goals', facility => {
      const updated = this.settingsForms.updateFacilityFromSustainabilityQuestionsForm(this.goalsForm, facility);
      updated.isNewFacility = this.goalsForm.controls['isNewFacility'].value;
      return updated;
    });
  }

  async useAccountGoals(): Promise<void> {
    const account = this.account();
    if (!account) {
      return;
    }
    this.goalsForm = this.settingsForms.setAccountSustainQuestions(this.goalsForm, account);
    await this.saveGoals();
  }

  async changeBaselineYear(baselineControl: string, targetControl: string): Promise<void> {
    const baseline = Number(this.goalsForm.controls[baselineControl].value);
    this.goalsForm.controls[targetControl].patchValue(Math.min(baseline + 10, 2050));
    await this.saveGoals();
  }

  async saveFinancial(): Promise<void> {
    await this.saveFacility('Saving facility financial reporting', facility =>
      this.settingsForms.updateFacilityFromFiscalForm(this.financialForm, facility)
    );
  }

  async useAccountFinancial(): Promise<void> {
    const account = this.account();
    if (!account) {
      return;
    }
    this.financialForm = this.settingsForms.setAccountFinancialReporting(this.financialForm, account);
    await this.saveFinancial();
  }

  async saveStaleness(): Promise<void> {
    const settings: DataStalenessSettings = {
      enabled: this.stalenessForm.controls['enabled'].value,
      thresholdMonths: this.stalenessForm.controls['thresholdMonths'].value as DataStalenessMonths,
      useAccountSettings: this.stalenessForm.controls['useAccountSettings'].value
    };
    await this.saveFacility('Saving facility staleness settings', facility => ({
      ...facility,
      dataStalenessSettings: settings
    }));
  }

  async onUseAccountStalenessChange(): Promise<void> {
    const accountSettings = this.account()?.dataStalenessSettings;
    if (this.stalenessForm.controls['useAccountSettings'].value && accountSettings) {
      this.stalenessForm.controls['enabled'].patchValue(accountSettings.enabled);
      this.stalenessForm.controls['thresholdMonths'].patchValue(accountSettings.thresholdMonths);
    }
    this.applyStalenessControlAvailability(this.canWrite());
    await this.saveStaleness();
  }

  private buildForms(facility: IdbFacility): void {
    this.profileForm = this.settingsForms.getGeneralInformationForm(facility);
    this.profileForm.addControl('classification', new FormControl(facility.classification || 'Manufacturing'));
    this.unitsForm = this.settingsForms.getUnitsForm(facility);
    this.goalsForm = this.settingsForms.getSustainabilityQuestionsForm(facility);
    this.goalsForm.addControl('isNewFacility', new FormControl(!!facility.isNewFacility));
    this.financialForm = this.settingsForms.getFiscalYearForm(facility);
    this.stalenessForm = this.getStalenessForm(facility.dataStalenessSettings);
    this.subregionOptions = this.getSubregionOptions(facility.zip);
    this.ensureSelectedSubregion(this.unitsForm);
    this.applyFormAvailability(untracked(() => this.canWrite()));
  }

  private getStalenessForm(settings: DataStalenessSettings | undefined): FormGroup {
    return new FormGroup({
      enabled: new FormControl(settings?.enabled ?? true),
      thresholdMonths: new FormControl(settings?.thresholdMonths ?? DEFAULT_DATA_STALENESS_MONTHS),
      useAccountSettings: new FormControl(settings?.useAccountSettings ?? true)
    });
  }

  private ensureSelectedSubregion(form: FormGroup): void {
    const current = form.controls['eGridSubregion'].value;
    if (!current || !this.subregionOptions.includes(current)) {
      form.controls['eGridSubregion'].patchValue(this.subregionOptions[0], { emitEvent: false });
    }
  }

  private getSubregionOptions(zip: string | undefined): string[] {
    const options = ['US Average'];
    if (zip && zip.length === 5) {
      const match = this.eGridService.subRegionsByZipcode.find(item => String(item.zip) === zip);
      match?.subregions.filter(Boolean).forEach(subregion => options.unshift(subregion));
    }
    this.workspace.customEmissions().forEach(item => options.push(item.subregion));
    return [...new Set(options)];
  }

  private applyFormAvailability(canWrite: boolean): void {
    [
      this.profileForm,
      this.unitsForm,
      this.goalsForm,
      this.financialForm,
      this.stalenessForm
    ].forEach(form => this.setFormEnabled(form, canWrite));
    this.applyProfileControlAvailability(canWrite);
    this.applyStalenessControlAvailability(canWrite);
  }

  private applyProfileControlAvailability(canWrite: boolean): void {
    if (!this.profileForm) {
      return;
    }
    this.setControlEnabled(this.profileForm.controls['naics2'], canWrite && !!this.profileForm.controls['naics1'].value);
    this.setControlEnabled(this.profileForm.controls['naics3'], canWrite && !!this.profileForm.controls['naics2'].value);
  }

  private applyStalenessControlAvailability(canWrite: boolean): void {
    if (!this.stalenessForm) {
      return;
    }
    const useAccountSettings = this.stalenessForm.controls['useAccountSettings'].value === true;
    this.setControlEnabled(this.stalenessForm.controls['enabled'], canWrite && !useAccountSettings);
    this.setControlEnabled(this.stalenessForm.controls['thresholdMonths'], canWrite && !useAccountSettings);
  }

  private setFormEnabled(form: FormGroup | undefined, enabled: boolean): void {
    if (!form) {
      return;
    }
    if (enabled && form.disabled) {
      form.enable({ emitEvent: false });
    } else if (!enabled && form.enabled) {
      form.disable({ emitEvent: false });
    }
  }

  private setControlEnabled(control: AbstractControl | undefined, enabled: boolean): void {
    if (!control) {
      return;
    }
    if (enabled && control.disabled) {
      control.enable({ emitEvent: false });
    } else if (!enabled && control.enabled) {
      control.disable({ emitEvent: false });
    }
  }

  private async saveFacility(label: string, buildFacility: (facility: IdbFacility) => IdbFacility): Promise<void> {
    const facility = this.facility();
    const account = this.account();
    if (!facility || !account || !this.canWrite()) {
      return;
    }
    const updatedFacility = buildFacility(structuredClone(facility));
    await this.runSave(label, async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'facility',
          changeKind: 'update',
          entityGuid: updatedFacility.guid,
          label,
          publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilities', upsert: [value] }] }) }
        },
        () => this.facilityHandler.update({ ...updatedFacility }, account.guid)
      );
    });
  }

  private async runSave(label: string, save: () => Promise<void>): Promise<void> {
    this.isSaving = true;
    this.saveError = '';
    this.saveMessage = label;
    try {
      this.skipNextWorkspaceRefresh = true;
      await save();
      this.saveMessage = 'Saved';
    } catch (error) {
      this.skipNextWorkspaceRefresh = false;
      this.saveError = 'Changes could not be saved. Please try again.';
      console.warn('P1 facility settings save failed.', error);
    } finally {
      this.isSaving = false;
    }
  }
}
