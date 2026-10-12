import { Component } from '@angular/core';
import { AccountAnalysisScaffoldPageComponent } from '../../scaffold-page/account-analysis-scaffold-page.component';

@Component({
  selector: 'app-account-analysis-monthly-table',
  standalone: true,
  imports: [AccountAnalysisScaffoldPageComponent],
  templateUrl: './account-analysis-monthly-table.component.html',
  styleUrls: ['./account-analysis-monthly-table.component.css']
})
export class AccountAnalysisMonthlyTableComponent {}
