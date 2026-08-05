import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { SettingsFormsService } from '../settings-forms.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';

@Component({
  selector: 'app-sustainability-questions-form',
  templateUrl: './sustainability-questions-form.component.html',
  styleUrls: ['./sustainability-questions-form.component.css'],
  standalone: false
})
export class SustainabilityQuestionsFormComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly dbChangesService = inject(DbChangesService);
  private readonly applicationLifecycleService = inject(ApplicationLifecycleService);
  @Input()
  inAccount: boolean;

  form: FormGroup;
  selectedFacilitySub: Subscription;
  selectedAccountSub: Subscription;
  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  sustainQuestionsDontMatchAccount: boolean;
  years: Array<number> = new Array();
  isFormChange: boolean = false;
  fiscalYearOption: "calendarYear" | "nonCalendarYear";
  constructor(private accountDbService: AccountdbService, private settingsFormsService: SettingsFormsService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account).subscribe(account => {
      this.selectedAccount = account;
      if (account && this.inAccount) {
        this.fiscalYearOption = account.fiscalYear;
        if (this.isFormChange == false) {
          this.form = this.settingsFormsService.getSustainabilityQuestionsForm(account);
          this.form.addControl('isBetterPlantsPartner', new FormControl(account.isBetterPlantsPartner))
        } else {
          this.isFormChange = false;
        }
      }
    });

    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility).subscribe(facility => {
      this.selectedFacility = facility;
      if (facility && !this.inAccount) {
        this.fiscalYearOption = facility.fiscalYear;
        this.sustainQuestionsDontMatchAccount = this.settingsFormsService.areAccountAndFacilitySustainQuestionsDifferent(this.selectedAccount, this.selectedFacility);
        if (this.isFormChange == false) {
          this.form = this.settingsFormsService.getSustainabilityQuestionsForm(facility);
        } else {
          this.isFormChange = false;
        }
      }
    });
    for (let i = 2050; i > 2000; i--) {
      this.years.push(i);
    }
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  async saveChanges() {
    this.isFormChange = true;
    if (!this.inAccount) {
      this.selectedFacility = this.settingsFormsService.updateFacilityFromSustainabilityQuestionsForm(this.form, this.selectedFacility);
      await this.dbChangesService.updateFacility({ ...this.selectedFacility });
    }
    if (this.inAccount) {
      this.selectedAccount = this.settingsFormsService.updateAccountFromSustainabilityQuestionsForm(this.form, this.selectedAccount);
      this.selectedAccount.isBetterPlantsPartner = this.form.controls['isBetterPlantsPartner'].value;
      await this.dbChangesService.updateAccount({ ...this.selectedAccount });
      await this.applicationLifecycleService.refreshAccountCatalog();
    }
  }

  setAccountSustainQuestions() {
    this.form = this.settingsFormsService.setAccountSustainQuestions(this.form, this.selectedAccount);
    this.saveChanges();
  }

  changeBaselineYear(baselineControlName: string, targetControlName: string) {
    let baselineValue: number = this.form.get(baselineControlName).value;
    let value: number = baselineValue + 10;
    if (value > 2050) {
      value = 2050;
    }
    this.form.get(targetControlName).patchValue(value);
    this.saveChanges();
  }
}
