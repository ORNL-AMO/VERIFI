import { Component } from '@angular/core';
import { LoadingService } from '../loading/loading.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { BackupDataService, BackupFile } from 'src/app/shared/helper-services/backup-data.service';
import { Router } from '@angular/router';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ImportBackupModalService } from '../import-backup-modal/import-backup-modal.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { getNewIdbAccount, IdbAccount } from 'src/app/models/idbModels/account';
import * as _ from 'lodash';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
  standalone: false
})
export class HomePageComponent {
  backupFile: any;
  showTestDataModal: boolean = false;
  accounts: Array<IdbAccount>;
  currentPageNumber: number = 1;
  loadingSub: Subscription;
  constructor(private loadingService: LoadingService, private accountDbService: AccountdbService,
    private backupDataService: BackupDataService,
    private toastNotificationService: ToastNotificationsService,
    private importBackupModalService: ImportBackupModalService, private router: Router,
    private dbChangesService: DbChangesService) { }

  ngOnInit(): void {
    this.accounts = this.accountDbService.allAccounts.getValue().filter(account => {
      return !account.deleteAccount;
    });
    this.accounts = _.orderBy(this.accounts, (account: IdbAccount) => {
      return new Date(account.modifiedDate).getTime();
    }, 'desc');

    this.loadingSub = this.loadingService.navigationAfterLoading.subscribe((context) => {
      if (context == 'load-example-data') {
        this.navigateToAccount();
      }
    });
  }

  ngOnDestroy() {
    this.loadingSub.unsubscribe();
  }

  loadTestData() {
    this.showTestDataModal = false;
    this.loadingService.setContext('load-example-data');
    this.loadingService.setTitle('Loading Example Data');
    var request = new XMLHttpRequest();
    request.open('GET', 'assets/example-data/ExampleAccount.json', true);
    request.responseType = 'blob';
    request.onload = () => {
      var reader = new FileReader();
      reader.readAsText(request.response);
      reader.onloadend = async (e) => {
        try {
          let test = JSON.parse(JSON.stringify(reader.result));
          let tmpBackupFile: BackupFile = JSON.parse(test);
          let newAccount: IdbAccount = await this.backupDataService.importAccountBackupFile(tmpBackupFile, -1);
          await this.dbChangesService.updateAccount(newAccount);
          await this.dbChangesService.selectAccount(newAccount, false);
          // let allAccounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
          // this.accountDbService.allAccounts.next(allAccounts);
          // await this.dbChangesService.selectAccount(newAccount, false);
          this.loadingService.isLoadingComplete.next(true);
        } catch (err) {
          console.log(err);
          this.loadingService.clearLoadingMessages();
          this.loadingService.setContext(undefined);
          this.loadingService.setTitle('');
          this.loadingService.isLoadingComplete.next(true);
          this.toastNotificationService.showToast('Error loading Example', 'Something has gone horribly wrong with the example data', 15000, false, 'alert-danger');
        }
      };
    };
    request.send();
  }

  navigateToAccount() {
    this.router.navigateByUrl('/data-evaluation/account');
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = false;
    this.importBackupModalService.showModal.next(true);
  }

  async createNewAccount() {
    let account: IdbAccount = getNewIdbAccount();
    account = await firstValueFrom(this.accountDbService.addWithObservable(account));
    let allAccounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
    this.accountDbService.allAccounts.next(allAccounts);
    await this.dbChangesService.selectAccount(account, false);
    this.router.navigateByUrl('/data-management/' + account.guid);
  }

  openLoadTestData() {
    this.showTestDataModal = true;
  }

  cancelTestData() {
    this.showTestDataModal = false;
  }

  async goToAccountHome(account: IdbAccount) {
    await this.dbChangesService.selectAccount(account, false);
    this.router.navigateByUrl('/data-evaluation/account/home');
  }

  async goToDataWizard(account: IdbAccount) {
    await this.dbChangesService.selectAccount(account, false);
    this.router.navigateByUrl('/data-management/' + account.guid);
  }
}
