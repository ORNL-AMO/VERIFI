import { Component, OnInit } from '@angular/core';
import { SharedDataService } from '../helper-services/shared-data.service';

@Component({
  selector: 'app-table-items-dropdown',
  templateUrl: './table-items-dropdown.component.html',
  styleUrls: ['./table-items-dropdown.component.css']
})
export class TableItemsDropdownComponent implements OnInit {

  itemsPerPage: number;
  constructor(private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.itemsPerPage = this.sharedDataService.itemsPerPage.getValue();
  }

  save(){
    this.sharedDataService.itemsPerPage.next(this.itemsPerPage);
  }
}
