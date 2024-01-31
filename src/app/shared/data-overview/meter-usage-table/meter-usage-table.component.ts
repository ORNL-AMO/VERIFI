import { Component, Input } from '@angular/core';
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
  dataType: 'energyUse' | 'cost' | 'water';
  @Input()
  waterUnit: string;
  @Input()
  energyUnit: string;
  @Input()
  facilityOverviewMeters: Array<FacilityOverviewMeter>;
  @Input()
  facilityOverviewData: FacilityOverviewData

  orderByValue: 'energyUsage' | 'energyCost' | 'consumption';
  constructor() { }

  ngOnInit(): void {
    this.setOrderByValue();
  }

  setOrderByValue() {
    if (this.dataType == 'energyUse') {
      this.orderByValue = 'energyUsage';
    } else if (this.dataType == 'cost') {
      this.orderByValue = 'energyCost';
    } else if (this.dataType == 'water') {
      this.orderByValue = 'consumption';
    }
  }
}
