import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WeatherDataService } from '../../weather-data.service';
import { WeatherDataSelection } from 'src/app/models/degreeDays';
import { AnnualStationDataSummary } from '../annual-station-data.component';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';

@Component({
  selector: 'app-annual-station-table',
  templateUrl: './annual-station-table.component.html',
  styleUrls: ['./annual-station-table.component.css'],
  standalone: false
})
export class AnnualStationTableComponent {
  @Input()
  yearSummaryData: Array<AnnualStationDataSummary>;
  @Input()
  weatherDataSelection: WeatherDataSelection;
  @ViewChild('dataTable', { static: false }) dataTable: ElementRef;

  currentPageNumber: number = 1;
  itemsPerPage: number = 10;
  copyingTable: boolean = false;

  constructor(private weatherDataService: WeatherDataService, private router: Router,
    private copyTableService: CopyTableService,
    private activatedRoute: ActivatedRoute
  ) {

  }

  gotToMonthSummary(date: Date) {
    this.weatherDataService.selectedMonth = date;
    this.router.navigate(['../monthly-station'], { relativeTo: this.activatedRoute });
  }

  copyTable() {
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.dataTable);
      this.copyingTable = false;
    }, 200)
  }
}
