import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';
import { getNewIdbAccount, IdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility, IdbFacility } from '@data/models/idbModels/facility';
import { Countries } from 'src/app/shared/form-data/countries';
import { FirstNaicsList, NAICS, SecondNaicsList, ThirdNaicsList } from 'src/app/shared/form-data/naics-data';
import { SettingsFormsService } from '@v0/shared/settings-forms/settings-forms.service';

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
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly facilityHandler = inject(FacilityCommandHandler);
  private readonly router = inject(Router);
  private readonly settingsForms = inject(SettingsFormsService);

  readonly countries = Countries;
  readonly firstNaicsList = FirstNaicsList;
  readonly profileForm: FormGroup = this.settingsForms.getGeneralInformationForm(getNewIdbAccount());
  readonly companyScaleForm = new FormGroup({
    isSingleFacilityCompany: new FormControl(true)
  });

  isCreating = false;
  createError = '';
  createdAccountGuid = '';

  get accountNameInvalid(): boolean {
    const nameControl = this.profileForm.controls['name'];
    return nameControl.hasError('required') && (nameControl.touched || nameControl.dirty);
  }

  get isSingleFacilityCompany(): boolean {
    return this.companyScaleForm.controls.isSingleFacilityCompany.value === true;
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
    this.createdAccountGuid = '';
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
      account.isSingleFacilityCompany = this.isSingleFacilityCompany;
      const createdAccount = await this.lifecycle.createAccount(account);
      this.createdAccountGuid = createdAccount.guid;

      if (!account.isSingleFacilityCompany) {
        await this.router.navigate(
          ['/p1', 'workspace', 'account', 'home', 'todo-list', 'todos'],
          { queryParams: { gettingStarted: 'new-account' } }
        );
        return;
      }

      const facility = this.createPrimaryFacilityFromAccount(createdAccount);

      const result = await this.commandBoundary.execute(
        { entityKind: 'facility', changeKind: 'add', entityGuid: facility.guid, label: 'Adding primary facility' },
        () => this.facilityHandler.add(
          facility,
          createdAccount.guid,
          this.workspace.accountAnalyses(),
          this.workspace.accountReports()
        )
      );

      await this.router.navigate([
        '/p1',
        'workspace',
        'facility',
        result.value.facility.guid,
        'home',
        'todo-list',
        'todos'
      ], { queryParams: { gettingStarted: 'new-account' } });
    } catch (error) {
      console.warn('P1 prototype could not create an account.', error);
      this.createError = this.createdAccountGuid
        ? 'Account was created, but the primary facility could not be created. Add a facility manually to continue setup.'
        : 'Account could not be created. Please try again.';
    } finally {
      this.isCreating = false;
    }
  }

  private createPrimaryFacilityFromAccount(account: IdbAccount): IdbFacility {
    const facility = getNewIdbFacility(account);
    return {
      ...facility,
      name: account.name,
      country: account.country,
      address: account.address,
      city: account.city,
      state: account.state,
      zip: account.zip,
      size: account.size,
      naics1: account.naics1,
      naics2: account.naics2,
      naics3: account.naics3,
      notes: account.notes,
      contactName: account.contactName,
      contactEmail: account.contactEmail,
      contactPhone: account.contactPhone
    };
  }
}
