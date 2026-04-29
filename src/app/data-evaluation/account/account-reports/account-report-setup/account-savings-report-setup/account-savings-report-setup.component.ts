import { Component, computed, effect, inject, Signal, signal, WritableSignal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { EMPTY, firstValueFrom, map, startWith, switchMap, tap } from 'rxjs';
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
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-account-savings-report-setup',
  standalone: false,

  templateUrl: './account-savings-report-setup.component.html',
  styleUrl: './account-savings-report-setup.component.css'
})
export class AccountSavingsReportSetupComponent {
  private accountReportDbService: AccountReportDbService = inject(AccountReportDbService);
  private accountReportsService: AccountReportsService = inject(AccountReportsService);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private analysisService: AnalysisService = inject(AnalysisService);
  private accountAnalysisDbService: AccountAnalysisDbService = inject(AccountAnalysisDbService);


  account: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount);
  analysisTableColumns: Signal<AnalysisTableColumns> = toSignal(this.analysisService.analysisTableColumns);
  selectedReport: Signal<IdbAccountReport> = toSignal(this.accountReportDbService.selectedReport);

  accountSavingsReportForm: WritableSignal<FormGroup> = signal(undefined);

  selectedAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(
    toObservable(this.accountSavingsReportForm).pipe(
      switchMap(form => form
        ? form.get('analysisItemId').valueChanges.pipe(
            tap(() => this.save()),
            startWith(form.get('analysisItemId').value)
          )
        : EMPTY
      ),
      map(id => this.accountAnalysisDbService.getByGuid(id))
    )
  );

  reportSetup: Signal<AccountSavingsReportSetup> = computed(() => {
    const selectedReport = this.selectedReport();
    if (selectedReport) {
      return selectedReport.accountSavingsReportSetup;
    }
  });
  energyColumnLabel: Signal<string> = computed(() => {
    const selectedAnalysisItem = this.selectedAnalysisItem();
    if (selectedAnalysisItem) {
      if (selectedAnalysisItem.analysisCategory == 'water') {
        return 'Consumption Columns';
      } else if (selectedAnalysisItem.analysisCategory == 'energy') {
        return 'Energy Columns';
      }
    }
    return '';
  });
  actualUseLabel: Signal<string> = computed(() => {
    const selectedAnalysisItem = this.selectedAnalysisItem();
    if (selectedAnalysisItem) {
      if (selectedAnalysisItem.analysisCategory == 'water') {
        return 'Actual Consumption';
      } else if (selectedAnalysisItem.analysisCategory == 'energy') {
        return 'Actual Energy Use';
      }
    }
    return '';
  });

  numberOfPerformerOptions: Array<number> = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  currentReportId: string;

  constructor() {
    effect(() => {
      const selectedReport = this.selectedReport();
      if (selectedReport && this.currentReportId !== selectedReport.guid) {
        this.currentReportId = selectedReport.guid;
        const form = this.accountReportsService.getAccountSavingsFormFromReport(selectedReport.accountSavingsReportSetup);
        this.accountSavingsReportForm.set(form);
      }
    });
  }

  async save() {
    // this.isFormChange = true;
    this.setEnergyColumns();
    this.setMonthIncrementalImprovement();

    let selectedReport: IdbAccountReport = this.selectedReport();
    selectedReport.accountSavingsReportSetup = this.accountReportsService.updateAccountSavingsReportFromForm(selectedReport.accountSavingsReportSetup, this.accountSavingsReportForm());
    await firstValueFrom(this.accountReportDbService.updateWithObservable(selectedReport));
    await this.dbChangesService.setAccountReports(this.account());
    this.accountReportDbService.selectedReport.next({ ...selectedReport });
  }


  async setDefault() {
    const accountSavingsReportForm = this.accountSavingsReportForm();
    const columnsGroup = accountSavingsReportForm.get('analysisTableColumns');
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
    const accountSavingsReportForm = this.accountSavingsReportForm();
    const columnsGroup = accountSavingsReportForm.get('analysisTableColumns');
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
    const accountSavingsReportForm = this.accountSavingsReportForm();
    const columnsGroup = accountSavingsReportForm.get('analysisTableColumns');
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
    const analysisTableColumns = this.analysisTableColumns();
    analysisTableColumns.energy = (analysisTableColumns.actualEnergy
      || analysisTableColumns.modeledEnergy
      || analysisTableColumns.adjusted
      || analysisTableColumns.baselineAdjustmentForNormalization
      || analysisTableColumns.baselineAdjustmentForOther
      || analysisTableColumns.baselineAdjustment);
  }

  setMonthIncrementalImprovement() {
    const analysisTableColumns = this.analysisTableColumns();
    analysisTableColumns.incrementalImprovement = (
      analysisTableColumns.SEnPI ||
      analysisTableColumns.savings ||
      // this.analysisTableColumns.percentSavingsComparedToBaseline ||
      // this.analysisTableColumns.yearToDateSavings ||
      // this.analysisTableColumns.yearToDatePercentSavings ||
      analysisTableColumns.rollingSavings ||
      analysisTableColumns.rolling12MonthImprovement ||
      analysisTableColumns.SEnPI ||
      analysisTableColumns.savings ||
      analysisTableColumns.totalSavingsPercentImprovement ||
      analysisTableColumns.annualSavingsPercentImprovement ||
      analysisTableColumns.cummulativeSavings ||
      analysisTableColumns.newSavings ||
      analysisTableColumns.bankedSavings ||
      analysisTableColumns.savingsUnbanked
    )
  }
}


