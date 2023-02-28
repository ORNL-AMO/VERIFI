import { Component, Input } from '@angular/core';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
import { Subscription } from 'rxjs';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { FacilityOverviewData, FacilityOverviewMeter } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';

@Component({
  selector: 'app-meter-usage-table',
  templateUrl: './meter-usage-table.component.html',
  styleUrls: ['./meter-usage-table.component.css']
})
export class MeterUsageTableComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  metersSummary: FacilityMeterSummaryData;
  @Input()
  waterUnit: string;
  @Input()
  energyUnit: string;
  @Input()
  facilityOverviewMeters: Array<FacilityOverviewMeter>;
  @Input()
  facilityOverviewData: FacilityOverviewData

  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;

  orderByValue: 'energyUsage' | 'energyCost' | 'marketEmissions' | 'consumption';
  constructor(
    private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {


    if (this.dataType == 'emissions') {
      this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
      });
    }
    this.setOrderByValue();
  }

  ngOnDestroy() {
    if (this.emissionsDisplaySub) {
      this.emissionsDisplaySub.unsubscribe();
    }
  }

  setOrderByValue() {
    if (this.dataType == 'energyUse') {
      this.orderByValue = 'energyUsage';
    } else if (this.dataType == 'cost') {
      this.orderByValue = 'energyCost';
    } else if (this.dataType == 'emissions') {
      this.orderByValue = 'marketEmissions';
    } else if (this.dataType == 'water') {
      this.orderByValue = 'consumption';
    }
  }
}
