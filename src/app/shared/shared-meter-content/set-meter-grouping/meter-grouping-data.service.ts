import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CalanderizedMeter } from 'src/app/models/calanderization';

@Injectable({
  providedIn: 'root',
})
export class MeterGroupingDataService {

  calanderizedMeters: BehaviorSubject<Array<CalanderizedMeter>> = new BehaviorSubject<Array<CalanderizedMeter>>([]);
  calanderizingMeterData: BehaviorSubject<boolean | 'error'> = new BehaviorSubject<boolean | 'error'>(false);
}
