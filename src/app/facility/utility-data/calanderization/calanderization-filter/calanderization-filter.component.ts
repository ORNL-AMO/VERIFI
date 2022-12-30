import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Month, Months } from 'src/app/shared/form-data/months';
import { CalanderizationFilters } from 'src/app/models/calanderization';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-calanderization-filter',
  templateUrl: './calanderization-filter.component.html',
  styleUrls: ['./calanderization-filter.component.css']
})
export class CalanderizationFilterComponent implements OnInit {

  calanderizedDataFilters: CalanderizationFilters;
  calanderizedDataFiltersSub: Subscription;

  months: Array<Month> = Months;
  yearOptions: Array<number> = [];
  constructor(private calanderizationService: CalanderizationService) { }

  ngOnInit(): void {
    this.calanderizedDataFiltersSub = this.calanderizationService.calanderizedDataFilters.subscribe(val => {
      this.calanderizedDataFilters = val;
      this.setYearOptions();
    });
  }

  ngOnDestroy() {
    this.calanderizedDataFiltersSub.unsubscribe();
  }

  save() {
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
