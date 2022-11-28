import { Component, Input, OnInit } from '@angular/core';
import { IdbFacility } from 'src/app/models/idb';
import { BetterPlantsSummary, ReportOptions } from 'src/app/models/overview-report';

@Component({
  selector: 'app-facility-performance-table',
  templateUrl: './facility-performance-table.component.html',
  styleUrls: ['./facility-performance-table.component.css']
})
export class FacilityPerformanceTableComponent implements OnInit {
  @Input()
  betterPlantsSummary: BetterPlantsSummary;
  @Input()
  reportOptions: ReportOptions;


  performanceLevels: Array<{ performanceVal: string, numberOfFacilites: number, facilities: Array<IdbFacility> }>;
  constructor() { }

  ngOnInit(): void {
    this.performanceLevels = new Array();
    this.addPerformanceLevel(undefined, 0, '<0%');
    this.addPerformanceLevel(0, 2, '0-2%');
    this.addPerformanceLevel(2, 4, '2-4%');
    this.addPerformanceLevel(4, 6, '4-6%');
    this.addPerformanceLevel(6, 8, '6-8%');
    this.addPerformanceLevel(8, 10, '8-10%');
    this.addPerformanceLevel(10, 15, '10-15%');
    this.addPerformanceLevel(15, 20, '15-20%');
    this.addPerformanceLevel(20, 25, '20-25%');
    this.addPerformanceLevel(25, 30, '25-30%');
    this.addPerformanceLevel(30, 35, '30-35%');
    this.addPerformanceLevel(35, undefined, '>35%');
  }


  addPerformanceLevel(min: number, max: number, display: string) {
    let facilities: Array<{ facility: IdbFacility, performance: number }> = this.betterPlantsSummary.facilityPerformance.filter(facilityPerformance => {
      if (min != undefined && max != undefined) {
        return facilityPerformance.performance > min && facilityPerformance.performance < max;
      } else if (min != undefined) {
        return facilityPerformance.performance > min;
      } else if (max != undefined) {
        return facilityPerformance.performance < max;
      }
    });

    this.performanceLevels.push({
      performanceVal: display,
      numberOfFacilites: facilities.length,
      facilities: facilities.map(facilityP => { return facilityP.facility })
    })
  }

}
