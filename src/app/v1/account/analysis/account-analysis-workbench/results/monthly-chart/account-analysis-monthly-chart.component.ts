import { Component } from '@angular/core';
import { AccountAnalysisScaffoldPageComponent } from '../../scaffold-page/account-analysis-scaffold-page.component';

@Component({
  selector: 'app-account-analysis-monthly-chart',
  standalone: true,
  imports: [AccountAnalysisScaffoldPageComponent],
  templateUrl: './account-analysis-monthly-chart.component.html',
  styleUrls: ['./account-analysis-monthly-chart.component.css']
})
export class AccountAnalysisMonthlyChartComponent {}
