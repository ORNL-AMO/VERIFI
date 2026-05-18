import { Component, computed, effect, inject, OnInit, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith, Subscription } from 'rxjs';
import { AnalysisGroupStatusCheck } from 'src/app/calculations/status-check-calculations/analysisGroupStatusCheck';
import { AnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/analysisStatusCheck';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisGroup } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

interface GroupsList {
  group: AnalysisGroup,
  groupStatusCheck: AnalysisGroupStatusCheck
}

@Component({
  selector: 'app-analysis-banner',
  templateUrl: './analysis-banner.component.html',
  styleUrls: ['./analysis-banner.component.css'],
  standalone: false
})
export class AnalysisBannerComponent {
  private router: Router = inject(Router);
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  url: Signal<string> = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );
  analysisItem: Signal<IdbAnalysisItem> = toSignal(this.analysisDbService.selectedAnalysisItem);
  modalOpen: Signal<boolean> = toSignal(this.sharedDataService.modalOpen);
  analysisItems: Signal<Array<IdbAnalysisItem>> = toSignal(this.analysisDbService.facilityAnalysisItems);
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);


  analysisStatusCheck: Signal<AnalysisStatusCheck> = computed(() => {
    const facilityStatusCheck = this.facilityStatusCheck();
    const analysisItem = this.analysisItem();
    if (!facilityStatusCheck || !analysisItem) {
      return undefined;
    }
    return facilityStatusCheck.getAnalysisStatusById(analysisItem.guid);
  });

  groupsList: Signal<Array<GroupsList>> = computed(() => {
    const analysisStatusCheck = this.analysisStatusCheck();
    const analysisItem = this.analysisItem();
    if (!analysisStatusCheck || !analysisItem) {
      return [];
    }
    return analysisItem.groups.map(group => {
      const groupStatusCheck: AnalysisGroupStatusCheck = analysisStatusCheck.getGroupStatusChecksByGroupId(group.idbGroupId);
      return {
        group: group,
        groupStatusCheck: groupStatusCheck
      }
    });
  });

  inRunAnalysis: Signal<boolean> = computed(() => {
    const url: string = this.url();
    return url.includes('run-analysis');
  });


  showDropdown: boolean = false;

  constructor() {
    effect(() => {
      const url = this.url();
      this.showDropdown = false;
    });
  }

  goToDashboard() {
    this.router.navigateByUrl('/data-evaluation/analysis/analysis-dashboard')
  }

  toggleShow() {
    this.showDropdown = !this.showDropdown;
  }

  selectItem(item: IdbAnalysisItem) {
    this.analysisDbService.selectedAnalysisItem.next(item);
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/analysis/run-analysis/analysis-setup');
    this.showDropdown = false;
  }
}
