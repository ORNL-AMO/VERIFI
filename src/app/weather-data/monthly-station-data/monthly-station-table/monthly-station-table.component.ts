import { Component, Input } from '@angular/core';
import { DetailDegreeDay } from 'src/app/models/degreeDays';
import { Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-monthly-station-table',
  templateUrl: './monthly-station-table.component.html',
  styleUrls: ['./monthly-station-table.component.css']
})
export class MonthlyStationTableComponent {
  @Input()
  detailedDegreeDays: Array<DetailDegreeDay>;

  currentPageNumber: number = 1;
  itemsPerPage: number = 6;
  itemsPerPageSub: Subscription;
  constructor(
    private sharedDataService: SharedDataService){
  }

  ngOnInit() {
    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.itemsPerPageSub.unsubscribe();
  }
}
