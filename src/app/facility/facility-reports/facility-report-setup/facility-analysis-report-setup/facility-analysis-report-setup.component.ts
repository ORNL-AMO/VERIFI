import { Component } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { AnalysisGroup, AnalysisGroupPredictorVariable, AnalysisTableColumns } from 'src/app/models/analysis';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-facility-analysis-report-setup',
  templateUrl: './facility-analysis-report-setup.component.html',
  styleUrl: './facility-analysis-report-setup.component.css'
})
export class FacilityAnalysisReportSetupComponent {

  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;

  analysisItems: Array<IdbAnalysisItem>;
  analysisItemsSub: Subscription;

  analysisTableColumns: AnalysisTableColumns;
  selectedAnalysisItem: IdbAnalysisItem;
  energyColumnLabel: string;
  actualUseLabel: string;
  modeledUseLabel: string;
  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private analysisDbService: AnalysisDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictorDbService
  ) {

  }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.analysisTableColumns = this.facilityReport.analysisReportSettings.analysisTableColumns;
    });

    this.analysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.analysisItems = items;
    });
    this.setSelectedAnalysisItem(true);
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.analysisItemsSub.unsubscribe();
  }

  async setSelectedAnalysisItem(onInit: boolean) {
    this.selectedAnalysisItem = this.analysisItems.find(item => {
      return item.guid == this.facilityReport.analysisItemId;
    });
    this.setPredictorVariables();
    this.setLabels();
    if (!onInit) {
      await this.save();
    }
  }

  async save() {
    this.setMonthIncrementalImprovement();
    this.setEnergyColumns();
    this.setPredictorColumn();
    this.facilityReport.analysisReportSettings.analysisTableColumns = this.analysisTableColumns;
    this.facilityReport = await firstValueFrom(this.facilityReportsDbService.updateWithObservable(this.facilityReport));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, selectedFacility);
    this.facilityReportsDbService.selectedReport.next(this.facilityReport);
  }
  toggleEnergyColumns() {
    if (this.analysisTableColumns.energy == false) {
      this.analysisTableColumns.actualEnergy = false;
      this.analysisTableColumns.modeledEnergy = false;
      this.analysisTableColumns.adjusted = false;
      this.analysisTableColumns.baselineAdjustmentForNormalization = false;
      this.analysisTableColumns.baselineAdjustmentForOther = false;
      this.analysisTableColumns.baselineAdjustment = false;
    } else {
      this.analysisTableColumns.actualEnergy = true;
      this.analysisTableColumns.modeledEnergy = true;
      this.analysisTableColumns.adjusted = true;
      this.analysisTableColumns.baselineAdjustmentForNormalization = true;
      this.analysisTableColumns.baselineAdjustmentForOther = true;
      this.analysisTableColumns.baselineAdjustment = true;
    }
    this.save();
  }

  toggleIncrementalImprovement() {
    if (this.analysisTableColumns.incrementalImprovement == false) {
      this.analysisTableColumns.SEnPI = false;
      this.analysisTableColumns.savings = false;
      // this.analysisTableColumns.percentSavingsComparedToBaseline = false;
      // this.analysisTableColumns.yearToDateSavings = false;
      // this.analysisTableColumns.yearToDatePercentSavings = false;
      this.analysisTableColumns.bankedSavings = false;
      this.analysisTableColumns.savingsUnbanked = false;
      this.analysisTableColumns.rollingSavings = false;
      this.analysisTableColumns.rolling12MonthImprovement = false;
      this.analysisTableColumns.totalSavingsPercentImprovement = false;
      this.analysisTableColumns.annualSavingsPercentImprovement = false;
      this.analysisTableColumns.cummulativeSavings = false;
      this.analysisTableColumns.newSavings = false;
    } else {
      this.analysisTableColumns.SEnPI = true;
      this.analysisTableColumns.savings = true;
      // this.analysisTableColumns.percentSavingsComparedToBaseline = true;
      // this.analysisTableColumns.yearToDateSavings = true;
      // this.analysisTableColumns.yearToDatePercentSavings = true;
      this.analysisTableColumns.bankedSavings = true;
      this.analysisTableColumns.savingsUnbanked = true;
      this.analysisTableColumns.rollingSavings = true;
      this.analysisTableColumns.rolling12MonthImprovement = true;
      this.analysisTableColumns.totalSavingsPercentImprovement = true;
      this.analysisTableColumns.annualSavingsPercentImprovement = true;
      this.analysisTableColumns.cummulativeSavings = true;
      this.analysisTableColumns.newSavings = true;
    }
    this.save();
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

  setPredictorColumn() {
    let predictorOn = this.analysisTableColumns.predictors.find(predictor => {
      return predictor.display;
    });
    this.analysisTableColumns.productionVariables = (predictorOn != undefined);
  }

  setLabels() {
    if (this.selectedAnalysisItem) {
      if (this.selectedAnalysisItem.analysisCategory == 'water') {
        this.actualUseLabel = 'Actual Consumption';
        this.modeledUseLabel = 'Modeled Consumption';
        this.energyColumnLabel = 'Consumption Columns';
      } else if (this.selectedAnalysisItem.analysisCategory == 'energy') {
        this.actualUseLabel = 'Actual Energy Use';
        this.modeledUseLabel = 'Modeled Energy Use';
        this.energyColumnLabel = 'Energy Columns';
      }
    }
  }

  async setDefault() {
    this.analysisTableColumns.incrementalImprovement = true;
    this.analysisTableColumns.SEnPI = false;
    this.analysisTableColumns.savings = false;
    this.analysisTableColumns.percentSavingsComparedToBaseline = false;
    this.analysisTableColumns.yearToDateSavings = false;
    this.analysisTableColumns.yearToDatePercentSavings = false;
    this.analysisTableColumns.rollingSavings = false;
    this.analysisTableColumns.rolling12MonthImprovement = false;
    this.analysisTableColumns.productionVariables = true;
    this.analysisTableColumns.energy = true;
    this.analysisTableColumns.actualEnergy = true;
    this.analysisTableColumns.modeledEnergy = true;
    this.analysisTableColumns.adjusted = true;
    this.analysisTableColumns.baselineAdjustmentForNormalization = true;
    this.analysisTableColumns.baselineAdjustmentForOther = true;
    this.analysisTableColumns.baselineAdjustment = true;
    this.analysisTableColumns.totalSavingsPercentImprovement = true;
    this.analysisTableColumns.annualSavingsPercentImprovement = true;
    this.analysisTableColumns.cummulativeSavings = true;
    this.analysisTableColumns.newSavings = true;
    this.analysisTableColumns.bankedSavings = false;
    this.analysisTableColumns.savingsUnbanked = false;
    await this.save();
  }

  setPredictorVariables() {
    if (this.selectedAnalysisItem) {
      let predictorSelections: Array<{
        predictor: AnalysisGroupPredictorVariable,
        display: boolean,
        usedInAnalysis: boolean
      }> = new Array();

      let variableCopy: Array<AnalysisGroupPredictorVariable> = this.selectedAnalysisItem.groups[0].predictorVariables.map(pVar => {
        return JSON.parse(JSON.stringify(pVar));
      })
      variableCopy.forEach(variable => {
        predictorSelections.push({
          predictor: variable,
          display: variable.productionInAnalysis && this.analysisTableColumns.productionVariables,
          usedInAnalysis: variable.productionInAnalysis
        });
      });
      this.analysisTableColumns.predictors = predictorSelections;
      this.save();
    }
  }

  async toggleAllPredictors() {
    this.analysisTableColumns.predictors.forEach(predictor => {
      predictor.display = this.analysisTableColumns.productionVariables;
    });
    await this.save();
  }

}
