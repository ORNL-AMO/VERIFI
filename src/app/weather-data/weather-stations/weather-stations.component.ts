import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { WeatherStation } from 'src/app/models/degreeDays';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { WeatherDataService } from '../weather-data.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-weather-stations',
  templateUrl: './weather-stations.component.html',
  styleUrls: ['./weather-stations.component.css']
})
export class WeatherStationsComponent {

  zipCode: string;
  furthestDistance: number = 75;
  stations: Array<WeatherStation> = [];
  useFacility: boolean = false;

  facilities: Array<IdbFacility>;
  facilitySub: Subscription;
  constructor(private accountDbService: AccountdbService, private degreeDaysService: DegreeDaysService,
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
    this.setStations();
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
  }


  setStations() {
    this.weatherDataService.zipCode = this.zipCode;
    if(this.furthestDistance <= 500){
      this.degreeDaysService.getClosestStation(this.zipCode, this.furthestDistance).then(stations => {
        this.stations = stations;
      });
    }
  }

  toggleUseZip() {
    this.useFacility = !this.useFacility;
    if (this.useFacility && this.facilities.length > 0) {
      this.zipCode = this.facilities[0].zip;
    } else {
      this.weatherDataService.selectedFacility = undefined;
    }
    this.setStations();
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
    let facilityExists: IdbFacility = this.facilities.find(facility => { return facility.zip == this.zipCode });
    this.weatherDataService.selectedFacility = facilityExists;
    this.setStations();
  }
}
