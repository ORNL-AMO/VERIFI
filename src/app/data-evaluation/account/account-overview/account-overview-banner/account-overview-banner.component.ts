import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-account-overview-banner',
  templateUrl: './account-overview-banner.component.html',
  styleUrls: ['./account-overview-banner.component.css'],
  standalone: false
})
export class AccountOverviewBannerComponent implements OnInit {

  @ViewChild('navTabs') navTabs: ElementRef;
  modalOpenSub: Subscription;
  modalOpen: boolean;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  showWater: boolean;


  hideTabText: boolean = false;
  hideAllText: boolean = false;
  constructor(private sharedDataService: SharedDataService, private accountDbService: AccountdbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
      this.setShowWater();
    });
  }

  ngAfterViewInit() {
    this.setHideTabText();
    this.cd.detectChanges();
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }

    setShowWater() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let waterMeter: IdbUtilityMeter = accountMeters.find(meter => { return meter.source == 'Water Intake' || meter.source == 'Water Discharge' });
    this.showWater = waterMeter != undefined;
  }

  createReport() {
    this.sharedDataService.openCreateReportModal.next(true);
  }

  
  setHideTabText() {
    this.hideTabText = this.navTabs.nativeElement.offsetWidth < 400;
    this.hideAllText = this.navTabs.nativeElement.offsetWidth < 300;
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.setHideTabText();
  }
}
