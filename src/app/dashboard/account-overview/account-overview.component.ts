import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-account-overview',
  templateUrl: './account-overview.component.html',
  styleUrls: ['./account-overview.component.css', '../dashboard.component.css']
})
export class AccountOverviewComponent implements OnInit {

  todaysDate: Date;
  yearAgoDate: Date;
  constructor() { }

  ngOnInit(): void {
    this.todaysDate = new Date();
    this.yearAgoDate = new Date((this.todaysDate.getFullYear() - 1), this.todaysDate.getMonth());    
  }

}
