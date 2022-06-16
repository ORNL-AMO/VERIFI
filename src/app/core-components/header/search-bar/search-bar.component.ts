import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, OperatorFunction } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { OverviewReportService } from 'src/app/account/overview-report/overview-report.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbOverviewReportOptions, IdbUtilityMeter } from 'src/app/models/idb';

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
    private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
  }

  setOptions() {
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
        idbReportOptions: undefined,
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
        idbReportOptions: undefined,
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
        idbReportOptions: undefined,
        facilityAnalysisItem: item,
        accountAnalysisItem: undefined,
        facilityColor: facility.color
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
      //todo: route to results if item setup
      this.router.navigateByUrl('account/analysis/setup');
    } else if (item.type == 'facilityAnalysis') {
      this.analysisDbService.selectedAnalysisItem.next(item.facilityAnalysisItem);
      this.router.navigateByUrl('facility/' + item.facilityId + '/analysis/run-analysis');
    } else if (item.type == 'report') {
      this.overviewReportOptionsDbService.selectedOverviewReportOptions.next(item.idbReportOptions);
      this.overviewReportService.reportOptions.next(item.idbReportOptions.reportOptions);
      if (item.idbReportOptions.reportOptions.reportType == 'data') {
        this.router.navigateByUrl('/account/reports/basic-report');
      } else if (item.idbReportOptions.reportOptions.reportType == 'betterPlants') {
        this.router.navigateByUrl('/account/reports/better-plants-report');
      }
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
  idbReportOptions: IdbOverviewReportOptions,
  facilityAnalysisItem: IdbAnalysisItem,
  accountAnalysisItem: IdbAccountAnalysisItem,
  facilityColor: string
}