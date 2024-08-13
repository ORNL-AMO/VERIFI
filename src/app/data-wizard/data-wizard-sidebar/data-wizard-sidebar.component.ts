import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import { DataWizardService } from '../data-wizard.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';

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

  accountPredictors: Array<IdbPredictor>;
  accountPredictorsSub: Subscription;
  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService,
    private dataWizardService: DataWizardService,
    private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictorDbService
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
    this.accountPredictorsSub = this.predictorDbService.accountPredictors.subscribe(accountPredictors => {
      this.accountPredictors = accountPredictors;
    })
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.facilitiesSub.unsubscribe();
    this.fileReferencesSub.unsubscribe();
    this.accountPredictorsSub.unsubscribe();
  }
}
