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


  page = [];
  itemsPerPage = 12;
  pageSize = [];

  calanderizedMeterData: Array<CalanderizedMeter>
  facilityMetersSub: Subscription;
  facilityMeterDataSub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;
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
      console.log(this.calanderizedMeterData);
    }
  }


  setMeterPages() {
    for (let i = 0; i < this.calanderizedMeterData.length; i++) {
      this.page.push(1);
      this.pageSize.push(1);
    }
  }

  public onPageChange(index, pageNum: number): void {
    this.pageSize[index] = this.itemsPerPage * (pageNum - 1);
  }

  public changePagesize(num: number): void {
    this.itemsPerPage = num;

    for (let i = 0; i < this.calanderizedMeterData.length; i++) {
      this.onPageChange(i, this.page[i]);
    }

  }
}
