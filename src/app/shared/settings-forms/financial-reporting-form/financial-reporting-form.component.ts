import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Month, Months } from 'src/app/shared/form-data/months';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { SettingsFormsService } from '../settings-forms.service';
import { SetupWizardService } from 'src/app/setup-wizard/setup-wizard.service';

@Component({
  selector: 'app-financial-reporting-form',
  templateUrl: './financial-reporting-form.component.html',
  styleUrls: ['./financial-reporting-form.component.css']
})
export class FinancialReportingFormComponent implements OnInit {
  @Input()
  inAccount: boolean;
  @Input()
  inWizard: boolean;

  form: FormGroup;
  months: Array<Month> = Months;
  selectedFacilitySub: Subscription;
  selectedAccountSub: Subscription;
  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  financialReportingDoestMatchAccount: boolean;
  isFormChange: boolean = false;
  constructor(private accountDbService: AccountdbService, private settingsFormsService: SettingsFormsService, private facilityDbService: FacilitydbService,
    private setupWizardService: SetupWizardService) { }

  ngOnInit(): void {
    if (!this.inWizard) {
      this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(account => {
        this.selectedAccount = account;
        if (account && this.inAccount) {
          if (this.isFormChange == false) {
            this.form = this.settingsFormsService.getFiscalYearForm(account);
          } else {
            this.isFormChange = false;
          }
        }
      });


      this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
        this.selectedFacility = facility;
        if (facility && !this.inAccount) {
          this.financialReportingDoestMatchAccount = this.settingsFormsService.areAccountAndFacilityFinancialReportingDifferent(this.selectedAccount, this.selectedFacility);
          if (this.isFormChange == false) {
            this.form = this.settingsFormsService.getFiscalYearForm(facility);
          } else {
            this.isFormChange = false;
          }
        }
      });
    } else {
      this.selectedAccountSub = this.setupWizardService.account.subscribe(account => {
        this.selectedAccount = account;
        if (account && this.inAccount) {
          if (this.isFormChange == false) {
            this.form = this.settingsFormsService.getFiscalYearForm(account);
          } else {
            this.isFormChange = false;
          }
        }
      });


      this.selectedFacilitySub = this.setupWizardService.selectedFacility.subscribe(facility => {
        this.selectedFacility = facility;
        if (facility && !this.inAccount) {
          this.financialReportingDoestMatchAccount = this.settingsFormsService.areAccountAndFacilityFinancialReportingDifferent(this.selectedAccount, this.selectedFacility);
          if (this.isFormChange == false) {
            this.form = this.settingsFormsService.getFiscalYearForm(facility);
          } else {
            this.isFormChange = false;
          }
        }
      });
    }
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  async saveChanges() {
    this.isFormChange = true;
    if (!this.inWizard) {
      if (!this.inAccount) {
        this.selectedFacility = this.settingsFormsService.updateFacilityFromFiscalForm(this.form, this.selectedFacility);
        let updatedFacility: IdbFacility = await this.facilityDbService.updateWithObservable(this.selectedFacility).toPromise();
        let allFacilities: Array<IdbFacility> = await this.facilityDbService.getAll().toPromise();
        this.facilityDbService.selectedFacility.next(updatedFacility);
        let accountFacilities: Array<IdbFacility> = allFacilities.filter(facility => { return facility.accountId == this.selectedFacility.accountId });
        this.facilityDbService.accountFacilities.next(accountFacilities);
      }
      if (this.inAccount) {
        this.selectedAccount = this.settingsFormsService.updateAccountFromFiscalForm(this.form, this.selectedAccount);
        let updatedAccount: IdbAccount = await this.accountDbService.updateWithObservable(this.selectedAccount).toPromise();
        let allAccounts: Array<IdbAccount> = await this.accountDbService.getAll().toPromise();
        this.accountDbService.selectedAccount.next(updatedAccount);
        this.accountDbService.allAccounts.next(allAccounts);
      }
    } else {
      if (!this.inAccount) {
        this.selectedFacility = this.settingsFormsService.updateFacilityFromFiscalForm(this.form, this.selectedFacility);
        this.setupWizardService.selectedFacility.next(this.selectedFacility);
      }
      if (this.inAccount) {
        this.selectedAccount = this.settingsFormsService.updateAccountFromFiscalForm(this.form, this.selectedAccount);
        this.setupWizardService.account.next(this.selectedAccount);
      }
    }
  }

  setAccountFinancialReporting() {
    this.form = this.settingsFormsService.setAccountFinancialReporting(this.form, this.selectedAccount);
    this.saveChanges();
  }
}
