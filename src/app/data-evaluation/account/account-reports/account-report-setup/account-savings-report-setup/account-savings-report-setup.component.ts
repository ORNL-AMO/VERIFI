import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountReportsService } from '../../account-reports.service';
import { AccountSavingsReportSetup } from 'src/app/models/overview-report';
import { AnalysisTableColumns } from 'src/app/models/analysis';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';

@Component({
  selector: 'app-account-savings-report-setup',
  standalone: false,

  templateUrl: './account-savings-report-setup.component.html',
  styleUrl: './account-savings-report-setup.component.css'
})
export class AccountSavingsReportSetupComponent {
  accountSavingsReportForm: FormGroup;
  account: IdbAccount;
  analysisOptions: Array<IdbAccountAnalysisItem>
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  reportSetup: AccountSavingsReportSetup;
  numberOfPerformerOptions: Array<number> = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  analysisTableColumns: AnalysisTableColumns;
  energyColumnLabel: string;
  actualUseLabel: string;

  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private analysisService: AnalysisService,
    private accountAnalysisDbService: AccountAnalysisDbService) {
  }


  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.analysisTableColumns = this.analysisService.analysisTableColumns.getValue();
    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      if (!this.isFormChange) {
        this.accountSavingsReportForm = this.accountReportsService.getAccountSavingsFormFromReport(val.accountSavingsReportSetup);
        this.reportSetup = val.accountSavingsReportSetup;
        this.setAnalysisOptions();
      } else {
        this.isFormChange = false;
      }
    });
  }

  ngOnDestroy() {
    this.selectedReportSub.unsubscribe();
  }

  setLabels() {
    if (this.selectedAnalysisItem) {
      if (this.selectedAnalysisItem.analysisCategory == 'water') {
        this.actualUseLabel = 'Actual Consumption';
        this.energyColumnLabel = 'Consumption Columns';
      } else if (this.selectedAnalysisItem.analysisCategory == 'energy') {
        this.actualUseLabel = 'Actual Energy Use';
        this.energyColumnLabel = 'Energy Columns';
      }
    }
  }

  async save() {
    this.isFormChange = true;
    this.setEnergyColumns();
    this.setMonthIncrementalImprovement();

    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    selectedReport.accountSavingsReportSetup = this.accountReportsService.updateAccountSavingsReportFromForm(selectedReport.accountSavingsReportSetup, this.accountSavingsReportForm);
    await firstValueFrom(this.accountReportDbService.updateWithObservable(selectedReport));
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  setAnalysisOptions() {
    this.analysisOptions = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.setSelectedAnalysisItem(true);
    if (!this.selectedAnalysisItem) {
      this.accountSavingsReportForm.controls.analysisItemId.patchValue(undefined);
      this.accountSavingsReportForm.controls.analysisItemId.updateValueAndValidity();
      this.save();
    }
  }

  async setSelectedAnalysisItem(onInit: boolean) {
    this.selectedAnalysisItem = this.analysisOptions.find(item => { return item.guid == this.accountSavingsReportForm.controls.analysisItemId.value });
    this.setPredictorVariables();
    this.setLabels();
    if (!onInit) {
      await this.save();
    }
  }

  setPredictorVariables() {
    this.analysisTableColumns.predictors = [];
    this.save();
  }

  async setDefault() {
    const columnsGroup = this.accountSavingsReportForm.get('analysisTableColumns');
    if (columnsGroup) {
      columnsGroup.patchValue({
        incrementalImprovement: true,
        SEnPI: false,
        savings: false,
        percentSavingsComparedToBaseline: false,
        yearToDateSavings: false,
        yearToDatePercentSavings: false,
        rollingSavings: false,
        rolling12MonthImprovement: false,
        productionVariables: false,
        energy: true,
        actualEnergy: true,
        modeledEnergy: true,
        adjusted: true,
        baselineAdjustmentForNormalization: true,
        baselineAdjustmentForOther: true,
        baselineAdjustment: true,
        totalSavingsPercentImprovement: true,
        annualSavingsPercentImprovement: true,
        cummulativeSavings: true,
        newSavings: true,
        bankedSavings: false,
        savingsUnbanked: false,
        predictors: []
      });
      await this.save();
    }
  }

  toggleEnergyColumns() {
    const columnsGroup = this.accountSavingsReportForm.get('analysisTableColumns');
    if (columnsGroup) {
      const energy = columnsGroup.get('energy')?.value;
      columnsGroup.patchValue({
        actualEnergy: energy,
        modeledEnergy: energy,
        adjusted: energy,
        baselineAdjustmentForNormalization: energy,
        baselineAdjustmentForOther: energy,
        baselineAdjustment: energy
      });
      this.save();
    }
  }

  toggleIncrementalImprovement() {
    const columnsGroup = this.accountSavingsReportForm.get('analysisTableColumns');
    if (columnsGroup) {
      const incremental = columnsGroup.get('incrementalImprovement')?.value;
      columnsGroup.patchValue({
        SEnPI: incremental,
        savings: incremental,
        bankedSavings: incremental,
        savingsUnbanked: incremental,
        rollingSavings: incremental,
        rolling12MonthImprovement: incremental,
        totalSavingsPercentImprovement: incremental,
        annualSavingsPercentImprovement: incremental,
        cummulativeSavings: incremental,
        newSavings: incremental
      });
      this.save();
    }
  }

  setEnergyColumns() {
    this.analysisTableColumns.energy = (this.analysisTableColumns.actualEnergy
      || this.analysisTableColumns.modeledEnergy
      || this.analysisTableColumns.adjusted
      || this.analysisTableColumns.baselineAdjustmentForNormalization
      || this.analysisTableColumns.baselineAdjustmentForOther
      || this.analysisTableColumns.baselineAdjustment);
  }

  setMonthIncrementalImprovement() {
    this.analysisTableColumns.incrementalImprovement = (
      this.analysisTableColumns.SEnPI ||
      this.analysisTableColumns.savings ||
      // this.analysisTableColumns.percentSavingsComparedToBaseline ||
      // this.analysisTableColumns.yearToDateSavings ||
      // this.analysisTableColumns.yearToDatePercentSavings ||
      this.analysisTableColumns.rollingSavings ||
      this.analysisTableColumns.rolling12MonthImprovement ||
      this.analysisTableColumns.SEnPI ||
      this.analysisTableColumns.savings ||
      this.analysisTableColumns.totalSavingsPercentImprovement ||
      this.analysisTableColumns.annualSavingsPercentImprovement ||
      this.analysisTableColumns.cummulativeSavings ||
      this.analysisTableColumns.newSavings ||
      this.analysisTableColumns.bankedSavings ||
      this.analysisTableColumns.savingsUnbanked
    )
  }
}


