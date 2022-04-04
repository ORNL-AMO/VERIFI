import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-select-facility-analysis-items',
  templateUrl: './select-facility-analysis-items.component.html',
  styleUrls: ['./select-facility-analysis-items.component.css']
})
export class SelectFacilityAnalysisItemsComponent implements OnInit {

  facilities: Array<IdbFacility>;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  accountAnalysisItems: Array<IdbAnalysisItem>;
  constructor(private facilityDbService: FacilitydbService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router) { }

  ngOnInit(): void {
    this.selectedAnalysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();
    if (!this.selectedAnalysisItem) {
      this.router.navigateByUrl('/account/analysis/dashboard')
    }
    this.facilities = this.facilityDbService.accountFacilities.getValue();
    this.accountAnalysisItems = this.analysisDbService.accountAnalysisItems.getValue();
  }

}
