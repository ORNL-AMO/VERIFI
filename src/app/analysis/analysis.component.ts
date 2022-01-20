import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from '../indexedDB/analysis-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { IdbAnalysisItem, IdbFacility } from '../models/idb';

@Component({
  selector: 'app-analysis',
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.css']
})
export class AnalysisComponent implements OnInit {


  facilityAnalysisItems: Array<IdbAnalysisItem>;
  facilityAnalysisItemsSub: Subscription;
  constructor(private analysisDbService: AnalysisDbService) { }

  ngOnInit(): void {
    this.facilityAnalysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.facilityAnalysisItems = items;
    });
  }

  ngOnDestroy() {
    this.facilityAnalysisItemsSub.unsubscribe();
  }
}
