import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, OperatorFunction } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccountAnalysisItem, IdbAccountReport, IdbAnalysisItem, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css']
})
export class SearchBarComponent implements OnInit {

  searchModel: string;
  facilityList: Array<{ name: string, guid: string, id: number }>;


  dropdownOptions: Array<DropdownOption>;

  constructor(private facilityDbService: FacilitydbService, private router: Router,
    private utilityMeterDbService: UtilityMeterdbService,
    private analysisDbService: AnalysisDbService, private accountAnalysisDbService: AccountAnalysisDbService,
    private accountReportsDbService: AccountReportDbService) { }

  ngOnInit(): void {
  }

  setOptions() {
    let facilityItems: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    let analysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let accountReports: Array<IdbAccountReport> = this.accountReportsDbService.accountReports.getValue();
    this.dropdownOptions = new Array();
    facilityItems.forEach(item => {
      this.dropdownOptions.push({
        name: item.name,
        type: 'facility',
        facilityId: item.id,
        facilityGuid: item.guid,
        meterId: undefined,
        idbAccountReport: undefined,
        facilityAnalysisItem: undefined,
        accountAnalysisItem: undefined,
        facilityColor: item.color
      })
    });
    meters.forEach(item => {
      let facility: IdbFacility = this.getFacility(item.facilityId);
      this.dropdownOptions.push({
        name: item.name,
        type: 'meter',
        facilityId: facility.id,
        facilityGuid: item.facilityId,
        meterId: item.id,
        idbAccountReport: undefined,
        facilityAnalysisItem: undefined,
        accountAnalysisItem: undefined,
        facilityColor: facility.color
      })
    });
    accountAnalysisItems.forEach(item => {
      this.dropdownOptions.push({
        name: item.name,
        type: 'accountAnalysis',
        facilityId: undefined,
        facilityGuid: undefined,
        meterId: undefined,
        idbAccountReport: undefined,
        facilityAnalysisItem: undefined,
        accountAnalysisItem: item,
        facilityColor: undefined
      })
    })
    analysisItems.forEach(item => {
      let facility: IdbFacility = this.getFacility(item.facilityId);
      this.dropdownOptions.push({
        name: item.name,
        type: 'facilityAnalysis',
        facilityId: facility.id,
        facilityGuid: item.facilityId,
        meterId: undefined,
        idbAccountReport: undefined,
        facilityAnalysisItem: item,
        accountAnalysisItem: undefined,
        facilityColor: facility.color
      })
    })
    accountReports.forEach(reportOptions => {
      this.dropdownOptions.push({
        name: reportOptions.name,
        type: 'report',
        facilityId: undefined,
        facilityGuid: undefined,
        meterId: undefined,
        idbAccountReport: reportOptions,
        facilityAnalysisItem: undefined,
        accountAnalysisItem: undefined,
        facilityColor: undefined
      })
    })
  }

  //ngb typeahead functions
  search: OperatorFunction<string, readonly DropdownOption[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 2 ? []
        : this.dropdownOptions.filter(v => v.name.toLowerCase().indexOf(term.toLowerCase()) > -1))
    )

  formatter = (x: { name: string }) => x.name;
  //end

  selectValue(item: DropdownOption) {
    if (item.type == 'facility') {
      this.router.navigateByUrl('facility/' + item.facilityId)
    } else if (item.type == 'meter') {
      this.router.navigateByUrl('facility/' + item.facilityId + '/utility/energy-consumption/utility-meter/' + item.meterId);
    } else if (item.type == 'accountAnalysis') {
      this.accountAnalysisDbService.selectedAnalysisItem.next(item.accountAnalysisItem);
      if (item.accountAnalysisItem.setupErrors.hasError || item.accountAnalysisItem.setupErrors.facilitiesSelectionsInvalid) {
        this.router.navigateByUrl('account/analysis/setup');
      } else {
        this.router.navigateByUrl('account/analysis/results');
      }
    } else if (item.type == 'facilityAnalysis') {
      this.analysisDbService.selectedAnalysisItem.next(item.facilityAnalysisItem);
      if (item.facilityAnalysisItem.setupErrors.hasError || item.facilityAnalysisItem.setupErrors.groupsHaveErrors) {
        this.router.navigateByUrl('facility/' + item.facilityId + '/analysis/run-analysis');
      } else {
        this.router.navigateByUrl('facility/' + item.facilityId + '/analysis/run-analysis/facility-analysis');
      }
    } else if (item.type == 'report') {
      this.accountReportsDbService.selectedReport.next(item.idbAccountReport);
      this.router.navigateByUrl('account/reports/setup');
    }
  }

  //used on enter key
  selectItem(event: { item: DropdownOption }) {
    this.selectValue(event.item);
  }

  getFacility(guid: string): IdbFacility {
    let facilityItems: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    return facilityItems.find(facilityItem => { return facilityItem.guid == guid });
  }
}



export interface DropdownOption {
  name: string,
  type: 'facility' | 'meter' | 'report' | 'accountAnalysis' | 'facilityAnalysis',
  facilityId: number,
  facilityGuid: string,
  // accountId: number,
  meterId: number,
  idbAccountReport: IdbAccountReport,
  facilityAnalysisItem: IdbAnalysisItem,
  accountAnalysisItem: IdbAccountAnalysisItem,
  facilityColor: string
}