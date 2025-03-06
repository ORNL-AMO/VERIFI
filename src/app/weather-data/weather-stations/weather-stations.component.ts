import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { WeatherStation } from 'src/app/models/degreeDays';
import { WeatherDataService } from '../weather-data.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { Subscription } from 'rxjs';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { CountryList } from './country-list';

@Component({
  selector: 'app-weather-stations',
  templateUrl: './weather-stations.component.html',
  styleUrls: ['./weather-stations.component.css'],
  standalone: false
})
export class WeatherStationsComponent {

  zipCode: string;
  furthestDistance: number = 75;
  stations: Array<WeatherStation> = [];
  useFacility: boolean = false;

  facilities: Array<IdbFacility>;
  facilitySub: Subscription;
  selectedFacilityId: string;
  fetchingData: boolean = false;
  addressString: string;
  city: string;
  country: string;
  CountryList = CountryList;

  addressLatLong: {
    latitude: number,
    longitude: number,
  };
  listByCountry: boolean = false;
  constructor(private accountDbService: AccountdbService,
    private weatherDataService: WeatherDataService,
    private facilityDbService: FacilitydbService) {

  }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.accountFacilities.subscribe(val => {
      this.facilities = val;
      this.checkSelectedFacility();
    })
    if (!this.weatherDataService.zipCode) {
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      this.zipCode = selectedAccount.zip;
    } else {
      this.zipCode = this.weatherDataService.zipCode;
    }
    this.selectedFacilityId = this.weatherDataService.selectedFacility?.guid;
    this.setStations();
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
  }

  async setStations() {
    console.log(this.country);
    if (this.listByCountry && this.country) {
      console.log(this.country);
      this.fetchingData = true;
      this.stations = await this.weatherDataService.getStationsByCountry(this.country);
      this.fetchingData = false;
    } else if (this.addressString) {
      this.addressLatLong = await this.weatherDataService.getLocation(this.addressString);
      console.log(this.addressLatLong);
      if (this.addressLatLong.latitude && this.furthestDistance) {
        this.fetchingData = true;
        this.stations = await this.weatherDataService.getStationsLatLong(this.addressLatLong, this.furthestDistance);
        this.fetchingData = false;
      } else {
        this.fetchingData = false;
        this.stations = [];
      }
    }
  }

  toggleUseZip() {
    this.useFacility = !this.useFacility;
    if (this.useFacility && this.facilities.length > 0) {
      this.selectedFacilityId = this.facilities[0].guid;
      this.changeFacility();
      this.setStations();
    } else {
      this.weatherDataService.selectedFacility = undefined;
      this.setStations();
    }
  }

  checkSelectedFacility() {
    if (this.weatherDataService.selectedFacility) {
      let facilityExists: IdbFacility = this.facilities.find(facility => { return facility.guid == this.weatherDataService.selectedFacility.guid });
      if (facilityExists) {
        this.useFacility = true;
        this.zipCode = this.weatherDataService.selectedFacility.zip;
      }
    }
  }

  changeFacility() {
    this.weatherDataService.selectedFacility = this.facilities.find(facility => { return facility.guid == this.selectedFacilityId });
    this.zipCode = this.weatherDataService.selectedFacility?.zip;
    this.setStations();
  }

  clearStations() {
    this.stations = [];
  }
}
