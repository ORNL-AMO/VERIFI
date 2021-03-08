import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizationFilters, CalanderizationService } from '../../shared/helper-services/calanderization.service';

@Component({
  selector: 'app-calanderization',
  templateUrl: './calanderization.component.html',
  styleUrls: ['./calanderization.component.css']
})
export class CalanderizationComponent implements OnInit {


  itemsPerPage = 12;
  tablePageNumbers: Array<number>;
  calanderizedMeterData: Array<CalanderizedMeter>
  facilityMetersSub: Subscription;
  facilityMeterDataSub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;
  orderDataField: string = 'date';
  orderByDirection: string = 'desc';

  calanderizedDataFilters: CalanderizationFilters;
  calanderizedDataFiltersSub: Subscription;
  constructor(private calanderizationService: CalanderizationService, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.calanderizedDataFiltersSub = this.calanderizationService.calanderizedDataFilters.subscribe(val => {
      this.calanderizedDataFilters = val;
      this.setCalanderizedMeterData();
    });

    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.facilityMeters = facilityMeters;
      this.setCalanderizedMeterData();
    });

    this.facilityMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(() => {
      this.setCalanderizedMeterData();
    });

  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
    this.facilityMeterDataSub.unsubscribe();
    this.calanderizedDataFiltersSub.unsubscribe();
  }

  setCalanderizedMeterData() {
    if (this.facilityMeters) {
      let filteredMeters: Array<IdbUtilityMeter> = this.filterMeters(this.facilityMeters);
      this.calanderizedMeterData = this.calanderizationService.getCalanderizedMeterData(filteredMeters, false);
      this.tablePageNumbers = this.calanderizedMeterData.map(() => { return 1 });
    }
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }

  filterMeters(meters: Array<IdbUtilityMeter>): Array<IdbUtilityMeter> {
    let filteredMeters: Array<IdbUtilityMeter> = meters;
    //filter by source
    if (this.calanderizedDataFilters) {
      if (!this.calanderizedDataFilters.showAllSources) {
        let selectedSources: Array<string> = new Array();
        this.calanderizedDataFilters.selectedSources.forEach(sourceOption => {
          if(sourceOption.selected){
            selectedSources.push(sourceOption.source);
          }
        })
        filteredMeters = filteredMeters.filter(meter => { return selectedSources.includes(meter.source) });
      }
    }
    return filteredMeters;
  }
}
