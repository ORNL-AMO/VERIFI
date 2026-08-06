import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { Month, Months } from 'src/app/shared/form-data/months';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { SettingsFormsService } from '../settings-forms.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';

@Component({
  selector: 'app-financial-reporting-form',
  templateUrl: './financial-reporting-form.component.html',
  styleUrls: ['./financial-reporting-form.component.css'],
  standalone: false
})
export class FinancialReportingFormComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly applicationLifecycleService = inject(ApplicationLifecycleService);

  form: FormGroup;
  months: Array<Month> = Months;
  selectedAccountSub: Subscription;
  selectedAccount: IdbAccount;
  isFormChange: boolean = false;
  constructor(private accountDbService: AccountdbService, private settingsFormsService: SettingsFormsService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account).subscribe(account => {
      this.selectedAccount = account;
      if (account) {
        if (this.isFormChange == false) {
          this.form = this.settingsFormsService.getFiscalYearForm(account);
        } else {
          this.isFormChange = false;
        }
      }
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
  }

  async saveChanges() {
    this.isFormChange = true;
    this.selectedAccount = this.settingsFormsService.updateAccountFromFiscalForm(this.form, this.selectedAccount);
    const updatedAccount = await firstValueFrom(this.accountDbService.updateWithObservable({ ...this.selectedAccount }));
    const accountFacilities = this.accountWorkspaceStore.facilities().map(facility => ({ ...facility }));
    if (accountFacilities && accountFacilities.length > 0) {
      for (let i = 0; i < accountFacilities.length; i++) {
        accountFacilities[i].fiscalYear = updatedAccount.fiscalYear;
        accountFacilities[i].fiscalYearMonth = updatedAccount.fiscalYearMonth;
        accountFacilities[i].fiscalYearCalendarEnd = updatedAccount.fiscalYearCalendarEnd;
        await firstValueFrom(this.facilityDbService.updateWithObservable(accountFacilities[i]));
      }
    }
    await this.applicationLifecycleService.refreshAccountCatalog();
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
  }
}
