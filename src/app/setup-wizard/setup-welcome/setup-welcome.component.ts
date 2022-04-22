import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount } from 'src/app/models/idb';
// import { ExampleAccount } from 'src/app/shared/example-data/Better_Plants_Partner_Backup_4-20-2021';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';

@Component({
  selector: 'app-setup-welcome',
  templateUrl: './setup-welcome.component.html',
  styleUrls: ['./setup-welcome.component.css']
})
export class SetupWelcomeComponent implements OnInit {

  constructor(private loadingService: LoadingService, private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService, private backupDataService: BackupDataService,
    private importBackupModalService: ImportBackupModalService, private router: Router) { }

  ngOnInit(): void {
  }

  async loadTestData() {
    // this.loadingService.setLoadingMessage('Loading Example Data..');
    // this.loadingService.setLoadingStatus(true);
    // let newAccount: IdbAccount = await this.backupDataService.importAccountBackup(ExampleAccount);
    // this.loadingService.setLoadingMessage("Finishing up...");
    // let allAccounts: Array<IdbAccount> = await this.accountDbService.getAll().toPromise();
    // this.accountDbService.allAccounts.next(allAccounts);
    // this.accountDbService.selectedAccount.next(newAccount);
    // this.loadingService.setLoadingStatus(false);
    // this.router.navigateByUrl('/account');
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = false;
    this.importBackupModalService.showModal.next(true);
  }


  addAccount(){
    this.router.navigateByUrl('setup-wizard/account-setup');
  }
}
