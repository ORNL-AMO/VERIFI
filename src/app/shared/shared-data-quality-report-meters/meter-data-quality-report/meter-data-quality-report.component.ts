import { Component, Input } from '@angular/core';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getStatistics, Statistics } from '../meterDataQualityStatistics';

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


  showGraphs: boolean = false;
  activeGraph: string;
  energyOutlierCount: number = 0;
  costOutlierCount: number = 0;
  showAlert: boolean = false;
  energyStats: Statistics;
  costStats: Statistics;

  includeCosts: boolean = true;
  ngOnChanges() {
    this.setStatistics();
  }

  setStatistics() {
    const { energyStats, costStats } = getStatistics(this.meterData, this.selectedMeter);
    this.energyStats = energyStats;
    this.costStats = costStats;
    this.includeCosts = (this.costStats.average != 0);
    this.energyOutlierCount = energyStats.outliers;
    this.costOutlierCount = costStats.outliers;
    if (this.energyOutlierCount > 0 || this.costOutlierCount > 0) {
      this.showAlert = true;
    } else {
      this.showAlert = false;
    }
  }
}
