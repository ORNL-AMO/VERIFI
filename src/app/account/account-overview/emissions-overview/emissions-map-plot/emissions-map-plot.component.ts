import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';

@Component({
  selector: 'app-emissions-map-plot',
  templateUrl: './emissions-map-plot.component.html',
  styleUrls: ['./emissions-map-plot.component.css']
})
export class EmissionsMapPlotComponent implements OnInit {
  @ViewChild('emissionsMapPlot', { static: false }) emissionsMapPlot: ElementRef;

  constructor(private plotlyService: PlotlyService, private facilityDbService: FacilitydbService,
    private eGridService: EGridService) { }

  ngOnInit(): void {
    // this.accountFacilitiesSub = this.accountOverviewService.accountFacilitiesSummary.subscribe(val => {
    //   this.setBarChartData();
    //   this.drawChart();
    // });
  }

  ngAfterViewInit() {
    this.drawChart();
  }


  drawChart() {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let locations: Array<string> = facilities.map(facility => {return facility.state});
    console.log(locations);
    let latLong: Array<{lat: string, long: string}> = new Array();
    facilities.forEach(facility => {
      let findLatLong = this.eGridService.zipLatLong.find(zipLL => {return zipLL.ZIP == facility.zip});
      if(findLatLong){
        console.log('ayooo');
        latLong.push({
          lat: findLatLong.LAT,
          long: findLatLong.LNG
        });
      }
    })

    var data = [{
      type: 'scattergeo',
      mode: 'markers',
      // locations: ["CA", "TN", "OK", "MN"],
      lat: latLong.map(item => {return item.lat}),
      lon: latLong.map(item => {return item.long}),
      marker: {
        size: [20, 30, 15, 10],
        color: [10, 20, 40, 50],
        cmin: 0,
        cmax: 50,
        colorscale: 'Greens',
        colorbar: {
          title: 'Some rate',
          ticksuffix: '%',
          showticksuffix: 'last'
        },
        line: {
          color: 'black'
        }
      },
      name: 'europe data',
      
      locationmode: "USA-states",
    }];

    var layout = {
      'geo': {
        'scope': 'usa',
        'resolution': 50
      }
    };

    this.plotlyService.newPlot(this.emissionsMapPlot.nativeElement, data, layout);
  }
}
