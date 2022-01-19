import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from '../indexedDB/analysis-db.service';
import { IdbAnalysisItem } from '../models/idb';

@Component({
  selector: 'app-analysis',
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.css']
})
export class AnalysisComponent implements OnInit {


  facilityAnalysisItems: Array<IdbAnalysisItem>;
  facilityAnalysisItemsSub: Subscription;
  constructor(private analysisDbService: AnalysisDbService, private router: Router) { }

  ngOnInit(): void {

    this.facilityAnalysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      if (this.facilityAnalysisItems) {
        this.router.navigateByUrl('/analysis/analysis-dashboard');
      }
      this.facilityAnalysisItems = items;
    });
  }

  ngOnDestroy() {
    this.facilityAnalysisItemsSub.unsubscribe();
  }
}
