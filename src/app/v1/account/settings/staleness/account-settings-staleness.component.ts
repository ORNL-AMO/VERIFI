import { Component, effect, inject, untracked } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { IdbAccount } from '@data/models/idbModels/account';
import { DATA_STALENESS_OPTIONS } from '@domain/calculations/status-check-calculations/statusCheckModels';
import { AccountSettingsFormService } from '@shared/settings-forms/account-settings-form.service';
import { AccountSettingsDetailBase } from '../account-settings-detail.base';

@Component({
  selector: 'app-account-settings-staleness',
  templateUrl: './account-settings-staleness.component.html',
  styleUrls: ['../account-settings.component.css'],
  host: { style: 'display: block;' },
  standalone: false
})
export class AccountSettingsStalenessComponent extends AccountSettingsDetailBase {
  private readonly settingsForms = inject(AccountSettingsFormService);

  readonly stalenessOptions = DATA_STALENESS_OPTIONS;
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

  async saveStaleness(): Promise<void> {
    if (!this.form) {
      return;
    }
    this.applyFormAvailability(this.canWrite());
    await this.saveAccount('Saving data staleness settings', account =>
      this.settingsForms.updateAccountFromStalenessForm(this.form, account)
    );
  }

  private buildForm(account: IdbAccount): void {
    this.form = this.settingsForms.getStalenessForm(account.dataStalenessSettings);
    this.applyFormAvailability(untracked(() => this.canWrite()));
  }

  private applyFormAvailability(canWrite: boolean): void {
    this.setFormEnabled(this.form, canWrite);
    this.setControlEnabled(
      this.form?.controls['thresholdMonths'],
      canWrite && !!this.form?.controls['enabled'].value
    );
  }
}
