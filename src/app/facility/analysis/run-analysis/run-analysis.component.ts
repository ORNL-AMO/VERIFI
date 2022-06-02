import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { IdbAnalysisItem } from 'src/app/models/idb';
import { AnalysisService } from '../analysis.service';

@Component({
  selector: 'app-run-analysis',
  templateUrl: './run-analysis.component.html',
  styleUrls: ['./run-analysis.component.css']
})
export class RunAnalysisComponent implements OnInit {

  constructor(private analysisDbService: AnalysisDbService, private router: Router,
    private analysisService: AnalysisService) { }

  ngOnInit(): void {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    if (!analysisItem) {
      this.router.navigateByUrl('/analysis/analysis-dashboard')
    } else {
      this.analysisService.setCalanderizedMeters();
    }
  }
}
