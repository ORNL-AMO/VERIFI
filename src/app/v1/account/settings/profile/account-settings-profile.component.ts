import { Component, effect, inject, untracked } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Countries } from '@shared/form-data/countries';
import { FirstNaicsList, NAICS, SecondNaicsList, ThirdNaicsList } from '@shared/form-data/naics-data';
import { AccountSettingsFormService } from '@shared/settings-forms/account-settings-form.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { AccountSettingsDetailBase } from '../account-settings-detail.base';

@Component({
  selector: 'app-account-settings-profile',
  templateUrl: './account-settings-profile.component.html',
  styleUrls: ['../account-settings.component.css'],
  host: { style: 'display: block;' },
  standalone: false
})
export class AccountSettingsProfileComponent extends AccountSettingsDetailBase {
  private readonly settingsForms = inject(AccountSettingsFormService);

  readonly countries = Countries;
  readonly firstNaicsList = FirstNaicsList;
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

  secondNaicsOptions(parentCode: string | undefined): NAICS[] {
    return parentCode ? SecondNaicsList.filter(item => item.matchNum === parentCode) : [];
  }

  thirdNaicsOptions(parentCode: string | undefined): NAICS[] {
    return parentCode ? ThirdNaicsList.filter(item => item.matchNum === parentCode) : [];
  }

  scheduleProfileSave(): void {
    this.scheduleSave(() => this.saveProfile());
  }

  flushProfileSave(): void {
    this.flushSave(() => this.saveProfile());
  }

  async saveProfile(): Promise<void> {
    this.normalizeRequiredProfileText();
    if (!this.form || this.form.invalid) {
      this.form?.markAllAsTouched();
      return;
    }
    await this.saveAccount('Saving profile settings', account =>
      this.settingsForms.updateAccountFromGeneralInformationForm(this.form, account)
    );
  }

  checkNAICS(): void {
    const naics1 = this.form.controls['naics1'].value;
    const naics2 = this.form.controls['naics2'].value;
    const naics3 = this.form.controls['naics3'].value;
    if (naics2 && !this.secondNaicsOptions(naics1).some(item => item.code === naics2)) {
      this.form.controls['naics2'].patchValue(null);
      this.form.controls['naics3'].patchValue(null);
    }
    if (naics3 && !this.thirdNaicsOptions(this.form.controls['naics2'].value).some(item => item.code === naics3)) {
      this.form.controls['naics3'].patchValue(null);
    }
    this.applyFormAvailability(this.canWrite());
    void this.saveProfile();
  }

  formatPhone(event: Event): void {
    if (this.form.controls['country'].value === 'US') {
      let input = (event.target as HTMLInputElement).value.replace(/\D/g, '');
      if (input.length > 3 && input.length <= 6) {
        input = input.replace(/(\d{3})(\d+)/, '$1-$2');
      } else if (input.length > 6) {
        input = input.replace(/(\d{3})(\d{3})(\d+)/, '$1-$2-$3');
      }
      this.form.controls['contactPhone'].setValue(input.substring(0, 12), { emitEvent: false });
    }
    this.scheduleProfileSave();
  }

  private buildForm(account: IdbAccount): void {
    this.form = this.settingsForms.getGeneralInformationForm(account);
    this.applyFormAvailability(untracked(() => this.canWrite()));
  }

  private normalizeRequiredProfileText(): void {
    if (!this.form) {
      return;
    }
    const nameControl = this.form.controls['name'];
    const trimmedName = String(nameControl.value || '').trim();
    if (nameControl.value !== trimmedName) {
      nameControl.setValue(trimmedName, { emitEvent: false });
    }
  }

  private applyFormAvailability(canWrite: boolean): void {
    this.setFormEnabled(this.form, canWrite);
    this.setControlEnabled(this.form?.controls['naics2'], canWrite && !!this.form?.controls['naics1'].value);
    this.setControlEnabled(this.form?.controls['naics3'], canWrite && !!this.form?.controls['naics2'].value);
  }
}
