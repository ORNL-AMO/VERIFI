import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { DetailDegreeDay, WeatherDataSelection } from 'src/app/models/degreeDays';
import { Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';

@Component({
  selector: 'app-monthly-station-table',
  templateUrl: './monthly-station-table.component.html',
  styleUrls: ['./monthly-station-table.component.css'],
  standalone: false
})
export class MonthlyStationTableComponent {
  @Input()
  detailedDegreeDays: Array<DetailDegreeDay>;
  @Input()
  weatherDataSelection: WeatherDataSelection;
  @ViewChild('dataTable', { static: false }) dataTable: ElementRef;
  copyingTable: boolean = false;

  currentPageNumber: number = 1;
  itemsPerPage: number = 6;
  itemsPerPageSub: Subscription;

  orderDataField: string = 'time';
  orderByDirection: 'asc' | 'desc' = 'asc';
  constructor(
    private sharedDataService: SharedDataService,
    private copyTableService: CopyTableService) {
  }

  ngOnInit() {
    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.itemsPerPageSub.unsubscribe();
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

  copyTable() {
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.dataTable);
      this.copyingTable = false;
    }, 200)
  }

}
