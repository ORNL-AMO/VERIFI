import { Component, OnInit } from '@angular/core';
import { AccountAnalysisService } from '../account-analysis.service';

@Component({
  selector: 'app-account-analysis-results',
  templateUrl: './account-analysis-results.component.html',
  styleUrls: ['./account-analysis-results.component.css']
})
export class AccountAnalysisResultsComponent implements OnInit {

  constructor(private accountAnalysisService: AccountAnalysisService) { }

  ngOnInit(): void {
    this.accountAnalysisService.setCalanderizedMeters();
  }

}
