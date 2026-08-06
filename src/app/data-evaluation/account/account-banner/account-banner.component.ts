import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { ChangeDetectorRef, Component, computed, ElementRef, HostListener, inject, Signal, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';

@Component({
  selector: 'app-account-banner',
  templateUrl: './account-banner.component.html',
  styleUrls: ['./account-banner.component.css'],
  standalone: false
})
export class AccountBannerComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private cd: ChangeDetectorRef = inject(ChangeDetectorRef);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  @ViewChild('navTabs') navTabs: ElementRef;

  selectedAccount: Signal<IdbAccount> = this.accountWorkspaceStore.account;
  meterData: Signal<Array<IdbUtilityMeterData>> = computed(() => [...this.accountWorkspaceStore.meterData()]);
  accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck);

  disableTabs: Signal<boolean> = computed(() => {
    const meterData = this.meterData();
    return meterData ? meterData.length === 0 : true;
  });

  hasAnalysisWarnings: Signal<boolean> = computed(() => {
    const accountStatusCheck = this.accountStatusCheck();
    if (!accountStatusCheck) return false;
    const energyAnalysisStatusCheck = accountStatusCheck.energyAnalysisStatusCheck;
    const waterAnalysisStatusCheck = accountStatusCheck.waterAnalysisStatusCheck;
    return (energyAnalysisStatusCheck && energyAnalysisStatusCheck.status != 'good') || (waterAnalysisStatusCheck && waterAnalysisStatusCheck.status != 'good');
  });

  hideTabText: boolean = false;
  hideAllText: boolean = false;
  constructor() { }


  ngAfterViewInit() {
    this.setHideTabText();
    this.cd.detectChanges();
  }

  setHideTabText() {
    this.hideTabText = this.navTabs.nativeElement.offsetWidth < 750;
    this.hideAllText = this.navTabs.nativeElement.offsetWidth < 550;
  }


  @HostListener('window:resize', ['$event'])
  onResize() {
    this.setHideTabText();
  }
}
