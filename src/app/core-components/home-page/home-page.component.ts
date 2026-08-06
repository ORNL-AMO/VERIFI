import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { Component, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { LoadingService } from '../loading/loading.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';
import { Router } from '@angular/router';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ImportBackupModalService } from '../import-backup-modal/import-backup-modal.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { getNewIdbAccount, IdbAccount } from 'src/app/models/idbModels/account';
import * as _ from 'lodash';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { BackupPreparationService } from 'src/app/shared/helper-services/backup-preparation.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
  standalone: false
})
export class HomePageComponent {
  private readonly applicationLifecycleService = inject(ApplicationLifecycleService);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  backupFile: any;
  showTestDataModal: boolean = false;
  accounts: Array<IdbAccount>;
  currentPageNumber: number = 1;
  loadingSub: Subscription;
  constructor(private loadingService: LoadingService, private accountDbService: AccountdbService,
    private backupDataService: BackupDataService,
    private backupPreparationService: BackupPreparationService,
    private toastNotificationService: ToastNotificationsService,
    private importBackupModalService: ImportBackupModalService, private router: Router,
    private dbChangesService: DbChangesService,
    private titleService: Title,
    private metaService: Meta) { }

  ngOnInit(): void {
    this.titleService.setTitle('VERIFI | Industrial Utility & Energy Analytics');
    this.metaService.updateTag({ name: 'description', content: 'VERIFI is a free tool for tracking and analyzing industrial utility consumption data at corporate and facility levels, enabling energy performance analysis and DOE Better Plants reporting.' });
    this.metaService.updateTag({ property: 'og:title', content: 'VERIFI | Industrial Utility & Energy Analytics' });
    this.metaService.updateTag({ property: 'og:url', content: 'https://verifi.ornl.gov/welcome' });
    this.accounts = [...this.applicationLifecycleService.accountCatalog()].filter(account => {
      return !account.deleteAccount;
    });
    this.accounts = _.orderBy(this.accounts, (account: IdbAccount) => {
      return new Date(account.modifiedDate).getTime();
    }, 'desc');

    this.loadingSub = this.loadingService.navigationAfterLoading.subscribe((context) => {
      if (context == 'load-example-data') {
        this.navigateToAccount();
        this.loadingService.navigationAfterLoading.next(undefined);
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
          let tmpBackupFile = this.backupPreparationService.prepare(JSON.parse(test));
          this.backupDataService.accountBackupMessages();
          let newAccount: IdbAccount = await this.backupDataService.importAccountBackupFile(tmpBackupFile, -1);
          await this.dbChangesService.updateAccount(newAccount);
          await this.accountWorkspaceService.selectAccount(newAccount.guid);
          // let allAccounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
          // this.accountDbService.allAccounts.next(allAccounts);
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
    await this.applicationLifecycleService.refreshAccountCatalog();
    await this.accountWorkspaceService.selectAccount(account.guid);
    this.router.navigateByUrl('/data-management/' + account.guid);
  }

  openLoadTestData() {
    this.showTestDataModal = true;
  }

  cancelTestData() {
    this.showTestDataModal = false;
  }

  async goToAccountHome(account: IdbAccount) {
    this.loadingService.setLoadingMessage('Loading Account...');
    this.loadingService.setLoadingStatus(true);
    await this.accountWorkspaceService.selectAccount(account.guid);
    this.loadingService.setLoadingStatus(false);
    this.router.navigateByUrl('/data-evaluation/account/home');
  }

  async goToDataWizard(account: IdbAccount) {
    this.loadingService.setLoadingMessage('Loading Account...');
    this.loadingService.setLoadingStatus(true);
    await this.accountWorkspaceService.selectAccount(account.guid);
    this.loadingService.setLoadingStatus(false);
    this.router.navigateByUrl('/data-management/' + account.guid);
  }
}
