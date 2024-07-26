import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { ToastNotificationsService } from '../core-components/toast-notifications/toast-notifications.service';
import { DbChangesService } from '../indexedDB/db-changes.service';
import { SetupWizardService } from './setup-wizard.service';
import * as XLSX from 'xlsx';
import { UploadDataService } from '../upload-data/upload-data.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { FileReference } from '../upload-data/upload-data-models';
import { IdbAccount } from '../models/idbModels/account';
import { IdbFacility } from '../models/idbModels/facility';

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
  templateError: boolean;
  constructor(
    private accountdbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private router: Router,
    private loadingService: LoadingService,
    private setupWizardService: SetupWizardService,
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService,
    private uploadDataService: UploadDataService,
    private analyticsService: AnalyticsService
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
    this.analyticsService.sendEvent('create_account');
    this.loadingService.setLoadingMessage("Creating Account...");
    this.loadingService.setLoadingStatus(true);
    let account: IdbAccount = this.setupWizardService.account.getValue();
    account = await firstValueFrom(this.accountdbService.addWithObservable(account));

    let workbook: XLSX.WorkBook = this.setupWizardService.facilityTemplateWorkbook.getValue();
    if (workbook) {
      this.loadingService.setLoadingMessage("Parsing Template Data...")
      let allAccounts: Array<IdbAccount> = await firstValueFrom(this.accountdbService.getAll());
      this.accountdbService.allAccounts.next(allAccounts);
      await this.dbChangesService.selectAccount(account, false);
      try {
        this.templateError = false;
        let fileReference: FileReference = this.uploadDataService.getFileReference(undefined, workbook, false);
        this.uploadDataService.fileReferences = [fileReference];
        this.loadingService.setLoadingStatus(false);
        this.toastNotificationService.showToast("Account Created!", "Use the upload data wizard to finish uploading facility data!", 10000, false, "alert-success", true);
        this.router.navigateByUrl('upload/data-setup/file-setup/' + fileReference.id + '/template-facilities');
      } catch (err) {
        this.templateError = true;
        this.loadingService.setLoadingStatus(false);
        this.toastNotificationService.showToast('An Error Occured!', "No facilities found in template. Facilities needed.", 10000, false, "alert-danger", false);
      }

    } else {
      let facilities: Array<IdbFacility> = this.setupWizardService.facilities.getValue();
      this.loadingService.setLoadingMessage("Creating Facilities...");
      let newFacility: IdbFacility;
      for (let i = 0; i < facilities.length; i++) {
        let facility: IdbFacility = facilities[i];
        facility.accountId = account.guid;
        facility = await firstValueFrom(this.facilityDbService.addWithObservable(facility));
        if (i == 0) {
          newFacility = facility;
        }
      }
      this.loadingService.setLoadingMessage("Finishing up...");
      let allAccounts: Array<IdbAccount> = await firstValueFrom(this.accountdbService.getAll());
      this.accountdbService.allAccounts.next(allAccounts);
      await this.dbChangesService.selectAccount(account, false);
      this.loadingService.setLoadingStatus(false);
      this.toastNotificationService.showToast("Account and Facilities Created!", "You can now add utility data to your facilities for analysis!", 10000, false, "alert-success", true);
      this.router.navigateByUrl('facility/' + newFacility.id + '/utility');
    }



  }
}
