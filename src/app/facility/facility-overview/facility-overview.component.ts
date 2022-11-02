import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
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
  constructor(private facilityDbService: FacilitydbService,
    private facilityOverviewService: FacilityOverviewService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private router: Router) { }

  ngOnInit(): void {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
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
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/facility-overview.worker', import.meta.url));
      let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.facilityMeterGroups.getValue();
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
        type: 'energy'
      });

      let waterSources: Array<MeterSource> = [
        "Water",
        "Waste Water"
      ];
      this.worker.postMessage({
        calanderizedMeters: this.facilityOverviewService.calanderizedMeters,
        groups: groups,
        sources: waterSources,
        type: 'water'
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
        type: 'all'
      });
    } else {
      console.log('nopee')

      // Web Workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
    }
  }

  addUtilityData(){
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility');
  }
}
