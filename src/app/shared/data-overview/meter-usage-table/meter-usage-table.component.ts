import { Component, Input } from '@angular/core';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-meter-usage-table',
  templateUrl: './meter-usage-table.component.html',
  styleUrls: ['./meter-usage-table.component.css']
})
export class MeterUsageTableComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  facilityId: string;

  metersSummary: FacilityMeterSummaryData;
  metersSummarySub: Subscription;
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;

  facilityEnergyUnit: string;
  facilityVolumeLiquidUnit: string;
  orderByValue: 'energyUsage' | 'energyCost' | 'marketEmissions' | 'consumption';
  constructor(
    private facilityDbService: FacilitydbService,
    private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let selectedFacility: IdbFacility = facilities.find(facility => { return facility.guid == this.facilityId });
    this.facilityEnergyUnit = selectedFacility.energyUnit;
    this.facilityVolumeLiquidUnit = selectedFacility.volumeLiquidUnit;

    if (this.dataType == 'energyUse' || this.dataType == 'emissions') {
      this.metersSummarySub = this.facilityOverviewService.energyMeterSummaryData.subscribe(sourceData => {
        this.metersSummary = sourceData;
      });
    } else if (this.dataType == 'cost') {
      this.metersSummarySub = this.facilityOverviewService.costsMeterSummaryData.subscribe(sourceData => {
        this.metersSummary = sourceData;
      });
    } else if (this.dataType == 'water') {
      this.metersSummarySub = this.facilityOverviewService.waterMeterSummaryData.subscribe(sourceData => {
        this.metersSummary = sourceData;
      });
    }

    if (this.dataType == 'emissions') {
      this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
      });
    }
    this.setOrderByValue();
  }

  ngOnDestroy() {
    this.metersSummarySub.unsubscribe();
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
