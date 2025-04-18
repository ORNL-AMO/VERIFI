import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Component({
    selector: 'app-run-analysis',
    templateUrl: './run-analysis.component.html',
    styleUrls: ['./run-analysis.component.css'],
    standalone: false
})
export class RunAnalysisComponent implements OnInit {

  constructor(private analysisDbService: AnalysisDbService, private router: Router) { }

  ngOnInit(): void {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    if (!analysisItem) {
      this.router.navigateByUrl('/analysis/analysis-dashboard')
    }
  }
}
