import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { WeatherStation } from 'src/app/models/degreeDays';
import { NominatimLocation, WeatherDataService } from '../weather-data.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-weather-stations',
  templateUrl: './weather-stations.component.html',
  styleUrls: ['./weather-stations.component.css'],
  standalone: false
})
export class WeatherStationsComponent {

  furthestDistance: number = 75;
  stations: Array<WeatherStation> = [];
  useFacility: boolean = false;

  facilities: Array<IdbFacility>;
  facilitySub: Subscription;
  selectedFacilityId: string;
  fetchingData: boolean = false;
  addressString: string;
  addressLatLong: {
    latitude: number,
    longitude: number,
  } = {
      latitude: undefined,
      longitude: undefined,
    };
  listByCountry: boolean = false;

  addressLookupItems: Array<NominatimLocation> = [];
  searchingLatLong: boolean = false;
  isLocationSearch: boolean = true;
  selectedLocationId: number;
  stationSearchError: boolean = false;

  stateLines = {
    type: 'scattergeo',
    mode: 'lines',
    lat: [],
    lon: [],
    line: {
      color: 'gray',
      width: 1
    },
    showlegend: false
  };
  constructor(
    private weatherDataService: WeatherDataService,
    private facilityDbService: FacilitydbService) {
  }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.accountFacilities.subscribe(val => {
      this.facilities = val;
    });
    this.addressString = this.weatherDataService.addressSearchStr
    if(this.addressString){
      this.searchLatLong();
    }
    this.setStateLines();
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    this.weatherDataService.addressSearchStr = this.addressString;
  }



  async setStations() {
    if (this.addressLatLong.latitude && this.addressLatLong.longitude && this.furthestDistance) {
      this.fetchingData = true;
      this.stationSearchError = false;
      try {
        this.stations = await this.weatherDataService.getStationsLatLong(this.addressLatLong, this.furthestDistance);
        this.fetchingData = false;
      } catch (err) {
        console.log(err)
        this.stationSearchError = true;
        this.stations = [];
        this.fetchingData = false;
      }
    } else {
      this.fetchingData = false;
      this.stations = [];
    }
  }

  async searchLatLong() {
    this.selectedLocationId = undefined;
    this.searchingLatLong = true;
    this.addressLookupItems = await this.weatherDataService.getLocation(this.addressString);
    this.searchingLatLong = false;
    if (this.addressLookupItems.length > 0) {
      this.selectedLocationId = this.addressLookupItems[0].place_id
      this.setLatLongFromItem(this.addressLookupItems[0]);
      this.setStations();
    }
    this.stationSearchError = false;
  }

  async setLatLongFromItem(item: NominatimLocation) {
    this.addressLatLong = {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon)
    }
    this.stations = [];
  }

  toggleUseZip() {
    this.useFacility = !this.useFacility;
    if (this.useFacility && this.facilities.length > 0) {
      this.selectedFacilityId = this.facilities[0].guid;
      this.changeFacility();
    } else {
      this.weatherDataService.selectedFacility = undefined;
    }
  }

  async changeFacility() {
    if (this.selectedFacilityId) {
      let facility: IdbFacility = this.facilities.find(facility => { return facility.guid == this.selectedFacilityId });
      this.addressString = facility.city + ', ' + facility.country;
    } else {
      this.addressString = '';
    }
    await this.searchLatLong();
    await this.setStations();
  }

  clearStations() {
    this.stations = [];
  }

  setStateLines() {

    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_1_states_provinces_lines.geojson')
      .then(response => response.json())
      .then(statesData => {

        statesData.features.forEach(feature => {
          if (feature.geometry.type === 'MultiLineString') {
            feature.geometry.coordinates.forEach(line => {
              line.forEach(coord => {
                this.stateLines.lat.push(coord[1]);
                this.stateLines.lon.push(coord[0]);
              });
              this.stateLines.lat.push(null); // Add null to separate line segments
              this.stateLines.lon.push(null);
            });
          } else if (feature.geometry.type === 'LineString') {
            feature.geometry.coordinates.forEach(coord => {
              this.stateLines.lat.push(coord[1]);
              this.stateLines.lon.push(coord[0]);
            });
            this.stateLines.lat.push(null); // Add null to separate line segments
            this.stateLines.lon.push(null);
          }
        });

      });
  }
}
