import { Component, SimpleChanges } from '@angular/core';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountReportsService } from '../../account-reports.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-goal-completion-setup',
  standalone: false,

  templateUrl: './goal-completion-setup.component.html',
  styleUrl: './goal-completion-setup.component.css'
})
export class GoalCompletionSetupComponent {
  goalCompletionForm: FormGroup;
  account: IdbAccount;
  accountAnalysisItems: Array<IdbAccountAnalysisItem>;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  itemToEdit: IdbAccountAnalysisItem;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  baselineYearWarning: string;
  baselineYears: Array<number>;

  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private calanderizationService: CalanderizationService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router) {
  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      if (!this.isFormChange) {
        this.goalCompletionForm = this.accountReportsService.getGoalCompletionFormFromReport(val.goalCompletionReportSetup);
        console.log('goalCompletionForm', this.goalCompletionForm);
        this.setAnalysisOptions(val);
      } else {
        this.isFormChange = false;
      }
    });
    this.setYearOptions();
  }

  ngOnDestroy() {
    this.selectedReportSub.unsubscribe();
  }

  get energyIntensityChangeArray(): FormArray {
    return this.goalCompletionForm.get('energyIntensityChangeArray') as FormArray;
  }

  async save() {
    this.isFormChange = true;
    this.setSelectedAnalysisItem();
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    selectedReport.goalCompletionReportSetup = this.accountReportsService.updateGoalCompletionReportFromForm(selectedReport.goalCompletionReportSetup, this.goalCompletionForm);
    if (this.selectedAnalysisItem) {
      selectedReport.baselineYear = this.selectedAnalysisItem.baselineYear;
    }
    await firstValueFrom(this.accountReportDbService.updateWithObservable(selectedReport));
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  addRow() {
    this.accountReportsService.addEnergyIntensityChangeRow(this.goalCompletionForm);
    this.goalCompletionForm.markAsDirty();
  }

  deleteRow(index: number) {
    this.energyIntensityChangeArray.removeAt(index);
    this.save();
    this.goalCompletionForm.markAsDirty();
  }

  setAnalysisOptions(report: IdbAccountReport) {
    let analysisOptions: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.accountAnalysisItems = analysisOptions.filter(option => { return option.reportYear == report.reportYear && option.energyIsSource });
    this.setSelectedAnalysisItem();
    if (!this.selectedAnalysisItem) {
      this.goalCompletionForm.controls.analysisItemId.patchValue(undefined);
      this.goalCompletionForm.controls.analysisItemId.updateValueAndValidity();
      this.save();
    }
  }

  viewAnalysis(analysisItem: IdbAccountAnalysisItem) {
    this.itemToEdit = analysisItem;
  }

  confirmEditItem() {
    this.accountAnalysisDbService.selectedAnalysisItem.next(this.itemToEdit);
    this.router.navigateByUrl('/data-evaluation/account/analysis/results/annual-analysis');
  }

  cancelEditItem() {
    this.itemToEdit = undefined;
  }

  setSelectedAnalysisItem() {
    this.selectedAnalysisItem = this.accountAnalysisItems.find(item => { return item.guid == this.goalCompletionForm.controls.analysisItemId.value });
    this.setBaselineYearWarning();
  }

  setBaselineYearWarning() {
    this.baselineYearWarning = undefined;
    if (this.selectedAnalysisItem && this.selectedAnalysisItem.analysisCategory == 'water') {
      if (this.selectedAnalysisItem.baselineYear && this.account.sustainabilityQuestions.waterReductionGoal && this.account.sustainabilityQuestions.waterReductionBaselineYear != this.selectedAnalysisItem.baselineYear) {
        this.baselineYearWarning = "This baseline year does not match your corporate baseline year."
      } else {
        this.baselineYearWarning = undefined;
      }
    } else if (this.selectedAnalysisItem && this.selectedAnalysisItem.analysisCategory == 'energy') {
      if (this.selectedAnalysisItem.baselineYear && this.account.sustainabilityQuestions.energyReductionGoal && this.account.sustainabilityQuestions.energyReductionBaselineYear != this.selectedAnalysisItem.baselineYear) {
        this.baselineYearWarning = "This baseline year does not match your corporate baseline year."
      } else {
        this.baselineYearWarning = undefined;
      }
    } else {
      this.baselineYearWarning = undefined;
    }
  }

  setYearOptions() {
    let yearOptions: Array<number> = this.calanderizationService.getYearOptionsAccount('all');
    this.baselineYears = yearOptions;
  }

}
