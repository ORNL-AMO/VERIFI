import { Component, Input } from '@angular/core';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getStatistics, Statistics } from '../meterDataQualityStatistics';
import { Router } from '@angular/router';
import { getDateFromMeterData } from '../../dateHelperFunctions';

@Component({
  selector: 'app-meter-data-quality-report',
  standalone: false,
  templateUrl: './meter-data-quality-report.component.html',
  styleUrl: './meter-data-quality-report.component.css'
})
export class MeterDataQualityReportComponent {
  @Input({ required: true })
  selectedMeter: IdbUtilityMeter;
  @Input({ required: true })
  meterData: Array<IdbUtilityMeterData>;

  energyOutlierCount: number = 0;
  costOutlierCount: number = 0;
  showAlert: boolean = false;
  energyStats: Statistics;
  costStats: Statistics;

  includeCosts: boolean = true;
  hasData: boolean;

  datesList: Array<{ monthYear: string }> = [];

  constructor(private router: Router) { }

  ngOnChanges() {
    this.setStatistics();
  }

  setStatistics() {
    if (this.meterData.length === 0) {
      this.hasData = false;
    } else {
      this.hasData = true;
      const { energyStats, costStats } = getStatistics(this.meterData, this.selectedMeter);
      this.energyStats = energyStats;
      this.costStats = costStats;
      this.includeCosts = isNaN(this.costStats.average) == false && this.costStats.average != 0;
      this.energyOutlierCount = energyStats.outliers;
      this.costOutlierCount = costStats.outliers;
      this.checkMultipleReadings();
      if (this.energyOutlierCount > 0 || this.costOutlierCount > 0 || this.datesList.length > 0) {
        this.showAlert = true;
      } else {
        this.showAlert = false;
      }
    }
  }

  checkMultipleReadings() {
    let dateCount: { [key: string]: number } = {};
    this.meterData.forEach(data => {
      let date = getDateFromMeterData(data);
      let month = date.toLocaleString('default', { month: 'short' });
      let year = date.getFullYear();
      let monthYear = `${month}, ${year}`;
      if (dateCount[monthYear]) {
        dateCount[monthYear]++;
      } else {
        dateCount[monthYear] = 1;
      }
    });
    this.datesList = Object.keys(dateCount).filter(key => dateCount[key] > 1)
      .map(key => {
        return { monthYear: key };
      });
  }

  meterDataAdd() {
    this.router.navigateByUrl('/data-management/' + this.selectedMeter.accountId + '/facilities/' + this.selectedMeter.facilityId + '/meters/' + this.selectedMeter.guid + '/meter-data/new-bill');

  }

  uploadData() {
    this.router.navigateByUrl('/data-management/' + this.selectedMeter.accountId + '/import-data');
  }
}
