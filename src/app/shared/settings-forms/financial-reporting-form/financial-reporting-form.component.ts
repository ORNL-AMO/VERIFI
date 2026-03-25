import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { Month, Months } from 'src/app/shared/form-data/months';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { SettingsFormsService } from '../settings-forms.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-financial-reporting-form',
  templateUrl: './financial-reporting-form.component.html',
  styleUrls: ['./financial-reporting-form.component.css'],
  standalone: false
})
export class FinancialReportingFormComponent implements OnInit {

  form: FormGroup;
  months: Array<Month> = Months;
  selectedAccountSub: Subscription;
  selectedAccount: IdbAccount;
  isFormChange: boolean = false;
  constructor(private accountDbService: AccountdbService, private settingsFormsService: SettingsFormsService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(account => {
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
    let updatedAccount: IdbAccount = await firstValueFrom(this.accountDbService.updateWithObservable(this.selectedAccount));
    let allAccounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
    this.accountDbService.selectedAccount.next(updatedAccount);
    this.accountDbService.allAccounts.next(allAccounts);
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (accountFacilities && accountFacilities.length > 0) {
      for (let i = 0; i < accountFacilities.length; i++) {
        accountFacilities[i].fiscalYear = updatedAccount.fiscalYear;
        accountFacilities[i].fiscalYearMonth = updatedAccount.fiscalYearMonth;
        accountFacilities[i].fiscalYearCalendarEnd = updatedAccount.fiscalYearCalendarEnd;
        await firstValueFrom(this.facilityDbService.updateWithObservable(accountFacilities[i]));
      }
    }
    this.facilityDbService.accountFacilities.next(accountFacilities);
  }
}
