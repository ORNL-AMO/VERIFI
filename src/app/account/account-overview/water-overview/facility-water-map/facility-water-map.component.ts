import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import * as _ from 'lodash';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { Subscription } from 'rxjs';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { AccountOverviewService } from '../../account-overview.service';

@Component({
  selector: 'app-facility-water-map',
  templateUrl: './facility-water-map.component.html',
  styleUrls: ['./facility-water-map.component.css']
})
export class FacilityWaterMapComponent implements OnInit {
  @ViewChild('waterConsumptionMap', { static: false }) waterConsumptionMap: ElementRef;


  accountFacilitiesSummary: AccountFacilitiesSummary;
  accountFacilitiesSummarySub: Subscription;
  mapData: Array<{
    lng: string,
    lat: string,
    consumption: number,
    facility: IdbFacility
  }>;



  constructor(private plotlyService: PlotlyService,
    private eGridService: EGridService, private accountDbService: AccountdbService,
    private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesWaterSummary.subscribe(accountFacilitiesSummary => {
      this.accountFacilitiesSummary = accountFacilitiesSummary;
      this.setMapData();
      this.drawChart();
    });


  }

  ngOnDestroy() {
    this.accountFacilitiesSummarySub.unsubscribe();
  }


  ngAfterViewInit() {
    this.drawChart();
  }


  drawChart() {
    if (this.waterConsumptionMap && this.mapData && this.mapData.length != 0) {
      let cmax: number = _.maxBy(this.mapData, 'consumption').consumption;
      // let lats: Array<number> = this.mapData.map(item => { return Number(item.lat) });
      // let lons: Array<number> = this.mapData.map(item => { return Number(item.lng) });

      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      var data = [{
        type: 'scattergeo',
        mode: 'markers',
        // locations: ["CA", "TN", "OK", "MN"],
        lat: this.mapData.map(item => { return item.lat }),
        lon: this.mapData.map(item => { return item.lng }),
        hovertext: this.mapData.map(item => { return item.facility.name + ': ' + (item.consumption).toLocaleString(undefined, { maximumFractionDigits: 0, minimumIntegerDigits: 1 }) + ' ' + selectedAccount.volumeLiquidUnit }),        hoverinfo: 'text',
        text: this.mapData.map(item => { return item.facility.name }),
        marker: {
          text: this.mapData.map(item => { return item.facility.name }),
          size: this.mapData.map(item => { return (item.consumption / cmax) * 25 + 10 }),
          color: this.mapData.map(item => { return item.consumption }),
          cmin: 0,
          cmax: cmax,
          line: {
            color: 'black'
          },
          symbol: 'square'
        },
        name: 'Energy Use Data',
        // locationmode: "USA-states",
      }];

      var layout = {
        'geo': {
          scope: 'usa',
          resolution: 110,
          // projection: {
          //   type: 'albers usa'
          // },
          showland: true,
          landcolor: 'rgb(20, 90, 50)',
          subunitwidth: 1,
          countrywidth: 1,
          subunitcolor: 'rgb(255,255,255)',
          countrycolor: 'rgb(255,255,255)',
          // center:{
          //   lat: _.mean(lats),
          //   lon: _.mean(lons)
          // }
        },
        showlegend: false,
        margin: { "t": 0, "b": 50, "l": 0, "r": 50 },
      };

      let config = {
        displaylogo: false,
        responsive: true,
        scrollZoom: false
      }

      this.plotlyService.newPlot(this.waterConsumptionMap.nativeElement, data, layout, config);
    }
  }

  setMapData() {
    this.mapData = new Array();

    this.accountFacilitiesSummary.facilitySummaries.forEach(summary => {
      let findLatLong = this.eGridService.zipLatLong.find(zipLL => { return zipLL.ZIP == summary.facility.zip });
      if (findLatLong) {
        this.mapData.push({
          facility: summary.facility,
          lng: findLatLong.LNG,
          lat: findLatLong.LAT,
          consumption: summary.consumption,
        });
      }
    })
  }
}
