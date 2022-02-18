import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Month, Months } from 'src/app/shared/form-data/months';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizationFilters } from 'src/app/models/calanderization';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-calanderization-filter',
  templateUrl: './calanderization-filter.component.html',
  styleUrls: ['./calanderization-filter.component.css']
})
export class CalanderizationFilterComponent implements OnInit {

  showFilterDropdown: boolean = false;
  calanderizedDataFilters: CalanderizationFilters;
  calanderizedDataFiltersSub: Subscription;

  facilityMetersSub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;


  months: Array<Month> = Months;
  yearOptions: Array<number> = [];
  constructor(private calanderizationService: CalanderizationService, private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.calanderizedDataFiltersSub = this.calanderizationService.calanderizedDataFilters.subscribe(val => {
      this.calanderizedDataFilters = val;
      this.setYearOptions();
    });

    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.facilityMeters = facilityMeters;
      this.setSourceOptions();
    });
  }

  ngOnDestroy() {
    this.calanderizedDataFiltersSub.unsubscribe();
    this.facilityMetersSub.unsubscribe();
  }

  toggleFilterMenu() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  setSourceOptions() {
    this.calanderizedDataFilters.selectedSources = new Array();
    if (this.facilityMeters) {
      if (this.facilityMeters.find(meter => { return meter.source == 'Electricity' })) {
        this.calanderizedDataFilters.selectedSources.push({ source: "Electricity", selected: true });
      }
      if (this.facilityMeters.find(meter => { return meter.source == 'Natural Gas' })) {
        this.calanderizedDataFilters.selectedSources.push({ source: "Natural Gas", selected: true });
      }
      if (this.facilityMeters.find(meter => { return meter.source == 'Other Fuels' })) {
        this.calanderizedDataFilters.selectedSources.push({ source: "Other Fuels", selected: true });
      }
      if (this.facilityMeters.find(meter => { return meter.source == 'Other Energy' })) {
        this.calanderizedDataFilters.selectedSources.push({ source: "Other Energy", selected: true });
      }
      if (this.facilityMeters.find(meter => { return meter.source == 'Water' })) {
        this.calanderizedDataFilters.selectedSources.push({ source: "Water", selected: true });
      }
      if (this.facilityMeters.find(meter => { return meter.source == 'Waste Water' })) {
        this.calanderizedDataFilters.selectedSources.push({ source: "Waste Water", selected: true });
      }
      if (this.facilityMeters.find(meter => { return meter.source == 'Other Utility' })) {
        this.calanderizedDataFilters.selectedSources.push({ source: "Other Utility", selected: true });
      }
    }
  }

  setAll() {
    this.calanderizedDataFilters.selectedSources.forEach(selectedSource => {
      selectedSource.selected = true;
    });
    this.save();
  }

  save() {
    this.calanderizedDataFilters.showAllSources = (this.calanderizedDataFilters.selectedSources.find(source => { return source.selected == false }) == undefined);
    this.calanderizationService.calanderizedDataFilters.next(this.calanderizedDataFilters);
  }

  setYearOptions() {
    if (this.calanderizedDataFilters.dataDateRange && this.calanderizedDataFilters.dataDateRange) {
      this.yearOptions = new Array();
      let start: number = this.calanderizedDataFilters.dataDateRange.minDate.getFullYear();
      let end: number = this.calanderizedDataFilters.dataDateRange.maxDate.getFullYear();
      for (let yearOption = start; yearOption < end + 1; yearOption++) {
        this.yearOptions.push(yearOption);
      }
    }
  }
}
