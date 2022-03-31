import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { MonthlyTableColumns } from 'src/app/models/analysis';

@Component({
  selector: 'app-monthly-analysis-summary-table-filter',
  templateUrl: './monthly-analysis-summary-table-filter.component.html',
  styleUrls: ['./monthly-analysis-summary-table-filter.component.css']
})
export class MonthlyAnalysisSummaryTableFilterComponent implements OnInit {

  showFilterDropdown: boolean = false;
  monthlyTableColumns: MonthlyTableColumns;
  constructor(private analysisService: AnalysisService, private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.monthlyTableColumns = this.analysisService.monthlyTableColumns.getValue();
  }

  toggleFilterMenu() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  showAllColumns() {

  }

  hideAllColumns() {

  }

  save() {
    this.setEnergyColumns();
    this.setIncrementalImprovement();
    this.analysisService.monthlyTableColumns.next(this.monthlyTableColumns);
  }


  toggleEnergyColumns() {
    if (this.monthlyTableColumns.energy == false) {
      this.monthlyTableColumns.actualEnergy = false;
      this.monthlyTableColumns.modeledEnergy = false;
      this.monthlyTableColumns.adjustedEnergy = false;
    } else {
      this.monthlyTableColumns.actualEnergy = true;
      this.monthlyTableColumns.modeledEnergy = true;
      this.monthlyTableColumns.adjustedEnergy = true;
    }
    this.save();
  }

  toggleIncrementalImprovement(){
    if(this.monthlyTableColumns.incrementalImprovement == false){
      this.monthlyTableColumns.SEnPI = false;
      this.monthlyTableColumns.savings = false;
      this.monthlyTableColumns.percentSavingsComparedToBaseline = false;
      this.monthlyTableColumns.yearToDateSavings = false;
      this.monthlyTableColumns.yearToDatePercentSavings = false;
      this.monthlyTableColumns.rollingSavings = false;
      this.monthlyTableColumns.rolling12MonthImprovement = false;
    }else{
      this.monthlyTableColumns.SEnPI = true;
      this.monthlyTableColumns.savings = true;
      this.monthlyTableColumns.percentSavingsComparedToBaseline = true;
      this.monthlyTableColumns.yearToDateSavings = true;
      this.monthlyTableColumns.yearToDatePercentSavings = true;
      this.monthlyTableColumns.rollingSavings = true;
      this.monthlyTableColumns.rolling12MonthImprovement = true;
    }
    this.save();
  }


  setEnergyColumns() {
    this.monthlyTableColumns.energy = this.monthlyTableColumns.actualEnergy || this.monthlyTableColumns.modeledEnergy || this.monthlyTableColumns.adjustedEnergy;
  }

  setIncrementalImprovement(){
    this.monthlyTableColumns.incrementalImprovement = (
      this.monthlyTableColumns.SEnPI ||
      this.monthlyTableColumns.savings ||
      this.monthlyTableColumns.percentSavingsComparedToBaseline ||
      this.monthlyTableColumns.yearToDateSavings ||
      this.monthlyTableColumns.yearToDatePercentSavings ||
      this.monthlyTableColumns.rollingSavings ||
      this.monthlyTableColumns.rolling12MonthImprovement
    )
  }
}
