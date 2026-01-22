import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import * as _ from 'lodash';

@Component({
  selector: 'app-annual-operating-conditions-form',
  standalone: false,
  templateUrl: './annual-operating-conditions-form.component.html',
  styleUrl: './annual-operating-conditions-form.component.css',
})
export class AnnualOperatingConditionsFormComponent {
  @Input({ required: true })
  annualOperatingConditionsDataForm: FormGroup;

  yearOptions: Array<{ year: number, selected: boolean }>
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit() {
    this.setYearOptions();
  }

  setYearOptions() {
    this.yearOptions = new Array();
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let dates: Array<Date> = facilityMeterData.map(meterData => { return new Date(meterData.readDate) });
    let years: Array<number> = dates.map(date => { return date.getFullYear() });
    years = _.uniq(years);
    let startYear: number = _.min(years);
    let endYear: number = _.max(years);
    for (let year = startYear; year <= endYear; year++) {
      this.yearOptions.push({ year: year, selected: true });
    }
  }

  removeOperatingConditionsData() {

  }
}
