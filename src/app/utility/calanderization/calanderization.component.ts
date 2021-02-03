import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizationService } from '../../shared/helper-services/calanderization.service';

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
  constructor(private calanderizationService: CalanderizationService, private utilityMeterDbService: UtilityMeterdbService, private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
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
  }

  setCalanderizedMeterData() {
    if (this.facilityMeters) {
      this.calanderizedMeterData = this.calanderizationService.getCalanderizedMeterData(this.facilityMeters, false);
      this.tablePageNumbers = this.calanderizedMeterData.map(() => { return 1 });
    }
  }

  setOrderDataField(str: string){
    if(str == this.orderDataField){
      if(this.orderByDirection == 'desc'){
        this.orderByDirection = 'asc';
      }else{
        this.orderByDirection = 'desc';
      }
    }else{
      this.orderDataField = str;
    }
  }
}
