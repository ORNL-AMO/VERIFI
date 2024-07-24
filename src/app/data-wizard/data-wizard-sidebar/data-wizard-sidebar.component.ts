import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';
import { DataWizardService } from '../data-wizard.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';

@Component({
  selector: 'app-data-wizard-sidebar',
  templateUrl: './data-wizard-sidebar.component.html',
  styleUrl: './data-wizard-sidebar.component.css'
})
export class DataWizardSidebarComponent {

  account: IdbAccount;
  accountSub: Subscription;

  facilities: Array<IdbFacility>;
  facilitiesSub: Subscription;

  accountMeters: Array<IdbUtilityMeter>;
  accountMetersSub: Subscription;

  fileReferencesSub: Subscription;
  fileReferences: Array<FileReference>;
  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService,
    private dataWizardService: DataWizardService,
    private utilityMeterDbService: UtilityMeterdbService
  ) {
  }

  ngOnInit() {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.account = account;
    });
    this.facilitiesSub = this.facilityDbService.accountFacilities.subscribe(facilities => {
      this.facilities = facilities;
    });
    this.fileReferencesSub = this.dataWizardService.fileReferences.subscribe(fileReferences => {
      this.fileReferences = fileReferences;
    });
    this.accountMetersSub = this.utilityMeterDbService.accountMeters.subscribe(accountMeters => {
      this.accountMeters = accountMeters;
    });
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.facilitiesSub.unsubscribe();
    this.fileReferencesSub.unsubscribe();
  }
}
