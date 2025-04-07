import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WeatherStation } from 'src/app/models/degreeDays';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getWeatherSearchFromFacility } from 'src/app/shared/sharedHelperFuntions';
import { NominatimLocation, WeatherDataService } from 'src/app/weather-data/weather-data.service';

@Component({
  selector: 'app-weather-station-modal',
  standalone: false,

  templateUrl: './weather-station-modal.component.html',
  styleUrl: './weather-station-modal.component.css'
})
export class WeatherStationModalComponent {
  @Input()
  facility: IdbFacility;
  @Output('emitSelectStation')
  emitSelectStation = new EventEmitter<WeatherStation>();

  stations: Array<WeatherStation> = [];

  fetchingData: boolean = false;
  addressString: string;
  addressLatLong: {
    latitude: number,
    longitude: number,
  } = {
      latitude: undefined,
      longitude: undefined,
    };

  addressLookupItems: Array<NominatimLocation> = [];
  searchingLatLong: boolean = false;
  isLocationSearch: boolean = true;
  selectedLocationId: number;
  stationSearchError: boolean = false;
  orderDataField: string = 'distanceFrom';
  orderByDirection: string = 'asc';
  currentPageNumber: number = 1;

  constructor(private weatherDataService: WeatherDataService) {
  }

  ngOnInit() {
    this.addressString = getWeatherSearchFromFacility(this.facility);
    this.searchLatLong();
  }

  async setStations() {
    if (this.addressLatLong.latitude && this.addressLatLong.longitude) {
      this.fetchingData = true;
      this.stationSearchError = false;
      try {
        this.stations = await this.weatherDataService.getStationsLatLong(this.addressLatLong, 50);
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

  clearStations() {
    this.stations = [];
  }

  selectStation(station: WeatherStation) {
    this.emitSelectStation.emit(station);
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }
}
