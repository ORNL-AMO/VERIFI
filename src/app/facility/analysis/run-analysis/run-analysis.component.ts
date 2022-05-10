import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAnalysisItem, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { AnalysisService } from '../analysis.service';

@Component({
  selector: 'app-run-analysis',
  templateUrl: './run-analysis.component.html',
  styleUrls: ['./run-analysis.component.css']
})
export class RunAnalysisComponent implements OnInit {

  constructor(private analysisDbService: AnalysisDbService, private router: Router,
    private analysisService: AnalysisService, private facilityDbService: FacilitydbService,
    private utlityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    if (!analysisItem) {
      this.router.navigateByUrl('/analysis/analysis-dashboard')
    } else {
      this.analysisService.setCalanderizedMeters();
    }
  }
}
