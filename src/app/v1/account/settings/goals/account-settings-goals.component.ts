import { Component, effect, inject, untracked } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { IdbAccount } from '@data/models/idbModels/account';
import { AccountSettingsFormService } from '@shared/settings-forms/account-settings-form.service';
import { AccountSettingsDetailBase } from '../account-settings-detail.base';

@Component({
  selector: 'app-account-settings-goals',
  templateUrl: './account-settings-goals.component.html',
  styleUrls: ['../account-settings.component.css'],
  host: { style: 'display: block;' },
  standalone: false
})
export class AccountSettingsGoalsComponent extends AccountSettingsDetailBase {
  private readonly settingsForms = inject(AccountSettingsFormService);

  readonly years = Array.from({ length: 50 }, (_, index) => 2050 - index);
  readonly assessmentReportVersions = ['AR4', 'AR5', 'AR6'];
  form: FormGroup;

  constructor() {
    super();
    effect(() => {
      const account = this.account();
      if (!account) {
        return;
      }
      if (this.skipNextWorkspaceRefresh) {
        this.skipNextWorkspaceRefresh = false;
        return;
      }
      this.buildForm(account);
    });
    effect(() => {
      this.applyFormAvailability(this.canWrite());
    });
  }

  scheduleGoalsSave(): void {
    this.scheduleSave(() => this.saveGoals());
  }

  flushGoalsSave(): void {
    this.flushSave(() => this.saveGoals());
  }

  async saveGoals(): Promise<void> {
    if (!this.form) {
      return;
    }
    this.applyFormAvailability(this.canWrite());
    await this.saveAccount('Saving goal settings', account =>
      this.settingsForms.updateAccountFromSustainabilityQuestionsForm(this.form, account)
    );
  }

  async changeBaselineYear(baselineControl: string, targetControl: string): Promise<void> {
    const baseline = Number(this.form.controls[baselineControl].value);
    this.form.controls[targetControl].patchValue(Math.min(baseline + 10, 2050));
    await this.saveGoals();
  }

  private buildForm(account: IdbAccount): void {
    this.form = this.settingsForms.getSustainabilityQuestionsForm(account);
    this.applyFormAvailability(untracked(() => this.canWrite()));
  }

  private applyFormAvailability(canWrite: boolean): void {
    this.setFormEnabled(this.form, canWrite);
    this.setGoalControlsEnabled('energy', canWrite && !!this.form?.controls['energyReductionGoal'].value);
    this.setGoalControlsEnabled('water', canWrite && !!this.form?.controls['waterReductionGoal'].value);
    this.setControlEnabled(
      this.form?.controls['assessmentReportVersion'],
      canWrite && !!this.form?.controls['displayEmissions'].value
    );
    this.setGoalControlsEnabled(
      'greenhouse',
      canWrite && !!this.form?.controls['displayEmissions'].value && !!this.form?.controls['greenhouseReductionGoal'].value
    );
  }

  private setGoalControlsEnabled(goal: 'energy' | 'water' | 'greenhouse', enabled: boolean): void {
    this.setControlsEnabled(this.form, [
      `${goal}ReductionPercent`,
      `${goal}ReductionBaselineYear`,
      `${goal}ReductionTargetYear`,
      `${goal}IsAbsolute`
    ], enabled);
  }
}
