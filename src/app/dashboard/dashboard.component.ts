import { Component, OnInit, Renderer2, ViewChild, ElementRef, Input } from '@angular/core';
import { AccountService } from "../account/account/account.service";
import { AccountdbService } from "../indexedDB/account-db.service";
import { FacilitydbService } from "../indexedDB/facility-db-service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityMeterdbService } from "../indexedDB/utilityMeter-db-service";
import { UtilityMeterDatadbService } from "../indexedDB/utilityMeterData-db-service";
import { UtilityService } from "../utility/utility.service";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  title = 'verifi';
  accountid: number;
  facilityid: number;
  utilities: any;
  calendarData: any = [];
  calendarMonths: any = [];
  calendarVol: any = [];
  calendarCost: any = [];
  meterList: any;
  meterListData: any = [];
  avgUse: any = 0;
  avgCost: any = 0;
  meterListType: any = [];
  xMonths = ['2020-01', '2020-02', '2020-03', '2020-04', '2020-05', '2020-06', '2020-07', '2020-08', '2020-09', '2020-10', '2020-11', '2020-12'];

  constructor(
    private renderer: Renderer2,
    private accountService: AccountService,
    private facilityService: FacilityService,
    public accountdbService: AccountdbService,
    public facilitydbService: FacilitydbService,
    public utilityMeterdbService: UtilityMeterdbService,
    public utilityMeterDatadbService: UtilityMeterDatadbService,
    public utilityService: UtilityService
  ) {
    this.renderer.addClass(document.body, 'open');
  }

  ngOnInit() {
    // Observe the accountid var
    this.accountService.getValue().subscribe((value) => {
      this.accountid = value;
    });

    // Observe the facilityid var
    this.facilityService.getValue().subscribe((value) => {
      this.facilityid = value;

      // get current facility object
      this.facilitydbService.getById(this.facilityid).then(
        data => {
          this.meterLoadList();
        },
        error => {
          console.log(error);
        }
      );
    });

    this.utilityService.getMeterList().subscribe((value) => {
      this.utilities = value;
      console.log(this.utilities);
      this.combineCalendar();
    });

    this.meterDataLoadAll();
  }

  meterLoadList() {
    // List all meters
    this.utilityMeterdbService.getAllByIndexRange('facilityId', this.facilityid).then(
      data => {
        this.meterList = data;

        // Count Meter Types for pie chart
        this.meterListType.push(this.meterList.filter((obj) => obj.type == "Electricity").length);
        this.meterListType.push(this.meterList.filter((obj) => obj.type == "Natural Gas").length);
        this.meterListType.push(this.meterList.filter((obj) => obj.type == "Other").length);

        // Add all meter data to meter list
        this.meterDataLoadList();
      },
      error => {
        console.log(error);
      }
    );
  }

  meterDataLoadList() {
    // loop each meter
    for (let i = 0; i < this.meterList.length; i++) {
      // filter meter data based on meterid
      this.utilityMeterDatadbService.getAllByIndexRange('meterId', this.meterList[i]['id']).then(
        data => {
          this.meterList[i]['data'] = data; // set meter data
          this.meterAverages(i, data); // Set meter averages
        },
        error => {
          console.log(error);
        }
      );
    }
  }

  meterDataLoadAll() {
    this.utilityMeterDatadbService.getAll().then(
      data => {
        if (data.length != 0) { // Prevent NAN
          this.meterListData = data; // push all meter data to array
          this.meterDataAverage(); // Set all data averages
        }
      },
      error => {
        console.log(error);
      }
    );
  }

  meterDataAverage() {
    let cost = 0, kwh = 0;

    for (let i = 0; i < this.meterListData.length; i++) {
      cost = cost + +this.meterListData[i]['totalCost'];
      kwh = kwh + +this.meterListData[i]['totalKwh'];
    }
    this.avgUse = kwh / this.meterListData.length;
    this.avgCost = cost / this.meterListData.length;
  }

  meterAverages(i, data) {
    if (data.length != 0) { // Prevent NAN
      // Loop Meter Data
      let totalCost = 0;
      for (let j = 0; j < data.length; j++) {
        totalCost = +totalCost + +data[j]['totalCost']; // tally up total cost for this meter
      }

      // Set meter averages
      this.meterList[i]['avgCost'] = +totalCost / +data.length;
      this.meterList[i]['avgUse'] = +totalCost / +data.length;
      this.meterList[i]['avgCostCompare'] = (+this.avgCost - +this.meterList[i]['avgCost']).toFixed(2);;
      this.meterList[i]['avgUseCompare'] = (+this.avgUse - +this.meterList[i]['avgUse']).toFixed(2);;
    } else {

      // Set meter averages
      this.meterList[i]['avgCost'] = 0;
      this.meterList[i]['avgUse'] = 0;
      this.meterList[i]['avgCostCompare'] = 0;
      this.meterList[i]['avgUseCompare'] = 0;
    }
  }

  combineCalendar() {
    for (let i = 0; i < this.utilities.length; i++) {
      for (let j = 0; j < this.utilities[i]['calendarization'].length; j++) {
        this.calendarData.push(this.utilities[i]['calendarization'][j]);
      }
    }
    for (let i = 0; i < this.calendarData.length; i++) {
      this.calendarMonths.push(this.calendarData[i]['month']);
      this.calendarVol.push(this.calendarData[i]['monthKwh']);
      this.calendarCost.push(this.calendarData[i]['monthCost']);
    }
  }

  public graph1 = {
    data: [
      { x: this.calendarMonths, y: this.calendarVol, type: 'scatter', mode: 'lines+points', marker: { color: '#2980b9' }, fill: 'tozeroy', name: 'Volume' },
      { x: this.calendarMonths, y: this.calendarCost, type: 'scatter', mode: 'lines+points', marker: { color: '#17a1b8' }, fill: 'tonexty', name: 'Cost' }
    ],
    layout: {
      height: 160,
      margin: { l: 50, r: 50, b: 50, t: 50, pad: 20 },
      xaxis: {
        'tickformat': '%b',
        'dtick': 'M1'
      }
    },
    config: { responsive: true }
  };

  public graph2 = {
    data: [
      { x: this.calendarMonths, y: this.calendarCost, type: 'scatter', mode: 'lines+points', marker: { color: 'orange' }, fill: 'tozeroy' },
    ],
    layout: {
      height: 130,
      margin: { l: 40, r: 40, b: 50, t: 50, pad: 20 },
      xaxis: {
        'tickformat': '%b',
        'dtick': 'M1'
      }
    },
    config: { responsive: true }
  };
  public graph3 = {
    data: [
      { values: this.meterListType, labels: ['Electricity', 'Natural Gas', 'Other'], type: 'pie', marker: { colors: ['#2c386b', '#2980b9', '#17a1b8'] } },
    ],
    layout: { height: 250, margin: { l: 10, r: 10, b: 10, t: 10, pad: 10 } },
    config: { responsive: true },
  };

  public graph4 = {
    data: [
      { x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], y: [2, 5, 3, 2, 5, 3, 2, 5, 3, 1, 8, 13], type: 'scatter', mode: 'lines+points', marker: { color: '#FFE400' } },
      { x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], y: [2, 5, 3, 2, 5, 3, 2, 5, 3, 1, 8, 13], type: 'bar', marker: { color: '#f39c11' } },
    ],
    layout: { height: 250, margin: { l: 40, r: 40, b: 50, t: 50, pad: 20 } },
    config: { responsive: true }
  };

}
