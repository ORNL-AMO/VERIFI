import { Component, Input, OnInit } from '@angular/core';
import { AnalysisGroup, AnalysisGroupPredictorVariable, AnalysisTableColumns } from 'src/app/models/analysis';
import * as _ from 'lodash';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Component({
  selector: 'app-analysis-summary-table-filter',
  templateUrl: './analysis-summary-table-filter.component.html',
  styleUrls: ['./analysis-summary-table-filter.component.css']
})
export class AnalysisSummaryTableFilterComponent implements OnInit {
  @Input()
  tableContext: string;
  @Input()
  group: AnalysisGroup;
  @Input()
  analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem;

  analysisTableColumns: AnalysisTableColumns;
  energyColumnLabel: string;
  actualUseLabel: string;
  modeledUseLabel: string;
  constructor(private analysisService: AnalysisService, private predictorDbService: PredictorDbService) { }

  ngOnInit(): void {
    this.analysisTableColumns = this.analysisService.analysisTableColumns.getValue();
    this.setPredictorVariables();
    this.setLabels();
  }

  save() {
    this.setEnergyColumns();
    if (this.tableContext == 'monthGroup' || this.tableContext == 'monthFacility' || this.tableContext == 'monthAccount') {
      this.setMonthIncrementalImprovement();
    } else if (this.tableContext == 'annualGroup' || this.tableContext == 'annualFacility' || this.tableContext == 'annualAccount') {
      this.setAnnualIncrementalImprovement();
    }
    this.setPredictorChecked();
    if (this.group) {
      this.analysisTableColumns.predictorGroupId = this.group.idbGroupId;
    } else {
      this.analysisTableColumns.predictorGroupId = undefined;
    }
    this.analysisService.analysisTableColumns.next(this.analysisTableColumns);
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
      this.analysisTableColumns.rollingSavings = false;
      this.analysisTableColumns.rolling12MonthImprovement = false;
      this.analysisTableColumns.totalSavingsPercentImprovement = false;
      this.analysisTableColumns.annualSavingsPercentImprovement = false;
      this.analysisTableColumns.cummulativeSavings = false;
      this.analysisTableColumns.newSavings = false;
      this.analysisTableColumns.bankedSavings = false;
      this.analysisTableColumns.savingsUnbanked = false;
    } else {
      this.analysisTableColumns.SEnPI = true;
      this.analysisTableColumns.savings = true;
      // this.analysisTableColumns.percentSavingsComparedToBaseline = true;
      // this.analysisTableColumns.yearToDateSavings = true;
      // this.analysisTableColumns.yearToDatePercentSavings = true;
      this.analysisTableColumns.rollingSavings = true;
      this.analysisTableColumns.rolling12MonthImprovement = true;
      this.analysisTableColumns.totalSavingsPercentImprovement = true;
      this.analysisTableColumns.annualSavingsPercentImprovement = true;
      this.analysisTableColumns.cummulativeSavings = true;
      this.analysisTableColumns.newSavings = true;
      this.analysisTableColumns.bankedSavings = true;
      this.analysisTableColumns.savingsUnbanked = true;
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
      this.analysisTableColumns.savingsUnbanked ||
      this.analysisTableColumns.bankedSavings
    )
  }

  setAnnualIncrementalImprovement() {
    this.analysisTableColumns.incrementalImprovement = (
      this.analysisTableColumns.SEnPI ||
      this.analysisTableColumns.savings ||
      this.analysisTableColumns.totalSavingsPercentImprovement ||
      this.analysisTableColumns.annualSavingsPercentImprovement ||
      this.analysisTableColumns.cummulativeSavings ||
      this.analysisTableColumns.newSavings||
      this.analysisTableColumns.savingsUnbanked ||
      this.analysisTableColumns.bankedSavings
    );
  }

  setPredictorChecked() {
    let hasPredictorChecked: boolean = false;
    this.analysisTableColumns.predictors.forEach(predictor => {
      if (predictor.display == true) {
        hasPredictorChecked = true;
      }
    });
    this.analysisTableColumns.productionVariables = hasPredictorChecked;
  }

  setPredictorVariables() {
    if (this.tableContext != 'annualAccount' && this.tableContext != 'monthAccount') {
      let predictorSelections: Array<{
        predictor: AnalysisGroupPredictorVariable,
        display: boolean,
        usedInAnalysis: boolean
      }> = new Array();

      let variableCopy: Array<AnalysisGroupPredictorVariable>;
      if (this.tableContext == 'monthGroup' || this.tableContext == 'annualGroup') {
        let analysisGroup: AnalysisGroup = this.analysisService.selectedGroup.getValue();
        variableCopy = JSON.parse(JSON.stringify(analysisGroup.predictorVariables));
      } else if (this.tableContext == 'monthFacility' || this.tableContext == 'annualFacility') {
        let predictorVariables: Array<IdbPredictor> = this.predictorDbService.facilityPredictors.getValue();
        variableCopy = JSON.parse(JSON.stringify(predictorVariables));
        variableCopy.forEach(variable => {
          variable.productionInAnalysis = false;
        });
      }
      let updatePredictors: boolean = false;
      if (this.group) {
        if (this.group.idbGroupId != this.analysisTableColumns.predictorGroupId) {
          updatePredictors = true;
        }
      } else if (this.analysisTableColumns.predictorGroupId != undefined) {
        updatePredictors = true;
      }

      if (updatePredictors) {
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
  }

  toggleAllPredictors() {
    this.analysisTableColumns.predictors.forEach(predictor => {
      predictor.display = this.analysisTableColumns.productionVariables;
    });
    this.save();
  }

  setDefault() {
    this.analysisTableColumns.incrementalImprovement = false;
    this.analysisTableColumns.SEnPI = false;
    this.analysisTableColumns.savings = false;
    // this.analysisTableColumns.percentSavingsComparedToBaseline = false;
    // this.analysisTableColumns.yearToDateSavings = false;
    // this.analysisTableColumns.yearToDatePercentSavings = false;
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
    this.analysisTableColumns.predictors.forEach(predictor => {
      if (predictor.usedInAnalysis) {
        predictor.display = true;
      } else {
        predictor.display = false;
      }
    })
    this.save();
  }

  setLabels() {
    if (this.analysisItem.analysisCategory == 'water') {
      this.actualUseLabel = 'Actual Consumption';
      this.modeledUseLabel = 'Modeled Consumption';
      this.energyColumnLabel = 'Consumption Columns';
    } else if (this.analysisItem.analysisCategory == 'energy') {
      this.actualUseLabel = 'Actual Energy Use';
      this.modeledUseLabel = 'Modeled Energy Use';
      this.energyColumnLabel = 'Energy Columns';
    }
  }
}