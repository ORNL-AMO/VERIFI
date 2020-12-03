import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizationService, CalanderizedMeter } from './calanderization.service';

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
  constructor(private calanderizationService: CalanderizationService, private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.calanderizedMeterData = this.calanderizationService.calanderizeFacilityMeters(facilityMeters);
    });
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
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
