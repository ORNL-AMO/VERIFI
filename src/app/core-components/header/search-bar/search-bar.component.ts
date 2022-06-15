import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, OperatorFunction } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { AccountAnalysisService } from 'src/app/account/account-analysis/account-analysis.service';
import { OverviewReportService } from 'src/app/account/overview-report/overview-report.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbOverviewReportOptions, IdbUtilityMeter } from 'src/app/models/idb';

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
    private accountDbService: AccountdbService, private utilityMeterDbService: UtilityMeterdbService,
    private analysisDbService: AnalysisDbService, private accountAnalysisDbService: AccountAnalysisDbService,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    // this.facilityDbService.accountFacilities.subscribe(val => {
    //   if (val) {
    //     this.facilityList = val.map(facility => { return { name: facility.name, guid: facility.guid, id: facility.id } });
    //   }
    // });
    console.log('init');
    this.setOptions();
  }

  setOptions() {
    // let accountItems: Array<IdbAccount> = this.accountDbService.allAccounts.getValue();
    let facilityItems: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    let analysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let reportOptions: Array<IdbOverviewReportOptions> = this.overviewReportOptionsDbService.accountOverviewReportOptions.getValue();
    this.dropdownOptions = new Array();
    facilityItems.forEach(item => {
      this.dropdownOptions.push({
        name: item.name,
        type: 'facility',
        facilityId: item.id,
        facilityGuid: item.guid,
        meterId: undefined,
        idbReportOptions: undefined,
        facilityAnalysisItem: undefined,
        accountAnalysisItem: undefined
      })
    });
    meters.forEach(item => {
      this.dropdownOptions.push({
        name: item.name,
        type: 'meter',
        facilityId: undefined,
        facilityGuid: item.facilityId,
        meterId: item.id,
        idbReportOptions: undefined,
        facilityAnalysisItem: undefined,
        accountAnalysisItem: undefined
      })
    });
    accountAnalysisItems.forEach(item => {
      this.dropdownOptions.push({
        name: item.name,
        type: 'accountAnalysis',
        facilityId: undefined,
        facilityGuid: undefined,
        meterId: undefined,
        idbReportOptions: undefined,
        facilityAnalysisItem: undefined,
        accountAnalysisItem: item
      })
    })
    analysisItems.forEach(item => {
      this.dropdownOptions.push({
        name: item.name,
        type: 'facilityAnalysis',
        facilityId: undefined,
        facilityGuid: item.facilityId,
        meterId: undefined,
        idbReportOptions: undefined,
        facilityAnalysisItem: item,
        accountAnalysisItem: undefined
      })
    })
    reportOptions.forEach(reportOptions => {
      this.dropdownOptions.push({
        name: reportOptions.name,
        type: 'report',
        facilityId: undefined,
        facilityGuid: undefined,
        meterId: undefined,
        idbReportOptions: reportOptions,
        facilityAnalysisItem: undefined,
        accountAnalysisItem: undefined
      })
    })
  }

  search: OperatorFunction<string, readonly DropdownOption[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 2 ? []
        : this.dropdownOptions.filter(v => v.name.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    )

  formatter = (x: { name: string }) => x.name;

  selectValue(item: DropdownOption) {
    if (item.type == 'facility') {
      this.router.navigateByUrl('facility/' + item.facilityId)
    } else if (item.type == 'meter') {
      let facilityItems: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      let facility: IdbFacility = facilityItems.find(facilityItem => { return facilityItem.guid == item.facilityGuid });
      this.router.navigateByUrl('facility/' + facility.id + '/utility/energy-consumption/utility-meter/' + item.meterId);
    } else if (item.type == 'accountAnalysis') {
      this.accountAnalysisDbService.selectedAnalysisItem.next(item.accountAnalysisItem);
      //todo: route to results if item setup
      this.router.navigateByUrl('account/analysis/setup');
    } else if (item.type == 'facilityAnalysis') {
      let facilityItems: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      let facility: IdbFacility = facilityItems.find(facilityItem => { return facilityItem.guid == item.facilityGuid });
      this.analysisDbService.selectedAnalysisItem.next(item.facilityAnalysisItem);
      this.router.navigateByUrl('facility/' + facility.id + '/analysis/run-analysis');
    } else if (item.type == 'report') {
      this.overviewReportOptionsDbService.selectedOverviewReportOptions.next(item.idbReportOptions);
      this.overviewReportService.reportOptions.next(item.idbReportOptions.reportOptions);
      if(item.idbReportOptions.reportOptions.reportType == 'data'){
        this.router.navigateByUrl('/account/reports/basic-report');
      }else if(item.idbReportOptions.reportOptions.reportType == 'betterPlants'){
        this.router.navigateByUrl('/account/reports/better-plants-report');
      }
    }
  }

  selectItem(event: { item: DropdownOption }) {
    this.selectValue(event.item);
  }
}


export interface DropdownOption {
  name: string,
  type: 'facility' | 'meter' | 'report' | 'accountAnalysis' | 'facilityAnalysis',
  facilityId: number,
  facilityGuid: string,
  // accountId: number,
  meterId: number,
  idbReportOptions: IdbOverviewReportOptions,
  facilityAnalysisItem: IdbAnalysisItem,
  accountAnalysisItem: IdbAccountAnalysisItem
}