import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountAnalysisService } from '../account-analysis.service';
import { AnalysisValidationService } from 'src/app/shared/helper-services/analysis-validation.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Component({
    selector: 'app-select-facility-analysis-items',
    templateUrl: './select-facility-analysis-items.component.html',
    styleUrls: ['./select-facility-analysis-items.component.css'],
    standalone: false
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
  showInUseMessage: boolean;
  constructor(private facilityDbService: FacilitydbService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router,
    private accountAnalysisService: AccountAnalysisService,
    private analysisValidationService: AnalysisValidationService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private accountReportDbService: AccountReportDbService) { }

  ngOnInit(): void {
    this.selectedAnalysisItemSub = this.accountAnalysisDbService.selectedAnalysisItem.subscribe(item => {
      this.selectedAnalysisItem = item;
      this.setShowInUseMessage();
      this.initializeSelectedFacilitiesItems();
      this.setFacilitiesList();
    })

    if (!this.selectedAnalysisItem) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/dashboard')
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
    if (this.selectedAnalysisItem.analysisCategory == 'energy') {
      this.facilityAnalysisItems = accountAnalysisItems.filter(item => {
        return (item.analysisCategory == this.selectedAnalysisItem.analysisCategory
          && item.facilityId == this.selectedFacility.guid
          && item.reportYear == this.selectedAnalysisItem.reportYear
          && item.energyIsSource == this.selectedAnalysisItem.energyIsSource
          && (item.baselineYear == this.selectedAnalysisItem.baselineYear || this.selectedFacility.isNewFacility));
      });
    } else if (this.selectedAnalysisItem.analysisCategory == 'water') {
      this.facilityAnalysisItems = accountAnalysisItems.filter(item => {
        return (item.analysisCategory == this.selectedAnalysisItem.analysisCategory
          && item.facilityId == this.selectedFacility.guid
          && item.reportYear == this.selectedAnalysisItem.reportYear
          && (item.baselineYear == this.selectedAnalysisItem.baselineYear || this.selectedFacility.isNewFacility));
      });
    }
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

  async initializeSelectedFacilitiesItems() {
    if (!this.selectedAnalysisItem.facilityItemsInitialized) {
      let findItemSelected = this.selectedAnalysisItem.facilityAnalysisItems.find(item => {
        return item.analysisItemId != undefined;
      });
      if (!findItemSelected) {
        let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
        this.selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
          let facilityItem: IdbAnalysisItem = accountAnalysisItems.find(accountItem => {
            return (accountItem.reportYear == this.selectedAnalysisItem.reportYear
              && accountItem.facilityId == item.facilityId
              && accountItem.selectedYearAnalysis
              && accountItem.baselineYear == this.selectedAnalysisItem.baselineYear
              && accountItem.analysisCategory == this.selectedAnalysisItem.analysisCategory);
          });
          if (facilityItem) {
            item.analysisItemId = facilityItem.guid;
          } else {
            item.analysisItemId = undefined;
          }
        });
        this.selectedAnalysisItem.facilityItemsInitialized = true;
        let analysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
        this.selectedAnalysisItem.setupErrors = this.analysisValidationService.getAccountAnalysisSetupErrors(this.selectedAnalysisItem, analysisItems);
        await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(this.selectedAnalysisItem));
        let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
        await this.dbChangesService.setAccountAnalysisItems(account, false);
        this.accountAnalysisDbService.selectedAnalysisItem.next(this.selectedAnalysisItem);
      }
    }
  }


  setShowInUseMessage() {
    let hasCorrespondingReport: boolean = this.accountReportDbService.getHasCorrespondingReport(this.selectedAnalysisItem.guid);
    if (hasCorrespondingReport && this.accountAnalysisService.hideInUseMessage == false) {
      this.showInUseMessage = true;
    }
  }

  hideInUseMessage() {
    this.showInUseMessage = false;
    this.accountAnalysisService.hideInUseMessage = true;
  }
}
