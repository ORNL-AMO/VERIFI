import { Component, Input } from '@angular/core';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { getPredictorStatistics, PredictorStatistics } from '../predictorDataQualityStatistics';
import { Router } from '@angular/router';
import { PredictorStatusCheck } from 'src/app/calculations/status-check-calculations/predictorStatusCheck';

@Component({
  selector: 'app-predictor-data-quality-report',
  standalone: false,
  templateUrl: './predictor-data-quality-report.component.html',
  styleUrl: './predictor-data-quality-report.component.css'
})
export class PredictorDataQualityReportComponent {
  @Input({ required: true })
  selectedPredictor: IdbPredictor;
  @Input({ required: true })
  predictorData: Array<IdbPredictorData>;

  stats: PredictorStatistics;
  hasData: boolean;
  duplicateDatesList: Array<{ monthYear: string, month: number, year: number }> = [];
  missingMonthsList: Array<{ monthYear: string, month: number, year: number }> = [];
  showAlert: boolean = false;

  constructor(private router: Router) { }

  ngOnChanges() {
    this.hasData = this.predictorData && this.predictorData.length > 0;
    if (this.hasData) {
      const data = this.predictorData.map(d => d.amount);
      this.stats = getPredictorStatistics(data);
      const statusCheck = new PredictorStatusCheck(this.selectedPredictor, this.predictorData, undefined);
      this.buildDuplicatesList(statusCheck);
      this.buildMissingList(statusCheck);
      this.showAlert = this.duplicateDatesList.length > 0 || this.missingMonthsList.length > 0;
    }
  }

  private buildDuplicatesList(statusCheck: PredictorStatusCheck) {
    if (!statusCheck.hasDuplicateEntries) {
      this.duplicateDatesList = [];
      return;
    }
    let dateCount: { [key: string]: number } = {};
    this.predictorData.forEach(data => {
      let monthYear = new Date(data.year, data.month - 1)
        .toLocaleString('default', { month: 'short', year: 'numeric' });
      dateCount[monthYear] = (dateCount[monthYear] ?? 0) + 1;
    });
    this.duplicateDatesList = Object.keys(dateCount)
      .filter(key => dateCount[key] > 1)
      .map(key => {
        const [monthStr, yearStr] = key.split(' ');
        const month = new Date(Date.parse(monthStr + " 1, 2000")).getMonth() + 1;
        const year = parseInt(yearStr, 10);
        return { monthYear: key, month, year };
      });
  }

  private buildMissingList(statusCheck: PredictorStatusCheck) {
    this.missingMonthsList = statusCheck.missingEntryMonths.map(({ month, year }) => {
      const label = new Date(year, month - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
      return { monthYear: label, month, year };
    });
  }

  predictorDataAdd() {
    this.router.navigateByUrl('/data-management/' + this.selectedPredictor.accountId + '/facilities/' + this.selectedPredictor.facilityId + '/predictors/' + this.selectedPredictor.guid + '/predictor-data');
  }

  uploadData() {
    this.router.navigateByUrl('/data-management/' + this.selectedPredictor.accountId + '/import-data');
  }
}
