import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, effect, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AccountAnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/accountAnalysisStatusCheck';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-account-analysis-banner',
  templateUrl: './account-analysis-banner.component.html',
  styleUrls: ['./account-analysis-banner.component.css'],
  standalone: false
})
export class AccountAnalysisBannerComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private router: Router = inject(Router);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  modalOpen: Signal<boolean> = toSignal(this.sharedDataService.modalOpen);
  accountAnalysisItem: Signal<IdbAccountAnalysisItem> = this.accountWorkspaceStore.selectedAccountAnalysis;
  accountAnalysisItems: Signal<Array<IdbAccountAnalysisItem>> = computed(() => [...this.accountWorkspaceStore.accountAnalyses()]);
  accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck);

  inDashboard: Signal<boolean> = computed(() => {
    const url = this.url();
    return url.includes('dashboard') || (url == '/data-evaluation/account/analysis');
  });

  url: Signal<string> = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  analysisStatusCheck: Signal<AccountAnalysisStatusCheck> = computed(() => {
    const accountAnalysisItem = this.accountAnalysisItem();
    const accountStatusCheck = this.accountStatusCheck();
    if(accountAnalysisItem && accountStatusCheck) {
      return accountStatusCheck.getAccountAnalysisStatusCheckById(accountAnalysisItem.guid);
    }
    return undefined;
  });

  showDropdown: boolean = false;

  constructor() {
    effect(() => {
      this.showDropdown = false;
    })
  }

  goToDashboard() {
    this.router.navigateByUrl('/data-evaluation/account/analysis/dashboard')
  }

  toggleShow() {
    this.showDropdown = !this.showDropdown;
  }

  selectItem(item: IdbAccountAnalysisItem) {
    this.accountWorkspaceService.selectAccountAnalysis((item)?.guid);
    this.router.navigateByUrl('/data-evaluation/account/analysis/setup');
  }
}
