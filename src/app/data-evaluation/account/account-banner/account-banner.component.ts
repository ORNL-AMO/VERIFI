import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-account-banner',
  templateUrl: './account-banner.component.html',
  styleUrls: ['./account-banner.component.css'],
  standalone: false
})
export class AccountBannerComponent implements OnInit {

  @ViewChild('navTabs') navTabs: ElementRef;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  meterDataSub: Subscription;
  meterData: Array<IdbUtilityMeterData>;

  hideTabText: boolean = false;
  hideAllText: boolean = false;
  constructor(private accountDbService: AccountdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.selectedAccount = account;
    });

    this.meterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      this.meterData = val;
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.meterDataSub.unsubscribe();
  }
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
