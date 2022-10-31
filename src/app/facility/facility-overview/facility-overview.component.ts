import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityOverviewService } from './facility-overview.service';

@Component({
  selector: 'app-facility-overview',
  templateUrl: './facility-overview.component.html',
  styleUrls: ['./facility-overview.component.css']
})
export class FacilityOverviewComponent implements OnInit {

  facilitySub: Subscription;
  worker: Worker;
  constructor(private facilityDbService: FacilitydbService, private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facilityOverviewService.setCalanderizedMeters();
      this.calculateFacilitiesSummary();
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }

  calculateFacilitiesSummary() {
    // if (typeof Worker !== 'undefined') {
    //   this.worker = new Worker(new URL('src/app/web-workers/account-overview.worker', import.meta.url));
    //   let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    //   this.worker.onmessage = ({ data }) => {
    //     if (data.type == 'energy') {
    //       this.accountOverviewService.accountFacilitiesEnergySummary.next(data.accountFacilitiesSummary);
    //       this.accountOverviewService.energyUtilityUsageSummaryData.next(data.utilityUsageSummaryData);
    //       this.accountOverviewService.calculatingEnergy.next(false);
    //     }else if(data.type == 'water'){
    //       this.accountOverviewService.accountFacilitiesWaterSummary.next(data.accountFacilitiesSummary);
    //       this.accountOverviewService.waterUtilityUsageSummaryData.next(data.utilityUsageSummaryData);
    //       this.accountOverviewService.calculatingWater.next(false);
    //     } else if(data.type == 'all'){
    //       this.accountOverviewService.accountFacilitiesCostsSummary.next(data.accountFacilitiesSummary);
    //       this.accountOverviewService.costsUtilityUsageSummaryData.next(data.utilityUsageSummaryData);
    //       this.accountOverviewService.calculatingCosts.next(false);
    //       this.worker.terminate();
    //     }
    //   };
    //   this.accountOverviewService.calculatingEnergy.next(true);

    //   let energySources: Array<MeterSource> = ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy']
    //   this.worker.postMessage({
    //     calanderizedMeters: this.accountOverviewService.calanderizedMeters,
    //     facilities: facilities,
    //     sources: energySources,
    //     type: 'energy'
    //   });

    //   let waterSources: Array<MeterSource> = [
    //     "Water",
    //     "Waste Water"
    //   ];
    //   console.log(this.accountOverviewService.calanderizedMeters);
    //   this.worker.postMessage({
    //     calanderizedMeters: this.accountOverviewService.calanderizedMeters,
    //     facilities: facilities,
    //     sources: waterSources,
    //     type: 'water'
    //   });
      
    //   let allSources: Array<MeterSource> = [
    //     "Electricity",
    //     "Natural Gas",
    //     "Other Fuels",
    //     "Other Energy",
    //     "Water",
    //     "Waste Water",
    //     "Other Utility"
    //   ]
    //   this.worker.postMessage({
    //     calanderizedMeters: this.accountOverviewService.calanderizedMeters,
    //     facilities: facilities,
    //     sources: allSources,
    //     type: 'all'
    //   });
    // } else {
    //   console.log('nopee')

    //   // Web Workers are not supported in this environment.
    //   // You should add a fallback so that your program still executes correctly.
    // }
  }
}
