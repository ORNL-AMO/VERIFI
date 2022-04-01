import { Component, Input, OnInit } from '@angular/core';
import { AnalysisTableColumns } from 'src/app/models/analysis';
import { AnalysisGroup, PredictorData } from 'src/app/models/idb';
import { AnalysisService } from '../../analysis.service';

@Component({
  selector: 'app-analysis-summary-table-filter',
  templateUrl: './analysis-summary-table-filter.component.html',
  styleUrls: ['./analysis-summary-table-filter.component.css']
})
export class AnalysisSummaryTableFilterComponent implements OnInit {
  @Input()
  tableContext: 'groupMonth' | 'groupAnnual';


  showFilterDropdown: boolean = false;
  analysisTableColumns: AnalysisTableColumns;
  constructor(private analysisService: AnalysisService) { }

  ngOnInit(): void {
    this.analysisTableColumns = this.analysisService.analysisTableColumns.getValue();
    let analysisGroup: AnalysisGroup = this.analysisService.selectedGroup.getValue();
    this.setPredictorVariables(analysisGroup);

  }

  toggleFilterMenu() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  save() {
    this.setEnergyColumns();
    if (this.tableContext == 'groupMonth') {
      this.setMonthIncrementalImprovement();
    } else if (this.tableContext == 'groupAnnual') {
      this.setAnnualIncrementalImprovement();
    }
    this.setPredictorChecked();
    this.analysisService.analysisTableColumns.next(this.analysisTableColumns);
  }


  toggleEnergyColumns() {
    if (this.analysisTableColumns.energy == false) {
      this.analysisTableColumns.actualEnergy = false;
      this.analysisTableColumns.modeledEnergy = false;
      this.analysisTableColumns.adjustedEnergy = false;
    } else {
      this.analysisTableColumns.actualEnergy = true;
      this.analysisTableColumns.modeledEnergy = true;
      this.analysisTableColumns.adjustedEnergy = true;
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
      this.analysisTableColumns.totalSavingsPercentImprovement  = false;
      this.analysisTableColumns.annualSavingsPercentImprovement  = false;
      this.analysisTableColumns.adjustmentToBaseline  = false;
      this.analysisTableColumns.cummulativeSavings  = false;
      this.analysisTableColumns.newSavings = false;
    } else {
      this.analysisTableColumns.SEnPI = true;
      this.analysisTableColumns.savings = true;
      this.analysisTableColumns.percentSavingsComparedToBaseline = true;
      this.analysisTableColumns.yearToDateSavings = true;
      this.analysisTableColumns.yearToDatePercentSavings = true;
      this.analysisTableColumns.rollingSavings = true;
      this.analysisTableColumns.rolling12MonthImprovement = true;
      this.analysisTableColumns.totalSavingsPercentImprovement  = true;
      this.analysisTableColumns.annualSavingsPercentImprovement  = true;
      this.analysisTableColumns.adjustmentToBaseline  = true;
      this.analysisTableColumns.cummulativeSavings  = true;
      this.analysisTableColumns.newSavings = true;
    }
    console.log(this.analysisTableColumns);
    this.save();
  }


  setEnergyColumns() {
    this.analysisTableColumns.energy = this.analysisTableColumns.actualEnergy || this.analysisTableColumns.modeledEnergy || this.analysisTableColumns.adjustedEnergy;
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

  setPredictorVariables(analysisGroup: AnalysisGroup) {
    let predictorSelections: Array<{
      predictor: PredictorData,
      display: boolean,
      usedInAnalysis: boolean
    }> = new Array();
    let variableCopy: Array<PredictorData> = JSON.parse(JSON.stringify(analysisGroup.predictorVariables));

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

  toggleAllPredictors() {
    this.analysisTableColumns.predictors.forEach(predictor => {
      predictor.display = this.analysisTableColumns.productionVariables;
    });
    this.save();
  }

}
