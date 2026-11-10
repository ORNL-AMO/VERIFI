import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { DestroyRef, Input, Component, computed, inject, Signal } from '@angular/core';
import { filter, map, startWith } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { AnalysisGroup } from '@data/models/analysis';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { DataEvaluationService } from '@v0/data-evaluation/data-evaluation.service';
import { AnalysisSetupErrors, GroupAnalysisErrors } from '@data/models/validation';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { FacilityStatusCheck } from '@domain/calculations/status-check-calculations/facilityStatusCheck';
import { AnalysisStatusCheck } from '@domain/calculations/status-check-calculations/analysisStatusCheck';
@Component({
  selector: 'app-analysis-footer',
  templateUrl: './analysis-footer.component.html',
  styleUrls: ['./analysis-footer.component.css'],
  standalone: false
})
export class AnalysisFooterComponent {
  @Input() beforeNavigate: () => Promise<boolean> = () => Promise.resolve(true);
  private readonly destroyRef = inject(DestroyRef);
  private navigating = false;
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private router: Router = inject(Router);
  private analysisService: AnalysisService = inject(AnalysisService);
  private dataEvaluationService: DataEvaluationService = inject(DataEvaluationService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  analysisItem: Signal<IdbAnalysisItem> = this.accountWorkspaceStore.selectedFacilityAnalysis;
  selectedGroup: Signal<AnalysisGroup> = toSignal(this.analysisService.selectedGroup);
  helpWidth: Signal<number> = toSignal(this.dataEvaluationService.helpWidthBs);
  sidebarWidth: Signal<number> = toSignal(this.dataEvaluationService.sidebarWidthBs);
  accountAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.analysisService.accountAnalysisItem);
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);
  facility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;

  url = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  analysisStatusCheck: Signal<AnalysisStatusCheck> = computed(() => {
    const facilityStatusCheck = this.facilityStatusCheck();
    const analysisItem = this.analysisItem();
    if (!facilityStatusCheck || !analysisItem) {
      return undefined;
    }
    const analysisStatusCheck: AnalysisStatusCheck = facilityStatusCheck.analysisStatusChecks.find(asc => asc.analysisItem.guid === analysisItem.guid);
    return analysisStatusCheck
  });

  setupErrors: Signal<AnalysisSetupErrors> = computed(() => {
    const analysisStatusCheck = this.analysisStatusCheck();
    return analysisStatusCheck ? analysisStatusCheck.analysisSetupErrors : undefined;
  });

  showContinue: Signal<boolean> = computed(() => {
    const currentUrl = this.url();
    return currentUrl.includes('account-analysis') == false;
  });

  disableContinue: Signal<boolean> = computed(() => {
    const setupErrors: AnalysisSetupErrors = this.setupErrors();
    const analysisItem: IdbAnalysisItem = this.analysisItem();
    const selectedGroup: AnalysisGroup = this.selectedGroup();
    const url: string = this.url();
    if (!analysisItem || !setupErrors) {
      return true;
    }
    if (url.includes('analysis-setup')) {
      if (setupErrors.setupHasError) {
        return true;
      } else {
        return false;
      }
    }
    if (url.includes('group-analysis')) {
      if (!selectedGroup) {
        return true;
      }
      if (selectedGroup.analysisType == 'skip' || selectedGroup.analysisType == 'skipAnalysis') {
        return false;
      }
      const groupErrors: GroupAnalysisErrors = setupErrors.groupErrors.find(groupError => { return groupError.groupId == selectedGroup.idbGroupId });
      if (groupErrors) {
        if (url.includes('options')) {
          if (groupErrors.hasErrors) {
            if (groupErrors.invalidAverageBaseload || groupErrors.invalidMonthlyBaseload
              || groupErrors.missingGroupMeters || groupErrors.noProductionVariables || groupErrors.missingProductionVariables) {
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        } else if (url.includes('model-selection')) {
          if (groupErrors.hasErrors) {
            if (groupErrors.hasRegressionErrors) {
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        } else {
          return false;
        }
      }
      return true;
    }
  });

  showGoBackToAccount: Signal<boolean> = computed(() => {
    const accountAnalysisItem = this.accountAnalysisItem();
    return accountAnalysisItem !== undefined;
  });

  goBack(): Promise<boolean | void> {
    return this.navigateAfterSave(() => {
      const facility: IdbFacility = this.facility();
      const selectedGroup: AnalysisGroup = this.selectedGroup();
      const analysisItem: IdbAnalysisItem = this.analysisItem();
      const facilityUrlStr: string = '/data-evaluation/facility/' + facility.guid + '/analysis/run-analysis/';
      if (this.router.url.includes('account-analysis')) {
        return this.router.navigateByUrl(facilityUrlStr + 'facility-analysis/monthly-analysis');
      } else if (this.router.url.includes('facility-analysis')) {
        if (this.router.url.includes('monthly-analysis')) {
          return this.router.navigateByUrl(facilityUrlStr + 'facility-analysis/annual-analysis');
        } else {
          return this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + analysisItem.groups[analysisItem.groups.length - 1].idbGroupId + '/monthly-analysis');
        }
      } else if (this.router.url.includes('group-analysis')) {
        if (this.router.url.includes('monthly-analysis')) {
          return this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/annual-analysis');
        } else if (this.router.url.includes('annual-analysis')) {
          if (selectedGroup.analysisType == 'regression') {
            return this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/model-selection');
          } else {
            return this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/options');
          }
        } else if (this.router.url.includes('model-selection')) {
          return this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/options');
        } else if (this.router.url.includes('options')) {
          let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == selectedGroup.idbGroupId });
          if (groupIndex > 0) {
            if (analysisItem.groups[groupIndex - 1].analysisType == 'skip') {
              return this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + analysisItem.groups[groupIndex - 1].idbGroupId + '/options');
            } else {
              return this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + analysisItem.groups[groupIndex - 1].idbGroupId + '/monthly-analysis');
            }
          } else {
            return this.router.navigateByUrl(facilityUrlStr + 'analysis-setup');
          }
        }
      } else {
        return this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/analysis/analysis-dashboard');
      }
    });
  }

  continue(): Promise<boolean | void> {
    return this.navigateAfterSave(() => {
      const facility: IdbFacility = this.facility();
      const selectedGroup: AnalysisGroup = this.selectedGroup();
      const analysisItem: IdbAnalysisItem = this.analysisItem();
      const facilityUrlStr: string = '/data-evaluation/facility/' + facility.guid + '/analysis/run-analysis/';
      if (this.router.url.includes('analysis-setup')) {
        return this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + analysisItem.groups[0].idbGroupId + '/options');
      } else if (this.router.url.includes('group-analysis')) {
        if (this.router.url.includes('options') && selectedGroup.analysisType != 'skip') {
          if (selectedGroup.analysisType == 'regression') {
            return this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/model-selection');
          } else {
            return this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/annual-analysis');
          }
        } else if (this.router.url.includes('model-selection')) {
          return this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/annual-analysis');
        } else if (this.router.url.includes('annual-analysis')) {
          return this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/monthly-analysis');
        } else {
          let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == selectedGroup.idbGroupId });
          if (groupIndex < analysisItem.groups.length - 1) {
            return this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + analysisItem.groups[groupIndex + 1].idbGroupId + '/options');
          } else {
            return this.router.navigateByUrl(facilityUrlStr + 'facility-analysis/annual-analysis');
          }
        }
      } else if (this.router.url.includes('facility-analysis')) {
        if (this.router.url.includes('annual-analysis')) {
          return this.router.navigateByUrl(facilityUrlStr + 'facility-analysis/monthly-analysis');
        } else {
          return this.router.navigateByUrl(facilityUrlStr + 'account-analysis');
        }
      }
    });
  }

  goBackToAccount(): Promise<boolean | void> {
    return this.navigateAfterSave(() => {
      const accountAnalysisItems: Array<IdbAccountAnalysisItem> = [...this.accountWorkspaceStore.accountAnalyses()];
      const accountAnalysisItem: IdbAccountAnalysisItem = this.accountAnalysisItem();
      if (!accountAnalysisItem) { return; }
      const selectedAnalysisItem: IdbAccountAnalysisItem = accountAnalysisItems.find(item => { return item.guid == accountAnalysisItem.guid })
      if (!selectedAnalysisItem) { return; }
      this.accountWorkspaceService.selectAccountAnalysis((selectedAnalysisItem)?.guid);
      return this.router.navigateByUrl('/data-evaluation/account/analysis/select-items')
    });
  }

  returnToDashboard(): Promise<boolean | void> {
    return this.navigateAfterSave(() => {
      let facility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
      return this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/analysis/analysis-dashboard');
    });
  }

  private async navigateAfterSave(action: () => Promise<boolean> | void): Promise<boolean | void> {
    if (this.navigating) { return; }
    this.navigating = true;
    const accountGuid = this.accountWorkspaceStore.account()?.guid;
    const facilityGuid = this.facility()?.guid;
    const analysisGuid = this.analysisItem()?.guid;
    const url = this.router.url;
    const navigationId = this.router.currentNavigation?.()?.id;
    try {
      if (!await this.beforeNavigate() || this.destroyRef.destroyed
        || this.accountWorkspaceStore.account()?.guid !== accountGuid
        || this.facility()?.guid !== facilityGuid || this.analysisItem()?.guid !== analysisGuid || this.router.url !== url
        || this.router.currentNavigation?.()?.id !== navigationId) { return; }
      return await action();
    } finally {
      this.navigating = false;
    }
  }
}
