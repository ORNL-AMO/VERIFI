import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { Component, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { LoadingService } from '../loading/loading.service';
import { Router } from '@angular/router';
import { ImportBackupModalService } from '../import-backup-modal/import-backup-modal.service';
import { Subscription } from 'rxjs';
import { getNewIdbAccount, IdbAccount } from 'src/app/models/idbModels/account';
import * as _ from 'lodash';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { BackupImportCoordinator } from 'src/app/backup/backup-import-coordinator.service';

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
  constructor(private loadingService: LoadingService,
    private backupImportCoordinator: BackupImportCoordinator,
    private toastNotificationService: ToastNotificationsService,
    private importBackupModalService: ImportBackupModalService, private router: Router,
    private titleService: Title,
    private metaService: Meta,
  ) { }

  ngOnInit(): void {
    this.titleService.setTitle('VERIFI | Industrial Utility & Energy Analytics');
    this.metaService.updateTag({ name: 'description', content: 'VERIFI is a free tool for tracking and analyzing industrial utility consumption data at corporate and facility levels, enabling energy performance analysis and DOE Better Plants reporting.' });
    this.metaService.updateTag({ property: 'og:title', content: 'VERIFI | Industrial Utility & Energy Analytics' });
    this.metaService.updateTag({ property: 'og:url', content: 'https://verifi.ornl.gov/welcome' });
    this.setAccounts();

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
      reader.onloadend = async () => {
        try {
          const tmpBackupFile = this.backupImportCoordinator.prepareTextBackup(String(reader.result));
          const newAccount: IdbAccount = await this.backupImportCoordinator.importNewAccount(tmpBackupFile);
          this.setAccounts();
          this.goToAccountHome(newAccount);
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
    this.router.navigateByUrl('/data-evaluation/account/home');
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = false;
    this.importBackupModalService.showModal.next(true);
  }

  async createNewAccount() {
    const account = await this.applicationLifecycleService.createAccount(getNewIdbAccount());
    this.router.navigateByUrl('/data-management/' + account.guid);
  }

  openLoadTestData() {
    this.showTestDataModal = true;
  }

  cancelTestData() {
    this.showTestDataModal = false;
  }

  private setAccounts(): void {
    this.accounts = [...this.applicationLifecycleService.accountCatalog()].filter(account => {
      return !account.deleteAccount;
    });
    this.accounts = _.orderBy(this.accounts, (account: IdbAccount) => {
      return new Date(account.modifiedDate).getTime();
    }, 'desc');
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
