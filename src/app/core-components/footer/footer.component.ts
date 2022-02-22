import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';
import { environment } from 'src/environments/environment';
import { AccountdbService } from "../../indexedDB/account-db.service";
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { LoadingService } from '../loading/loading.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {

  version: string = environment.version;
  accountCount: number = 0;
  facilityCount: number = 0;
  facilityCountTotal: number = 0;


  allAccountsSub: Subscription;
  allFacilitiesSub: Subscription;
  accountFacilitiesSub: Subscription;
  selectedAccountSub: Subscription;
  lastBackupDate: Date;
  isDev: boolean;
  showFooter: boolean;
  constructor(
    private accountdbService: AccountdbService,
    private facilitydbService: FacilitydbService,
    private backupDataService: BackupDataService,
    private loadingService: LoadingService,
    private router: Router
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setShowFooter();
      }
    });
  }

  ngOnInit() {
    this.setShowFooter();
    this.isDev = !environment.production;
    this.allAccountsSub = this.accountdbService.allAccounts.subscribe(allAccounts => {
      this.accountCount = allAccounts.length;
    });

    this.allFacilitiesSub = this.facilitydbService.allFacilities.subscribe(allFacilities => {
      this.facilityCountTotal = allFacilities.length;
    });

    this.accountFacilitiesSub = this.facilitydbService.accountFacilities.subscribe(accountFacilities => {
      this.facilityCount = accountFacilities.length;
    });

    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(selectedAccount => {
      if (selectedAccount) {
        this.lastBackupDate = selectedAccount.lastBackup;
      }
    })
  }

  ngOnDestroy() {
    this.allAccountsSub.unsubscribe();
    this.allFacilitiesSub.unsubscribe();
    this.accountFacilitiesSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }

  async deleteDatabase() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Resetting Database, if this takes too long restart application..');
    this.accountdbService.deleteDatabase();
  }

  backupAccount() {
    this.backupDataService.backupAccount();
  }

  setShowFooter() {
    this.showFooter = !this.router.url.includes('setup-wizard');
  }
}
