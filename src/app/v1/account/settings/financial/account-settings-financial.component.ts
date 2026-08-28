import { Component, effect, inject, untracked } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { Months } from '@shared/form-data/months';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
import { AccountSettingsDetailBase } from '../account-settings-detail.base';

@Component({
  selector: 'app-account-settings-financial',
  templateUrl: './account-settings-financial.component.html',
  styleUrls: ['../account-settings.component.css'],
  host: { style: 'display: block;' },
  standalone: false
})
export class AccountSettingsFinancialComponent extends AccountSettingsDetailBase {
  private readonly settingsForms = inject(SettingsFormService);
  private readonly facilityHandler = inject(FacilityCommandHandler);

  readonly facilities = this.workspace.facilities;
  readonly months = Months;
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

  async saveFinancial(): Promise<void> {
    const account = this.account();
    if (!account || !this.canWrite() || !this.form) {
      return;
    }
    this.applyFormAvailability(this.canWrite());
    const updatedAccount = this.settingsForms.updateAccountFromFiscalForm(this.form, structuredClone(account));
    const activeAccountGuid = updatedAccount.guid;
    const updatedFacilities = this.facilities().map(facility =>
      this.settingsForms.updateFacilityFromFiscalForm(this.form, structuredClone(facility))
    );

    await this.runSave('Saving financial reporting settings', async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'account',
          changeKind: 'update',
          entityGuid: activeAccountGuid,
          label: 'Saving financial reporting settings',
          notification: { suppressSuccessToast: true },
          publication: {
            mode: 'patch',
            buildPatch: value => ({
              account: value.account,
              collections: [{ collection: 'facilities', upsert: value.facilities }]
            })
          }
        },
        async () => {
          const savedAccount = await this.accountHandler.update(updatedAccount, activeAccountGuid);
          for (const facility of updatedFacilities) {
            await this.facilityHandler.update(facility, activeAccountGuid);
          }
          return { account: savedAccount, facilities: updatedFacilities };
        }
      );
      await this.lifecycle.refreshAccountCatalog();
    });
  }

  private buildForm(account: IdbAccount): void {
    this.form = this.settingsForms.getFiscalYearForm(account);
    this.applyFormAvailability(untracked(() => this.canWrite()));
  }

  private applyFormAvailability(canWrite: boolean): void {
    this.setFormEnabled(this.form, canWrite);
    this.setControlsEnabled(
      this.form,
      ['fiscalYearMonth', 'fiscalYearCalendarEnd'],
      canWrite && this.form?.controls['fiscalYear'].value === 'nonCalendarYear'
    );
  }
}
