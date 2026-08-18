import { Component, effect, inject, untracked } from '@angular/core';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { FacilityClassifications } from 'src/app/models/constantsAndTypes';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from 'src/app/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from 'src/app/account-workspace/handlers/facility-command-handler.service';
import { DATA_STALENESS_OPTIONS, DataStalenessMonths, DEFAULT_DATA_STALENESS_MONTHS } from 'src/app/calculations/status-check-calculations/statusCheckModels';
import { FACILITY_DELETION_MESSAGES } from 'src/app/indexedDB/facility-deletion.config';
import { DataStalenessSettings } from 'src/app/models/idbModels/accountAndFacility';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { Countries } from 'src/app/shared/form-data/countries';
import { Months } from 'src/app/shared/form-data/months';
import { FirstNaicsList, NAICS, SecondNaicsList, ThirdNaicsList } from 'src/app/shared/form-data/naics-data';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { SettingsFormsService } from 'src/app/shared/settings-forms/settings-forms.service';
import { EnergyUnitOptions, MassUnitOptions, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { P1RouteFacade } from '../../p1-route.facade';

interface P1SingleFacilitySettingsSaveResult {
  readonly facility: IdbFacility;
  readonly account?: IdbAccount;
}

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
  private readonly accountHandler = inject(AccountCommandHandler);
  private readonly facilityHandler = inject(FacilityCommandHandler);
  private readonly loadingService = inject(LoadingService);
  private readonly router = inject(Router);
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
  isDeletingFacility = false;
  showDeleteFacilityConfirm = false;
  isDeletingAccount = false;
  showDeleteAccountConfirm = false;
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
    if (this.facade.isSingleFacilityCompany()) {
      return account ? ['/data-management', account.guid, 'account-setup'] : ['/p1'];
    }
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
    }, account =>
      this.settingsForms.updateAccountFromGeneralInformationForm(this.profileForm, account)
    );
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
      this.settingsForms.updateFacilityFromUnitsForm(this.unitsForm, facility),
      account => this.settingsForms.updateAccountFromUnitsForm(this.unitsForm, account)
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
    }, account =>
      this.settingsForms.updateAccountFromSustainabilityQuestionsForm(this.goalsForm, account)
    );
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
      this.settingsForms.updateFacilityFromFiscalForm(this.financialForm, facility),
      account => this.settingsForms.updateAccountFromFiscalForm(this.financialForm, account)
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
    }), account => ({
      ...account,
      dataStalenessSettings: {
        enabled: settings.enabled,
        thresholdMonths: settings.thresholdMonths
      }
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

  openDeleteFacility(): void {
    if (!this.account() || !this.facility() || !this.canWrite() || this.isDeletingFacility) {
      return;
    }
    this.showDeleteFacilityConfirm = true;
    this.saveError = '';
  }

  openDeleteAccount(): void {
    if (!this.account() || !this.canWrite() || this.isDeletingAccount) {
      return;
    }
    this.showDeleteAccountConfirm = true;
    this.saveError = '';
  }

  cancelDeleteFacility(): void {
    if (this.isDeletingFacility) {
      return;
    }
    this.showDeleteFacilityConfirm = false;
  }

  cancelDeleteAccount(): void {
    if (this.isDeletingAccount) {
      return;
    }
    this.showDeleteAccountConfirm = false;
  }

  async confirmDeleteAccount(): Promise<void> {
    const account = this.account();
    if (!account || !this.canWrite() || this.isDeletingAccount) {
      return;
    }
    this.showDeleteAccountConfirm = false;
    this.isDeletingAccount = true;
    this.saveError = '';
    this.saveMessage = 'Deleting account';
    try {
      await this.commandBoundary.execute(
        {
          entityKind: 'account',
          changeKind: 'delete',
          entityGuid: account.guid,
          label: 'Deleting account',
          publication: { mode: 'patch', buildPatch: value => ({ account: value }) }
        },
        () => this.accountHandler.update({ ...account, deleteAccount: true }, account.guid)
      );
      await this.router.navigateByUrl('/p1');
    } catch (error) {
      this.saveMessage = '';
      this.saveError = 'Account could not be deleted. Please try again.';
      console.warn('P1 single-facility account delete failed.', error);
    } finally {
      this.isDeletingAccount = false;
    }
  }

  async confirmDeleteFacility(): Promise<void> {
    const account = this.account();
    const facility = this.facility();
    if (!account || !facility || !this.canWrite() || this.isDeletingFacility) {
      return;
    }
    this.showDeleteFacilityConfirm = false;
    this.isDeletingFacility = true;
    this.saveError = '';
    this.saveMessage = 'Deleting facility';
    this.loadingService.clearLoadingMessages();
    for (const message of FACILITY_DELETION_MESSAGES) {
      this.loadingService.addLoadingMessage(message);
    }
    this.loadingService.setCurrentLoadingIndex(0);
    this.loadingService.setContext(undefined);
    this.loadingService.setTitle('Deleting Facility');
    this.loadingService.setLoadingComplete(false);
    try {
      await this.commandBoundary.execute(
        { entityKind: 'facility', changeKind: 'delete', entityGuid: facility.guid, label: 'Deleting facility' },
        () => this.facilityHandler.delete(facility, account.guid, phase => {
          this.loadingService.setCurrentLoadingIndex(phase.index);
        })
      );
      this.loadingService.setLoadingComplete(true);
      this.saveMessage = 'Facility deleted';
      await this.router.navigate(['/p1', 'workspace', 'account', 'home', 'overview', this.facade.activePanelTab()]);
    } catch (error) {
      this.loadingService.clearLoadingMessages();
      this.loadingService.setLoadingComplete(false);
      this.loadingService.setTitle('');
      this.loadingService.setContext(undefined);
      this.saveMessage = '';
      this.saveError = 'Facility could not be deleted. Please try again.';
      console.warn('P1 facility delete failed.', error);
    } finally {
      this.isDeletingFacility = false;
    }
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

  private async saveFacility(
    label: string,
    buildFacility: (facility: IdbFacility) => IdbFacility,
    buildAccount?: (account: IdbAccount) => IdbAccount
  ): Promise<void> {
    const facility = this.facility();
    const account = this.account();
    if (!facility || !account || !this.canWrite()) {
      return;
    }
    const updatedFacility = buildFacility(structuredClone(facility));
    const updatedAccount = this.facade.isSingleFacilityCompany() && buildAccount
      ? buildAccount(structuredClone(account))
      : undefined;
    await this.runSave(label, async () => {
      await this.commandBoundary.execute(
        {
          entityKind: updatedAccount ? 'account' : 'facility',
          changeKind: 'update',
          entityGuid: updatedAccount?.guid ?? updatedFacility.guid,
          label,
          publication: {
            mode: 'patch',
            buildPatch: value => ({
              account: value.account,
              collections: [{ collection: 'facilities', upsert: [value.facility] }]
            })
          }
        },
        async (): Promise<P1SingleFacilitySettingsSaveResult> => {
          const savedAccount = updatedAccount
            ? await this.accountHandler.update({ ...updatedAccount }, account.guid)
            : undefined;
          const savedFacility = await this.facilityHandler.update({ ...updatedFacility }, account.guid);
          return {
            account: savedAccount,
            facility: savedFacility
          };
        }
      );
    });
  }

  private async runSave(label: string, save: () => Promise<void>): Promise<void> {
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
    }
  }
}
