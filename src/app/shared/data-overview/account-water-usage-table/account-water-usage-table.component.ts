import { Component, Input } from '@angular/core';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';

@Component({
  selector: 'app-account-water-usage-table',
  templateUrl: './account-water-usage-table.component.html',
  styleUrls: ['./account-water-usage-table.component.css']
})
export class AccountWaterUsageTableComponent {
  @Input()
  accountOverviewData: AccountOverviewData;
  @Input()
  waterUnit: string;

  constructor() {
  }

  ngOnInit() {
  }

}