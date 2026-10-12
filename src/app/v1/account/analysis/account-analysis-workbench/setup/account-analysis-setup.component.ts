import { Component } from '@angular/core';
import { AccountAnalysisScaffoldPageComponent } from '../scaffold-page/account-analysis-scaffold-page.component';

@Component({
  selector: 'app-account-analysis-setup',
  standalone: true,
  imports: [AccountAnalysisScaffoldPageComponent],
  templateUrl: './account-analysis-setup.component.html',
  styleUrls: ['./account-analysis-setup.component.css']
})
export class AccountAnalysisSetupComponent {}
