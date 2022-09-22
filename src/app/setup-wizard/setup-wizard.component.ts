import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { ToastNotificationsService } from '../core-components/toast-notifications/toast-notifications.service';
import { DbChangesService } from '../indexedDB/db-changes.service';
import { SetupWizardService } from './setup-wizard.service';
import * as XLSX from 'xlsx';
import { FileReference, UploadDataService } from '../upload-data/upload-data.service';

@Component({
  selector: 'app-setup-wizard',
  templateUrl: './setup-wizard.component.html',
  styleUrls: ['./setup-wizard.component.css']
})
export class SetupWizardComponent implements OnInit {

  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  utilityMeters: Array<IdbUtilityMeter>;
  selectedAccountSub: Subscription;
  selectedFacilitySub: Subscription;
  utilityDataSub: Subscription;

  submitSub: Subscription;
  constructor(
    private accountdbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private router: Router,
    private loadingService: LoadingService,
    private setupWizardService: SetupWizardService,
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService,
    private uploadDataService: UploadDataService
  ) { }

  ngOnInit(): void {
    this.accountdbService.selectedAccount.next(undefined);
    this.setupWizardService.initializeData();
    this.submitSub = this.setupWizardService.submit.subscribe(val => {
      if (val) {
        this.submitData();
        this.setupWizardService.submit.next(false);
      }
    })
  }

  ngOnDestroy() {
    this.submitSub.unsubscribe();
  }

  async submitData() {
    this.loadingService.setLoadingMessage("Creating Account...");
    this.loadingService.setLoadingStatus(true);
    let account: IdbAccount = this.setupWizardService.account.getValue();
    account = await this.accountdbService.addWithObservable(account).toPromise();

    let workbook: XLSX.WorkBook = this.setupWizardService.facilityTemplateWorkbook.getValue();
    if (workbook) {
      this.loadingService.setLoadingMessage("Parsing Template Data...")
      let allAccounts: Array<IdbAccount> = await this.accountdbService.getAll().toPromise();
      this.accountdbService.allAccounts.next(allAccounts);
      await this.dbChangesService.selectAccount(account);
      let fileReference: FileReference = this.uploadDataService.getFileReference(undefined, workbook);
      this.uploadDataService.fileReferences = [fileReference];
      this.loadingService.setLoadingStatus(false);
      this.toastNotificationService.showToast("Account Created!", "Use the upload data wizard to finish uploading facility data!", 10000, false, "success", true);
      this.router.navigateByUrl('upload/data-setup/file-setup/' + fileReference.id + '/template-facilities');

    } else {
      let facilities: Array<IdbFacility> = this.setupWizardService.facilities.getValue();
      this.loadingService.setLoadingMessage("Creating Facilities...");
      let newFacility: IdbFacility;
      for (let i = 0; i < facilities.length; i++) {
        let facility: IdbFacility = facilities[i];
        facility.accountId = account.guid;
        facility = await this.facilityDbService.addWithObservable(facility).toPromise();
        if (i == 0) {
          newFacility = facility;
        }
      }
      this.loadingService.setLoadingMessage("Finishing up...");
      let allAccounts: Array<IdbAccount> = await this.accountdbService.getAll().toPromise();
      this.accountdbService.allAccounts.next(allAccounts);
      await this.dbChangesService.selectAccount(account);
      this.loadingService.setLoadingStatus(false);
      this.toastNotificationService.showToast("Account and Facilities Created!", "You can now add utility data to your facilities for analysis!", 10000, false, "success", true);
      this.router.navigateByUrl('facility/' + newFacility.id + '/utility');
    }



  }
}
