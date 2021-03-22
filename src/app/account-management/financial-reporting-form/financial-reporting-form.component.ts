import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { globalVariables } from 'src/environments/environment';
import { AccountManagementService } from '../account-management.service';

@Component({
  selector: 'app-financial-reporting-form',
  templateUrl: './financial-reporting-form.component.html',
  styleUrls: ['./financial-reporting-form.component.css']
})
export class FinancialReportingFormComponent implements OnInit {
  @Input()
  inAccount: boolean;

  form: FormGroup;
  globalVariables = globalVariables;
  selectedFacilitySub: Subscription;
  selectedAccountSub: Subscription;
  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  financialReportingDoestMatchAccount: boolean;
  constructor(private accountDbService: AccountdbService, private accountManagementService: AccountManagementService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.selectedAccount = account;
      if (account && this.inAccount) {
        this.form = this.accountManagementService.getFiscalYearForm(account);
      }
    });


    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
      if (facility && !this.inAccount) {
        this.financialReportingDoestMatchAccount = this.accountManagementService.areAccountAndFacilityFinancialReportingDifferent(this.selectedAccount, this.selectedFacility);
        this.form = this.accountManagementService.getFiscalYearForm(facility);
      }
    });
  }

  ngOnDestroy(){
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  saveChanges(){
    if(!this.inAccount){
      this.selectedFacility = this.accountManagementService.updateFacilityFromFiscalForm(this.form, this.selectedFacility);
      this.facilityDbService.update(this.selectedFacility);
    }
    if(this.inAccount){
      this.selectedAccount = this.accountManagementService.updateAccountFromFiscalForm(this.form, this.selectedAccount);
      this.accountDbService.update(this.selectedAccount);
    }
  }

  setAccountFinancialReporting(){
    this.form = this.accountManagementService.setAccountFinancialReporting(this.form, this.selectedAccount);
    this.saveChanges();
  }
}
