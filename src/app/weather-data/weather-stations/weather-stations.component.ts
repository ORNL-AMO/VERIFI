import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { WeatherStation } from 'src/app/models/degreeDays';
import { IdbAccount } from 'src/app/models/idb';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';

@Component({
  selector: 'app-weather-stations',
  templateUrl: './weather-stations.component.html',
  styleUrls: ['./weather-stations.component.css']
})
export class WeatherStationsComponent {

  zipCode: string;
  furthestDistance: number = 40;
  stations: Array<WeatherStation> = [];
  constructor(private accountDbService: AccountdbService, private degreeDaysService: DegreeDaysService) {

  }

  ngOnInit() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.zipCode = selectedAccount.zip;
    this.setStations();
  }

  setStations() {
    console.log('SET STATIONS');
    this.degreeDaysService.getClosestStation(this.zipCode, this.furthestDistance).then(stations => {
      this.stations = stations;
      console.log(this.stations)
    });
  }
}
