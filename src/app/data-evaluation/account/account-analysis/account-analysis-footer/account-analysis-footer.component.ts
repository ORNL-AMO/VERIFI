import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, inject, OnInit, Signal } from '@angular/core';
import { filter, map, startWith, Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountAnalysisService } from '../account-analysis.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { AnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/analysisStatusCheck';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { AccountAnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/accountAnalysisStatusCheck';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';

@Component({
  selector: 'app-account-analysis-footer',
  templateUrl: './account-analysis-footer.component.html',
  styleUrls: ['./account-analysis-footer.component.css'],
  standalone: false
})
export class AccountAnalysisFooterComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  private router: Router = inject(Router);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private accountAnalysisDbService: AccountAnalysisDbService = inject(AccountAnalysisDbService);
  private dataEvaluationService: DataEvaluationService = inject(DataEvaluationService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private accountWorkspaceService = inject(AccountWorkspaceService);

  helpWidth: Signal<number> = toSignal(this.dataEvaluationService.helpWidthBs);
  sidebarWidth: Signal<number> = toSignal(this.dataEvaluationService.sidebarWidthBs);
  analysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountAnalysisDbService.selectedAnalysisItem);
  accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck);
  selectedFacility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  facilities = this.accountWorkspaceStore.facilities;
  account: Signal<IdbAccount> = this.accountWorkspaceStore.account;

  url: Signal<string> = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  inDashboard: Signal<boolean> = computed(() => {
    const url = this.url();
    return url.includes('dashboard');
  });

  showContinue: Signal<boolean> = computed(() => {
    const url = this.url();
    return url.includes('/results/monthly-analysis') == false;
  });

  analysisStatusCheck: Signal<AccountAnalysisStatusCheck> = computed(() => {
    const analysisItem = this.analysisItem();
    const accountStatusCheck = this.accountStatusCheck();
    if (analysisItem && accountStatusCheck) {
      return accountStatusCheck.getAccountAnalysisStatusCheckById(analysisItem.guid);
    }
    return undefined;
  });

  canContinue: Signal<boolean> = computed(() => {
    const url = this.url();
    const analysisItem = this.analysisItem();
    const analysisStatusCheck = this.analysisStatusCheck();
    const selectedFacility = this.selectedFacility();
    if (url && analysisItem && analysisStatusCheck && selectedFacility) {
      if (url.includes('setup')) {
        return !analysisStatusCheck.accountAnalysisSetupErrors.hasSetupErrors;
      } else if (url.includes('select-items')) {
        const hasSelection = analysisItem.facilityAnalysisItems.find(item => item.facilityId == selectedFacility.guid);
        return hasSelection.analysisItemId != undefined;
      }
    }
    return true;
  });

  goBack() {
    if (this.router.url.includes('setup')) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/dashboard');
    } else if (this.router.url.includes('account/analysis/select-items')) {
      const facilities: Array<IdbFacility> = this.facilities().map(facility => ({ ...facility }));
      const selectedFacility: IdbFacility = this.selectedFacility();
      const facilityIndex: number = facilities.findIndex(facility => { return facility.guid == selectedFacility.guid });
      if (facilityIndex == 0) {
        this.router.navigateByUrl('/data-evaluation/account/analysis/setup');
      } else {
        this.accountWorkspaceService.selectFacility(facilities[facilityIndex - 1].guid);
      }
    } else if (this.router.url.includes('results')) {
      if (this.router.url.includes('monthly-analysis')) {
        this.router.navigateByUrl('/data-evaluation/account/analysis/results/annual-analysis');
      } else {
        const facilities: Array<IdbFacility> = this.facilities().map(facility => ({ ...facility }));
        this.accountWorkspaceService.selectFacility(facilities[facilities.length - 1].guid);
        this.router.navigateByUrl('/data-evaluation/account/analysis/select-items');
      }
    }
  }

  continue() {
    if (this.router.url.includes('setup')) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/select-items');
    } else if (this.router.url.includes('select-items')) {
      const facilities: Array<IdbFacility> = this.facilities().map(facility => ({ ...facility }));
      const selectedFacility: IdbFacility = this.selectedFacility();
      const facilityIndex: number = facilities.findIndex(facility => { return facility.guid == selectedFacility.guid });
      if (facilityIndex == facilities.length - 1) {
        this.router.navigateByUrl('/data-evaluation/account/analysis/results/annual-analysis');
      } else {
        this.accountWorkspaceService.selectFacility(facilities[facilityIndex + 1].guid);
      }
    } else if (this.router.url.includes('results')) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/results/monthly-analysis');
    }
  }

  returnToDashboard() {
    this.router.navigateByUrl('/data-evaluation/account/analysis/dashboard');
  }
}
