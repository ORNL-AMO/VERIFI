import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';
import { getNewIdbAccount } from 'src/app/models/idbModels/account';
import { Countries } from 'src/app/shared/form-data/countries';
import { FirstNaicsList, NAICS, SecondNaicsList, ThirdNaicsList } from 'src/app/shared/form-data/naics-data';
import { SettingsFormsService } from 'src/app/shared/settings-forms/settings-forms.service';

@Component({
  selector: 'app-p1-create-account-drawer',
  templateUrl: './create-account-drawer.component.html',
  styleUrls: [
    '../../../pages/account-settings-page/account-settings-page.component.css',
    './create-account-drawer.component.css'
  ],
  standalone: false
})
export class P1CreateAccountDrawerComponent {
  @Output() closed = new EventEmitter<void>();

  private readonly lifecycle = inject(ApplicationLifecycleService);
  private readonly router = inject(Router);
  private readonly settingsForms = inject(SettingsFormsService);

  readonly countries = Countries;
  readonly firstNaicsList = FirstNaicsList;
  readonly profileForm: FormGroup = this.settingsForms.getGeneralInformationForm(getNewIdbAccount());

  isCreating = false;
  createError = '';

  get accountNameInvalid(): boolean {
    const nameControl = this.profileForm.controls['name'];
    return nameControl.hasError('required') && (nameControl.touched || nameControl.dirty);
  }

  close(): void {
    if (this.isCreating) {
      return;
    }
    this.closed.emit();
  }

  secondNaicsOptions(parentCode: string | undefined): NAICS[] {
    return parentCode ? SecondNaicsList.filter(item => item.matchNum === parentCode) : [];
  }

  thirdNaicsOptions(parentCode: string | undefined): NAICS[] {
    return parentCode ? ThirdNaicsList.filter(item => item.matchNum === parentCode) : [];
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
  }

  async createAccount(): Promise<void> {
    if (this.isCreating) {
      return;
    }
    this.createError = '';
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isCreating = true;
    try {
      const account = this.settingsForms.updateAccountFromGeneralInformationForm(
        this.profileForm,
        structuredClone(getNewIdbAccount())
      );
      await this.lifecycle.createAccount(account);
      await this.router.navigateByUrl('/p1/workspace/account/settings/profile/help');
    } catch (error) {
      console.warn('P1 prototype could not create an account.', error);
      this.createError = 'Account could not be created. Please try again.';
    } finally {
      this.isCreating = false;
    }
  }
}
