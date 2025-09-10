import { Component, OnInit } from '@angular/core';
import { SharedDataService } from '../helper-services/shared-data.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-table-items-dropdown',
    templateUrl: './table-items-dropdown.component.html',
    styleUrls: ['./table-items-dropdown.component.css'],
    standalone: false
})
export class TableItemsDropdownComponent implements OnInit {

  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  constructor(private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  save(){
    this.sharedDataService.itemsPerPage.next(this.itemsPerPage);
  }

  ngOnDestroy() {
    this.itemsPerPageSub.unsubscribe();
  }
}
