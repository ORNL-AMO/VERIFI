import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, OperatorFunction } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css'],
  standalone: false
})
export class SearchBarComponent implements OnInit {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  searchModel: string;
  facilityList: Array<{ name: string, guid: string, id: number }>;


  dropdownOptions: Array<DropdownOption>;

  constructor(
    private router: Router
  ) { }

  ngOnInit(): void {
  }

  setOptions() {
    let facilityItems: Array<IdbFacility> = [...this.accountWorkspaceStore.facilities()];
    let meters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.meters()];
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = [...this.accountWorkspaceStore.accountAnalyses()];
    let analysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.facilityAnalyses()];
    let accountReports: Array<IdbAccountReport> = [...this.accountWorkspaceStore.accountReports()];
    this.dropdownOptions = new Array();
    facilityItems.forEach(item => {
      this.dropdownOptions.push({
        name: item.name,
        type: 'facility',
        facilityId: item.id,
        facilityGuid: item.guid,
        meterGuid: undefined,
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
        meterGuid: item.guid,
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
        meterGuid: undefined,
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
        meterGuid: undefined,
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
        meterGuid: undefined,
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
      this.router.navigateByUrl('facility/' + item.facilityGuid)
    } else if (item.type == 'meter') {
      this.router.navigateByUrl('facility/' + item.facilityGuid + '/utility/energy-consumption/utility-meter/' + item.meterGuid);
    } else if (item.type == 'accountAnalysis') {
      this.accountWorkspaceService.selectAccountAnalysis((item.accountAnalysisItem)?.guid);
      this.router.navigateByUrl('account/analysis/setup');
    } else if (item.type == 'facilityAnalysis') {
      this.accountWorkspaceService.selectFacilityAnalysis((item.facilityAnalysisItem)?.guid);
      this.router.navigateByUrl('facility/' + item.facilityGuid + '/analysis/run-analysis');
    } else if (item.type == 'report') {
      this.accountWorkspaceService.selectAccountReport((item.idbAccountReport)?.guid);
      this.router.navigateByUrl('account/reports/setup');
    }
  }

  //used on enter key
  selectItem(event: { item: DropdownOption }) {
    this.selectValue(event.item);
  }

  getFacility(guid: string): IdbFacility {
    let facilityItems: Array<IdbFacility> = [...this.accountWorkspaceStore.facilities()];
    return facilityItems.find(facilityItem => { return facilityItem.guid == guid });
  }
}



export interface DropdownOption {
  name: string,
  type: 'facility' | 'meter' | 'report' | 'accountAnalysis' | 'facilityAnalysis',
  facilityId: number,
  facilityGuid: string,
  // accountId: number,
  meterGuid: string,
  idbAccountReport: IdbAccountReport,
  facilityAnalysisItem: IdbAnalysisItem,
  accountAnalysisItem: IdbAccountAnalysisItem,
  facilityColor: string
}