import { Component, Input, OnInit } from '@angular/core';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { AnalysisTableColumns } from 'src/app/models/analysis';
import { AnalysisGroup, PredictorData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';

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

  analysisTableColumns: AnalysisTableColumns;
  constructor(private analysisService: AnalysisService, private predictorDbService: PredictordbService) { }

  ngOnInit(): void {
    this.analysisTableColumns = this.analysisService.analysisTableColumns.getValue();
    this.setPredictorVariables();
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
      this.analysisTableColumns.adjustedForNormalization = false;
      this.analysisTableColumns.adjusted = false;
      this.analysisTableColumns.baselineAdjustmentForNormalization = false;
      this.analysisTableColumns.baselineAdjustmentForOther = false;
      this.analysisTableColumns.baselineAdjustment = false;
      this.analysisTableColumns.adjustmentToBaseline = false;
    } else {
      this.analysisTableColumns.actualEnergy = true;
      this.analysisTableColumns.modeledEnergy = true;
      this.analysisTableColumns.adjustedForNormalization = true;
      this.analysisTableColumns.adjusted = true;
      this.analysisTableColumns.baselineAdjustmentForNormalization = true;
      this.analysisTableColumns.baselineAdjustmentForOther = true;
      this.analysisTableColumns.baselineAdjustment = true;
      this.analysisTableColumns.adjustmentToBaseline = true;
    }
    this.save();
  }

  toggleIncrementalImprovement() {
    if (this.analysisTableColumns.incrementalImprovement == false) {
      this.analysisTableColumns.SEnPI = false;
      this.analysisTableColumns.savings = false;
      this.analysisTableColumns.percentSavingsComparedToBaseline = false;
      this.analysisTableColumns.yearToDateSavings = false;
      this.analysisTableColumns.yearToDatePercentSavings = false;
      this.analysisTableColumns.rollingSavings = false;
      this.analysisTableColumns.rolling12MonthImprovement = false;
      this.analysisTableColumns.totalSavingsPercentImprovement = false;
      this.analysisTableColumns.annualSavingsPercentImprovement = false;
      this.analysisTableColumns.cummulativeSavings = false;
      this.analysisTableColumns.newSavings = false;
    } else {
      this.analysisTableColumns.SEnPI = true;
      this.analysisTableColumns.savings = true;
      this.analysisTableColumns.percentSavingsComparedToBaseline = true;
      this.analysisTableColumns.yearToDateSavings = true;
      this.analysisTableColumns.yearToDatePercentSavings = true;
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
      || this.analysisTableColumns.adjustedForNormalization 
      || this.analysisTableColumns.adjusted 
      || this.analysisTableColumns.baselineAdjustmentForNormalization 
      || this.analysisTableColumns.baselineAdjustmentForOther 
      || this.analysisTableColumns.baselineAdjustment);
  }

  setMonthIncrementalImprovement() {
    this.analysisTableColumns.incrementalImprovement = (
      this.analysisTableColumns.SEnPI ||
      this.analysisTableColumns.savings ||
      this.analysisTableColumns.percentSavingsComparedToBaseline ||
      this.analysisTableColumns.yearToDateSavings ||
      this.analysisTableColumns.yearToDatePercentSavings ||
      this.analysisTableColumns.rollingSavings ||
      this.analysisTableColumns.rolling12MonthImprovement
    )
  }

  setAnnualIncrementalImprovement() {
    this.analysisTableColumns.incrementalImprovement = (
      this.analysisTableColumns.SEnPI ||
      this.analysisTableColumns.savings ||
      this.analysisTableColumns.totalSavingsPercentImprovement ||
      this.analysisTableColumns.annualSavingsPercentImprovement ||
      this.analysisTableColumns.adjustmentToBaseline ||
      this.analysisTableColumns.cummulativeSavings ||
      this.analysisTableColumns.newSavings
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
        predictor: PredictorData,
        display: boolean,
        usedInAnalysis: boolean
      }> = new Array();

      let variableCopy: Array<PredictorData>;
      if (this.tableContext == 'monthGroup' || this.tableContext == 'annualGroup') {
        let analysisGroup: AnalysisGroup = this.analysisService.selectedGroup.getValue();
        variableCopy = JSON.parse(JSON.stringify(analysisGroup.predictorVariables));
      } else if (this.tableContext == 'monthFacility' || this.tableContext == 'annualFacility') {
        let predictorVariables: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
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
}