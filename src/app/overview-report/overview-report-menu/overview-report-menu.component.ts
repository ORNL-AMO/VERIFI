import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-overview-report-menu',
  templateUrl: './overview-report-menu.component.html',
  styleUrls: ['./overview-report-menu.component.css']
})
export class OverviewReportMenuComponent implements OnInit {

  showFilterDropdown: boolean = false;
  constructor() { }

  ngOnInit(): void {
  }


  toggleFilterMenu(){
    this.showFilterDropdown = !this.showFilterDropdown;
  }
}
