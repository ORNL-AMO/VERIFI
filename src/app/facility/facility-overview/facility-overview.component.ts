import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitySummaryClass } from 'src/app/calculations/dashboard-calculations/facilitySummaryClass';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbFacility, IdbUtilityMeterGroup, MeterSource } from 'src/app/models/idb';
import { FacilityOverviewService } from './facility-overview.service';

@Component({
  selector: 'app-facility-overview',
  templateUrl: './facility-overview.component.html',
  styleUrls: ['./facility-overview.component.css']
})
export class FacilityOverviewComponent implements OnInit {

  facilitySub: Subscription;
  worker: Worker;
  noUtilityData: boolean;
  facility: IdbFacility;
  constructor(private facilityDbService: FacilitydbService,
    private facilityOverviewService: FacilityOverviewService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private router: Router) { }

  ngOnInit(): void {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = val;
      this.facilityOverviewService.setCalanderizedMeters();
      if (this.facilityOverviewService.calanderizedMeters.length != 0) {
        this.noUtilityData = false;
        this.calculateFacilitiesSummary();
      } else {
        this.noUtilityData = true;
      }
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }

  calculateFacilitiesSummary() {
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.facilityMeterGroups.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/facility-overview.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (data.type == 'energy') {
          this.facilityOverviewService.energyMeterSummaryData.next(data.meterSummaryData);
          this.facilityOverviewService.energyMonthlySourceData.next(data.monthlySourceData);
          this.facilityOverviewService.energyUtilityUsageSummaryData.next(data.utilityUsageSummaryData);
          this.facilityOverviewService.energyYearMonthData.next(data.yearMonthData);
          this.facilityOverviewService.calculatingEnergy.next(false);
        } else if (data.type == 'water') {
          this.facilityOverviewService.waterMeterSummaryData.next(data.meterSummaryData);
          this.facilityOverviewService.waterMonthlySourceData.next(data.monthlySourceData);
          this.facilityOverviewService.waterUtilityUsageSummaryData.next(data.utilityUsageSummaryData);
          this.facilityOverviewService.waterYearMonthData.next(data.yearMonthData);
          this.facilityOverviewService.calculatingWater.next(false);
        } else if (data.type == 'all') {
          this.facilityOverviewService.costsMeterSummaryData.next(data.meterSummaryData);
          this.facilityOverviewService.costsMonthlySourceData.next(data.monthlySourceData);
          this.facilityOverviewService.costsUtilityUsageSummaryData.next(data.utilityUsageSummaryData);
          this.facilityOverviewService.costsYearMonthData.next(data.yearMonthData);
          this.facilityOverviewService.calculatingCosts.next(false);
          this.worker.terminate();
        }
      };
      this.facilityOverviewService.calculatingEnergy.next(true);
      this.facilityOverviewService.calculatingWater.next(true);
      this.facilityOverviewService.calculatingCosts.next(true);
      let energySources: Array<MeterSource> = ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy']
      this.worker.postMessage({
        calanderizedMeters: this.facilityOverviewService.calanderizedMeters,
        groups: groups,
        sources: energySources,
        type: 'energy',
        facility: this.facility
      });

      let waterSources: Array<MeterSource> = [
        "Water",
        "Waste Water"
      ];
      this.worker.postMessage({
        calanderizedMeters: this.facilityOverviewService.calanderizedMeters,
        groups: groups,
        sources: waterSources,
        type: 'water',
        facility: this.facility
      });

      let allSources: Array<MeterSource> = [
        "Electricity",
        "Natural Gas",
        "Other Fuels",
        "Other Energy",
        "Water",
        "Waste Water",
        "Other Utility"
      ]
      this.worker.postMessage({
        calanderizedMeters: this.facilityOverviewService.calanderizedMeters,
        groups: groups,
        sources: allSources,
        type: 'all',
        facility: this.facility
      });
    } else {
      // Web Workers are not supported in this environment.
      let energySources: Array<MeterSource> = ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy']
      let facilitySummaryClass: FacilitySummaryClass = new FacilitySummaryClass(this.facilityOverviewService.calanderizedMeters, groups, energySources, this.facility);
      this.facilityOverviewService.energyMeterSummaryData.next(facilitySummaryClass.meterSummaryData);
      this.facilityOverviewService.energyMonthlySourceData.next(facilitySummaryClass.monthlySourceData);
      this.facilityOverviewService.energyUtilityUsageSummaryData.next(facilitySummaryClass.utilityUsageSummaryData);
      this.facilityOverviewService.energyYearMonthData.next(facilitySummaryClass.yearMonthData);

      let waterSources: Array<MeterSource> = [
        "Water",
        "Waste Water"
      ];
      let waterSummaryClass: FacilitySummaryClass = new FacilitySummaryClass(this.facilityOverviewService.calanderizedMeters, groups, waterSources, this.facility);
      this.facilityOverviewService.waterMeterSummaryData.next(waterSummaryClass.meterSummaryData);
      this.facilityOverviewService.waterMonthlySourceData.next(waterSummaryClass.monthlySourceData);
      this.facilityOverviewService.waterUtilityUsageSummaryData.next(waterSummaryClass.utilityUsageSummaryData);
      this.facilityOverviewService.waterYearMonthData.next(waterSummaryClass.yearMonthData);
      let allSources: Array<MeterSource> = [
        "Electricity",
        "Natural Gas",
        "Other Fuels",
        "Other Energy",
        "Water",
        "Waste Water",
        "Other Utility"
      ]
      let allSourcesSummaryClass: FacilitySummaryClass = new FacilitySummaryClass(this.facilityOverviewService.calanderizedMeters, groups, allSources, this.facility);
      this.facilityOverviewService.costsMeterSummaryData.next(allSourcesSummaryClass.meterSummaryData);
      this.facilityOverviewService.costsMonthlySourceData.next(allSourcesSummaryClass.monthlySourceData);
      this.facilityOverviewService.costsUtilityUsageSummaryData.next(allSourcesSummaryClass.utilityUsageSummaryData);
      this.facilityOverviewService.costsYearMonthData.next(allSourcesSummaryClass.yearMonthData);
    }
  }

  addUtilityData() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility');
  }
}
