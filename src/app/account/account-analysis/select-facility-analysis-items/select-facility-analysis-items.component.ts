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

  facilitiesList: Array<{
    facility: IdbFacility,
    cssClass: string,
    isInvalid: boolean
  }>;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  selectedAnalysisItemSub: Subscription;
  facilityAnalysisItems: Array<IdbAnalysisItem>;
  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  constructor(private facilityDbService: FacilitydbService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router,
    private accountAnalysisService: AccountAnalysisService) { }

  ngOnInit(): void {
    this.selectedAnalysisItemSub = this.accountAnalysisDbService.selectedAnalysisItem.subscribe(item => {
      this.selectedAnalysisItem = item;
      this.setFacilitiesList();
    })

    if (!this.selectedAnalysisItem) {
      this.router.navigateByUrl('/account/analysis/dashboard')
    }
    this.selectedFacilitySub = this.accountAnalysisService.selectedFacility.subscribe(val => {
      if (val) {
        this.selectedFacility = val;
        let checkExists = this.selectedAnalysisItem.facilityAnalysisItems.find(facility => { return this.selectedFacility.guid == facility.facilityId });
        if (!checkExists) {
          this.initSelectedFacility();
        } else {
          this.setFacilityAnlaysisItems();
        }
      } else {
        this.initSelectedFacility();
      }
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.selectedAnalysisItemSub.unsubscribe();
  }

  initSelectedFacility() {
    if (this.facilitiesList && this.facilitiesList.length != 0) {
      this.accountAnalysisService.selectedFacility.next(this.facilitiesList[0].facility);
    }
  }

  selectFacility(facility: IdbFacility) {
    this.accountAnalysisService.selectedFacility.next(facility);
  }

  setFacilityAnlaysisItems() {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    this.facilityAnalysisItems = accountAnalysisItems.filter(item => {
      return item.facilityId == this.selectedFacility.guid && item.reportYear == this.selectedAnalysisItem.reportYear && item.energyIsSource == this.selectedAnalysisItem.energyIsSource
    });
  }

  getClassAndValid(facility: IdbFacility): { cssClass: 'fa fa-square-minus' | 'fa fa-square-check' | 'fa fa-square', isInvalid: boolean } {
    let facilityItem: { facilityId: string, analysisItemId: string } = this.selectedAnalysisItem.facilityAnalysisItems.find(item => { return item.facilityId == facility.guid });
    let cssClass: 'fa fa-square-minus' | 'fa fa-square-check' | 'fa fa-square' = 'fa fa-square';
    let isInvalid: boolean = false;
    if (facilityItem && facilityItem.analysisItemId) {
      if (facilityItem.analysisItemId != 'skip') {
        cssClass = 'fa fa-square-check';
        let analysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
        let item: IdbAnalysisItem = analysisItems.find(item => { return item.guid == facilityItem.analysisItemId });
        if (item) {
          if (item.setupErrors.hasError || item.setupErrors.groupsHaveErrors) {
            isInvalid = true;
          } else {
            isInvalid = false;
          }
        }
      } else {
        cssClass = 'fa fa-square-minus';
        isInvalid = false;
      }
    } else {
      isInvalid = true;
    }
    return { cssClass: cssClass, isInvalid: isInvalid }
  }

  setFacilitiesList() {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.facilitiesList = facilities.map(facility => {
      let data: { cssClass: 'fa fa-square-minus' | 'fa fa-square-check' | 'fa fa-square', isInvalid: boolean } = this.getClassAndValid(facility);
      return {
        facility: facility,
        cssClass: data.cssClass,
        isInvalid: data.isInvalid
      }
    });
  }
}
