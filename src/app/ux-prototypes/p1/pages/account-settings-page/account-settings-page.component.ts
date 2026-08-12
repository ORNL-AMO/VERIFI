import { Component, effect, inject, untracked } from '@angular/core';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';
import { AccountCommandHandler } from 'src/app/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from 'src/app/account-workspace/handlers/facility-command-handler.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';
import { DATA_STALENESS_OPTIONS, DataStalenessMonths, DEFAULT_DATA_STALENESS_MONTHS } from 'src/app/calculations/status-check-calculations/statusCheckModels';
import { DataStalenessSettings } from 'src/app/models/idbModels/accountAndFacility';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { Countries } from 'src/app/shared/form-data/countries';
import { Months } from 'src/app/shared/form-data/months';
import { FirstNaicsList, NAICS, SecondNaicsList, ThirdNaicsList } from 'src/app/shared/form-data/naics-data';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { SettingsFormsService } from 'src/app/shared/settings-forms/settings-forms.service';
import { EnergyUnitOptions, MassUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { P1RouteFacade } from '../../p1-route.facade';

@Component({
  selector: 'app-p1-account-settings-page',
  templateUrl: './account-settings-page.component.html',
  styleUrls: [
    '../../components/workspace-main/workspace-main.component.css',
    './account-settings-page.component.css'
  ],
  standalone: false
})
export class P1AccountSettingsPageComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly accountHandler = inject(AccountCommandHandler);
  private readonly facilityHandler = inject(FacilityCommandHandler);
  private readonly lifecycle = inject(ApplicationLifecycleService);
  private readonly settingsForms = inject(SettingsFormsService);
  private readonly eGridService = inject(EGridService);
  readonly facade = inject(P1RouteFacade);
  readonly page = this;

  readonly account = this.workspace.account;
  readonly canWrite = this.workspace.canWrite;
  readonly countries = Countries;
  readonly months = Months;
  readonly firstNaicsList = FirstNaicsList;
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
      const account = this.account();
      if (!account) {
        return;
      }
      if (this.skipNextWorkspaceRefresh) {
        this.skipNextWorkspaceRefresh = false;
        return;
      }
      this.buildForms(account);
    });
    effect(() => {
      this.applyFormAvailability(this.canWrite());
    });
  }

  get activeDetail(): string {
    return this.facade.activeDetailId();
  }

  get backupRoute(): Array<string> {
    const account = this.account();
    return account ? ['/data-management', account.guid, 'account-setup'] : ['/p1'];
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
    await this.saveAccount('Saving corporate information', account =>
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
    this.applyUnitsControlAvailability(this.canWrite());
    await this.saveUnits();
  }

  async saveUnits(): Promise<void> {
    this.unitsForm = this.settingsForms.checkCustom(this.unitsForm);
    this.applyUnitsControlAvailability(this.canWrite());
    await this.saveAccount('Saving account units', account => {
      const updated = this.settingsForms.updateAccountFromUnitsForm(this.unitsForm, account);
      updated.assessmentReportVersion = this.unitsForm.controls['assessmentReportVersion'].value;
      updated.displayEmissions = this.unitsForm.controls['displayEmissions'].value;
      return updated;
    });
  }

  async saveGoals(): Promise<void> {
    await this.saveAccount('Saving reduction goals', account => {
      const updated = this.settingsForms.updateAccountFromSustainabilityQuestionsForm(this.goalsForm, account);
      updated.isBetterPlantsPartner = this.goalsForm.controls['isBetterPlantsPartner'].value;
      return updated;
    });
  }

  async changeBaselineYear(baselineControl: string, targetControl: string): Promise<void> {
    const baseline = Number(this.goalsForm.controls[baselineControl].value);
    this.goalsForm.controls[targetControl].patchValue(Math.min(baseline + 10, 2050));
    await this.saveGoals();
  }

  async saveFinancial(): Promise<void> {
    const account = this.account();
    if (!account || !this.canWrite()) {
      return;
    }
    const updatedAccount = this.settingsForms.updateAccountFromFiscalForm(this.financialForm, structuredClone(account));
    const activeAccountGuid = updatedAccount.guid;
    const updatedFacilities: IdbFacility[] = this.workspace.facilities().map(facility => ({
      ...structuredClone(facility),
      fiscalYear: updatedAccount.fiscalYear,
      fiscalYearMonth: updatedAccount.fiscalYearMonth,
      fiscalYearCalendarEnd: updatedAccount.fiscalYearCalendarEnd
    }));
    await this.runSave('Saving financial reporting settings', async () => {
      await this.commandBoundary.execute(
        { entityKind: 'account', changeKind: 'update', entityGuid: activeAccountGuid, label: 'Saving financial reporting settings' },
        async () => {
          const savedAccount = await this.accountHandler.update(updatedAccount, activeAccountGuid);
          for (const facility of updatedFacilities) {
            await this.facilityHandler.update(facility, activeAccountGuid);
          }
          return savedAccount;
        }
      );
      await this.lifecycle.refreshAccountCatalog();
    });
  }

  async saveStaleness(): Promise<void> {
    const settings: DataStalenessSettings = {
      enabled: this.stalenessForm.controls['enabled'].value,
      thresholdMonths: this.stalenessForm.controls['thresholdMonths'].value as DataStalenessMonths
    };
    await this.saveAccount('Saving staleness settings', account => ({
      ...account,
      dataStalenessSettings: settings
    }));
  }

  private buildForms(account: IdbAccount): void {
    this.profileForm = this.settingsForms.getGeneralInformationForm(account);
    this.unitsForm = this.settingsForms.getUnitsForm(account);
    this.unitsForm.addControl('assessmentReportVersion', new FormControl(account.assessmentReportVersion || 'AR6'));
    this.unitsForm.addControl('displayEmissions', new FormControl(!!account.displayEmissions));
    this.goalsForm = this.settingsForms.getSustainabilityQuestionsForm(account);
    this.goalsForm.addControl('isBetterPlantsPartner', new FormControl(!!account.isBetterPlantsPartner));
    this.financialForm = this.settingsForms.getFiscalYearForm(account);
    this.stalenessForm = this.getStalenessForm(account.dataStalenessSettings);
    this.subregionOptions = this.getSubregionOptions(account.zip);
    this.ensureSelectedSubregion(this.unitsForm);
    this.applyFormAvailability(untracked(() => this.canWrite()));
  }

  private getStalenessForm(settings: DataStalenessSettings | undefined): FormGroup {
    return new FormGroup({
      enabled: new FormControl(settings?.enabled ?? true),
      thresholdMonths: new FormControl(settings?.thresholdMonths ?? DEFAULT_DATA_STALENESS_MONTHS)
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
    this.applyUnitsControlAvailability(canWrite);
  }

  private applyProfileControlAvailability(canWrite: boolean): void {
    if (!this.profileForm) {
      return;
    }
    this.setControlEnabled(this.profileForm.controls['naics2'], canWrite && !!this.profileForm.controls['naics1'].value);
    this.setControlEnabled(this.profileForm.controls['naics3'], canWrite && !!this.profileForm.controls['naics2'].value);
  }

  private applyUnitsControlAvailability(canWrite: boolean): void {
    if (!this.unitsForm) {
      return;
    }
    this.setControlEnabled(
      this.unitsForm.controls['assessmentReportVersion'],
      canWrite && !!this.unitsForm.controls['displayEmissions'].value
    );
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

  private async saveAccount(label: string, buildAccount: (account: IdbAccount) => IdbAccount): Promise<void> {
    const account = this.account();
    if (!account || !this.canWrite()) {
      return;
    }
    const updatedAccount = buildAccount(structuredClone(account));
    await this.runSave(label, async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'account',
          changeKind: 'update',
          entityGuid: updatedAccount.guid,
          label,
          publication: { mode: 'patch', buildPatch: value => ({ account: value }) }
        },
        () => this.accountHandler.update({ ...updatedAccount }, updatedAccount.guid)
      );
      await this.lifecycle.refreshAccountCatalog();
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
      console.warn('P1 account settings save failed.', error);
    } finally {
      this.isSaving = false;
    }
  }
}
