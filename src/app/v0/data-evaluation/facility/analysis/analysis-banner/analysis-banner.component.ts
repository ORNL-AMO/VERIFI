import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { DestroyRef, Input, Component, computed, effect, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AnalysisGroupStatusCheck } from '@domain/calculations/status-check-calculations/analysisGroupStatusCheck';
import { AnalysisStatusCheck } from '@domain/calculations/status-check-calculations/analysisStatusCheck';
import { FacilityStatusCheck } from '@domain/calculations/status-check-calculations/facilityStatusCheck';
import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { SharedDataService } from '@shared/helper-services/shared-data.service';

interface GroupsList {
  group: AnalysisGroup,
  groupStatusCheck: AnalysisGroupStatusCheck | undefined
}

@Component({
  selector: 'app-analysis-banner',
  templateUrl: './analysis-banner.component.html',
  styleUrls: ['./analysis-banner.component.css'],
  standalone: false
})
export class AnalysisBannerComponent {
  @Input() beforeNavigate: () => Promise<boolean> = () => Promise.resolve(true);
  private readonly destroyRef = inject(DestroyRef);
  private switching = false;
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private router: Router = inject(Router);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  url: Signal<string> = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );
  analysisItem: Signal<IdbAnalysisItem> = this.accountWorkspaceStore.selectedFacilityAnalysis;
  modalOpen: Signal<boolean> = toSignal(this.sharedDataService.modalOpen);
  analysisItems: Signal<Array<IdbAnalysisItem>> = computed(() => [...[...this.accountWorkspaceStore.selectedFacilityAnalyses()]]);
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
    if (!analysisItem) {
      return [];
    }
    return analysisItem.groups.map(group => {
      const groupStatusCheck = analysisStatusCheck?.getGroupStatusChecksByGroupId(group.idbGroupId);
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
      this.showDropdown = false;
    });
  }

  async goToDashboard() {
    const context = this.navigationContext();
    if (await this.beforeNavigate() && this.isCurrent(context)) {
      await this.router.navigateByUrl('/data-evaluation/analysis/analysis-dashboard');
    }
  }

  toggleShow() {
    this.showDropdown = !this.showDropdown;
  }

  async selectItem(item: IdbAnalysisItem): Promise<void> {
    if (this.switching) { return; }
    this.switching = true;
    const context = this.navigationContext();
    try {
      if (!await this.beforeNavigate() || !this.isCurrent(context)) { return; }
      const target = this.analysisItems().find(analysis => analysis.guid === item.guid
        && analysis.accountId === context.accountGuid && analysis.facilityId === context.facilityGuid);
      if (!target) { return; }
      const url = '/data-evaluation/facility/' + context.facilityGuid + '/analysis/run-analysis/analysis-setup';
      if (url !== context.url) {
        if (!await this.router.navigateByUrl(url) || !this.isCurrent(context, url, null)) { return; }
      }
      if (!this.analysisItems().some(analysis => analysis.guid === target.guid
        && analysis.accountId === context.accountGuid && analysis.facilityId === context.facilityGuid)) { return; }
      this.accountWorkspaceService.selectFacilityAnalysis(target.guid);
      this.showDropdown = false;
    } finally {
      this.switching = false;
    }
  }

  private navigationContext() {
    return {
      accountGuid: this.accountWorkspaceStore.account()?.guid,
      facilityGuid: this.accountWorkspaceStore.selectedFacility()?.guid,
      analysisGuid: this.analysisItem()?.guid,
      url: this.router.url,
      navigationId: this.router.currentNavigation?.()?.id ?? null
    };
  }

  private isCurrent(context: ReturnType<AnalysisBannerComponent['navigationContext']>, url = context.url, navigationId = context.navigationId): boolean {
    return !this.destroyRef.destroyed && this.accountWorkspaceStore.account()?.guid === context.accountGuid
      && this.accountWorkspaceStore.selectedFacility()?.guid === context.facilityGuid
      && this.analysisItem()?.guid === context.analysisGuid && this.router.url === url
      && (this.router.currentNavigation?.()?.id ?? null) === navigationId;
  }
}
