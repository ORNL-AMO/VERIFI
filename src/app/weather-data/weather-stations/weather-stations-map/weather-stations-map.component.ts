import { Component, SimpleChanges, ElementRef, ViewChild, Input } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { WeatherStation } from 'src/app/models/degreeDays';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-weather-stations-map',
  templateUrl: './weather-stations-map.component.html',
  styleUrls: ['./weather-stations-map.component.css'],
  standalone: false
})
export class WeatherStationsMapComponent {
  @Input()
  stations: Array<WeatherStation>
  @Input()
  zipCode: string;
  @Input()
  furthestDistance: number;
  @Input()
  addressLatLong: {
    latitude: number,
    longitude: number,
  };

  @ViewChild('weatherStationMap', { static: false }) weatherStationMap: ElementRef;

  mapData: Array<{
    lng: string,
    lat: string,
    name: string,
    isZip: boolean
  }>;
  scope: string;
  constructor(private plotlyService: PlotlyService,
    private eGridService: EGridService) { }

  ngOnInit(): void {
    this.setMapData();
  }


  ngAfterViewInit() {
    this.drawChart();
    // this.drawChart2();
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes.stations && !changes.stations.isFirstChange())) {
      this.setMapData();
      this.drawChart();
    }
    // if ((changes.addressLatLong && !changes.addressLatLong.isFirstChange())) {
    //     this.drawChart2();
    // }
  }

  drawChart() {
    if (this.weatherStationMap && this.mapData && this.mapData.length != 0) {
      // let zipCodeItem: {
      //   lng: string,
      //   lat: string,
      //   name: string,
      //   isZip: boolean
      // } = this.mapData.find(item => { return item.isZip == true });

      var data = [{
        type: 'scattergeo',
        mode: 'markers',
        lat: this.mapData.map(item => { return item.lat }),
        lon: this.mapData.map(item => { return item.lng }),
        // hovertext: this.getHoverData(),
        hoverinfo: 'text',
        text: this.mapData.map(item => { return item.name }),
        marker: {
          text: this.mapData.map(item => { return item.name }),
          size: this.mapData.map(item => {
            if (item.isZip) {
              return 15;
            } else {
              return 10;
            }
          }),
          color: this.mapData.map(item => {
            if (item.isZip) {
              return 'red';
            } else {
              return 'blue';
            }
          }),
          // cmin: 0,
          // cmax: cmax,
          line: {
            color: 'black'
          },
          // symbol: this.getSymbol()
        },
        // name: this.getName(),

        // locationmode: "USA-states",
      }];

      var layout = {
        'geo': {
          scope: 'world',
          resolution: 110,
          showland: true,
          showcountries: true,
          showsubunits: true,
          // landcolor: 'rgb(20, 90, 50)',
          // subunitwidth: 1,
          // countrywidth: 1,
          // subunitcolor: 'rgb(255,255,255)',
          // countrycolor: 'rgb(255,255,255)',
          center: {
            lat: this.addressLatLong?.latitude.toString(),
            lng: this.addressLatLong?.longitude.toString(),
          },
          zoom: 3
          // projection: {
          //   scale: this.getScale()
          // }
        },
        showlegend: false,
        margin: { "t": 0, "b": 50, "l": 0, "r": 50 },
      };

      let config = {
        displaylogo: false,
        responsive: true,
        // scrollZoom: false
      }

      this.plotlyService.newPlot(this.weatherStationMap.nativeElement, data, layout, config);
    }
  }

  setMapData() {
    this.mapData = this.stations.map(station => {
      return {
        lat: station.lat,
        lng: station.lon,
        name: station.name,
        isZip: false
      }
    });
    if (this.addressLatLong) {
      this.mapData.push({
        lat: this.addressLatLong.latitude.toString(),
        lng: this.addressLatLong.longitude.toString(),
        name: "Address Location",
        isZip: true
      })
    }
    console.log(this.stations);
    let countries: Array<string> = this.stations.flatMap(station => {
      return station.country
    });
    countries = _.uniq(countries);
    console.log(countries);

    // let locationLatLong: { ZIP: string, LAT: string, LNG: string } = this.eGridService.zipLatLong.find(zipLL => { return zipLL.ZIP == this.zipCode });
    // if (locationLatLong) {
    //   this.mapData.push({
    //     lat: locationLatLong.LAT,
    //     lng: locationLatLong.LNG,
    //     name: this.zipCode,
    //     isZip: true
    //   })
    // }
  }

  getScale() {
    if (this.furthestDistance < 10) {
      return 25;
    } else if (this.furthestDistance >= 10 && this.furthestDistance < 150) {
      return 10;
    } else if (this.furthestDistance >= 150 && this.furthestDistance < 500) {
      return 5;
    } else {
      return 1;
    }
  }

}
