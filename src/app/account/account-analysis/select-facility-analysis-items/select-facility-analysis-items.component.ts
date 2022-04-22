import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { AccountAnalysisService } from '../account-analysis.service';

@Component({
  selector: 'app-select-facility-analysis-items',
  templateUrl: './select-facility-analysis-items.component.html',
  styleUrls: ['./select-facility-analysis-items.component.css']
})
export class SelectFacilityAnalysisItemsComponent implements OnInit {

  facilities: Array<IdbFacility>;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  facilityAnalysisItems: Array<IdbAnalysisItem>;
  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  constructor(private facilityDbService: FacilitydbService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router,
    private accountAnalysisService: AccountAnalysisService) { }

  ngOnInit(): void {
    this.selectedAnalysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();
    if (!this.selectedAnalysisItem) {
      this.router.navigateByUrl('/account/analysis/dashboard')
    }
    this.facilities = this.facilityDbService.accountFacilities.getValue();
    this.selectedFacilitySub = this.accountAnalysisService.selectedFacility.subscribe(val => {
      if(val){
        this.selectedFacility = val;
        let checkExists = this.selectedAnalysisItem.facilityAnalysisItems.find(facility => {return this.selectedFacility.guid == facility.facilityId});
        if(!checkExists){
          this.initSelectedFacility();
        }else{
          this.setFacilityAnlaysisItems();
        }
      }else{
        this.initSelectedFacility();
      }
    });
  }

  ngOnDestroy(){
    this.selectedFacilitySub.unsubscribe();
  }

  initSelectedFacility(){
    if(this.facilities && this.facilities.length != 0){
      this.accountAnalysisService.selectedFacility.next(this.facilities[0]);
    }
  }

  selectFacility(facility: IdbFacility){
    this.accountAnalysisService.selectedFacility.next(facility);
  }

  setFacilityAnlaysisItems(){
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    this.facilityAnalysisItems = accountAnalysisItems.filter(item => { 
      return item.facilityId == this.selectedFacility.guid && item.reportYear == this.selectedAnalysisItem.reportYear && item.energyIsSource == this.selectedAnalysisItem.energyIsSource
    });
  }
}
