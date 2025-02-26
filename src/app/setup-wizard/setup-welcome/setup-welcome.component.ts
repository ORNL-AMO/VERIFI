import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { BackupDataService, BackupFile } from 'src/app/shared/helper-services/backup-data.service';
import { firstValueFrom } from 'rxjs';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
    selector: 'app-setup-welcome',
    templateUrl: './setup-welcome.component.html',
    styleUrls: ['./setup-welcome.component.css'],
    standalone: false
})
export class SetupWelcomeComponent implements OnInit {

  backupFile: any;
  showTestDataModal: boolean = false;
  constructor(private loadingService: LoadingService, private accountDbService: AccountdbService,
    private backupDataService: BackupDataService,
    private importBackupModalService: ImportBackupModalService, private router: Router,
    private dbChangesService: DbChangesService) { }

  ngOnInit(): void {
  }

  loadTestData() {
    this.showTestDataModal = false;
    this.loadingService.setLoadingMessage('Loading Example Data..');
    this.loadingService.setLoadingStatus(true);
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
          let newAccount: IdbAccount = await this.backupDataService.importAccountBackupFile(tmpBackupFile);
          await this.dbChangesService.updateAccount(newAccount);
          await this.dbChangesService.selectAccount(newAccount, false);
          let allAccounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
          this.accountDbService.allAccounts.next(allAccounts);
          await this.dbChangesService.selectAccount(newAccount, false);
          this.loadingService.setLoadingStatus(false);
          this.router.navigateByUrl('/account');
        } catch (err) {
          console.log(err);
          this.loadingService.setLoadingMessage('Something has gone horribly wrong with the example data..');
        }
      };
    };
    request.send();
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = false;
    this.importBackupModalService.showModal.next(true);
  }

  goToAccountSetup() {
    this.router.navigateByUrl('setup-wizard/account-setup');
  }

  openLoadTestData() {
    this.showTestDataModal = true;
  }

  cancelTestData() {
    this.showTestDataModal = false;
  }
}
