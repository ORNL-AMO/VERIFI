import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-utility-usage-map',
  templateUrl: './utility-usage-map.component.html',
  styleUrls: ['./utility-usage-map.component.css']
})
export class UtilityUsageMapComponent implements OnInit {
  @ViewChild('utilityUsageMap', { static: false }) utilityUsageMap: ElementRef;



  mapData: Array<{
    lng: string,
    lat: string,
    energyUse: number,
    facility: IdbFacility
  }>;



  constructor(private plotlyService: PlotlyService, private facilityDbService: FacilitydbService,
    private eGridService: EGridService, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,) { }

  ngOnInit(): void {
    this.setBarChartData();
  }

  ngAfterViewInit() {
    this.drawChart();
  }


  drawChart() {
    // let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    // let locations: Array<string> = facilities.map(facility => { return facility.state });
    // console.log(locations);
    // let latLong: Array<{ lat: string, long: string }> = new Array();
    // facilities.forEach(facility => {
    //   let findLatLong = this.eGridService.zipLatLong.find(zipLL => { return zipLL.ZIP == facility.zip });
    //   if (findLatLong) {
    //     console.log('ayooo');
    //     latLong.push({
    //       lat: findLatLong.LAT,
    //       long: findLatLong.LNG
    //     });
    //   }
    // })

    let cmax: number = _.maxBy(this.mapData, 'energyUse').energyUse;

    var data = [{
      type: 'scattergeo',
      mode: 'markers',
      // locations: ["CA", "TN", "OK", "MN"],
      lat: this.mapData.map(item => { return item.lat }),
      lon: this.mapData.map(item => { return item.lng }),
      hovertext: this.mapData.map(item => {return item.facility.name + ': ' + item.energyUse}),
      hoverinfo: 'text',
      text: this.mapData.map(item => {return item.facility.name}),
      marker: {
        text: this.mapData.map(item => {return item.facility.name}),
        size: this.mapData.map(item => { return (item.energyUse / cmax) * 50 }),
        color: this.mapData.map(item => { return item.energyUse }),
        cmin: 0,
        cmax: cmax,
        // colorscale: 'Greens',
        colorbar: {
          title: 'Energy Consumption',
          // ticksuffix: '%',
          // showticksuffix: 'last'
        },
        line: {
          color: 'black'
        }
      },
      name: 'Energy Use Data',
      // hovertemplate:  '%{label}: %{value:,.0f} <extra></extra>'

      // locationmode: "USA-states",
    }];

    var layout = {
      'geo': {
        scope: 'usa',
        // 'resolution': 50
        // projection: {
        //   type: 'albers usa'
        // },
        showland: true,
        landcolor: 'rgb(217, 217, 217)',
        subunitwidth: 1,
        countrywidth: 1,
        subunitcolor: 'rgb(255,255,255)',
        countrycolor: 'rgb(255,255,255)'
      },

      margin: { "t": 50, "b": 50, "l": 50, "r": 50 },
    };

    console.log(data);

    this.plotlyService.newPlot(this.utilityUsageMap.nativeElement, data, layout);
  }

  setBarChartData() {
    this.mapData = new Array();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMeterData: Array<IdbUtilityMeterData> = new Array();
    accountMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForAccount(meter, true);
      accountMeterData = accountMeterData.concat(meterData)
    });
    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    accountFacilites.forEach(facility => {


      let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == facility.guid });
      let energyUse: number = 0;
      facilityMeterData.forEach(dataItem => {
        let meter: IdbUtilityMeter = this.utilityMeterDbService.getFacilityMeterById(dataItem.meterId);
        if (meter) {
          if (meter.source == 'Electricity') {
            energyUse = (energyUse + Number(dataItem.totalEnergyUse));
          }
          else if (meter.source == 'Natural Gas') {
            energyUse = (energyUse + Number(dataItem.totalEnergyUse));
          }
          else if (meter.source == 'Other Fuels') {
            energyUse = (energyUse + Number(dataItem.totalEnergyUse));
          }
          else if (meter.source == 'Other Energy') {
            energyUse = (energyUse + Number(dataItem.totalEnergyUse));
          }
        }
      });
      if (facility) {
        let findLatLong = this.eGridService.zipLatLong.find(zipLL => { return zipLL.ZIP == facility.zip });
        if (findLatLong) {
          console.log('ayooo');
          this.mapData.push({
            facility: facility,
            lng: findLatLong.LNG,
            lat: findLatLong.LAT,
            energyUse: energyUse,
          });
        }
      }
    });
  }
}
