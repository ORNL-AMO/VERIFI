import { Component, Input, OnInit } from '@angular/core';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAnalysisItem, IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';
@Component({
  selector: 'app-facility-card',
  templateUrl: './facility-card.component.html',
  styleUrls: ['./facility-card.component.css']
})
export class FacilityCardComponent implements OnInit {
  @Input()
  facility: IdbFacility;


  lastBill: IdbUtilityMeterData;
  meterDataUpToDate: boolean;
  hasCurrentYearAnalysis: IdbAnalysisItem;
  lastYear: number;
  constructor(private analysisDbService: AnalysisDbService, private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.lastYear = new Date().getUTCFullYear() - 1;
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == this.facility.guid });
    this.lastBill = _.maxBy(facilityMeterData, (data: IdbUtilityMeterData) => { return new Date(data.readDate) });
    this.checkMeterDataUpToDate();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => { return item.facilityId == this.facility.guid });
    this.hasCurrentYearAnalysis = facilityAnalysisItems.find(item => {
      return item.reportYear == this.lastYear;
    })

  }


  checkMeterDataUpToDate() {
    if (this.lastBill) {
      let lastBillDate: Date = new Date(this.lastBill.readDate);
      let todaysDate: Date = new Date();
      //todo enhance check
      if (lastBillDate.getUTCFullYear() == todaysDate.getUTCFullYear() && lastBillDate.getUTCMonth() >= todaysDate.getUTCMonth() - 1) {
        this.meterDataUpToDate = true;
      } else {
        this.meterDataUpToDate = false;
      }
    } else {
      this.meterDataUpToDate = false;
    }
  }

}
