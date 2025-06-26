import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-data-wizard-home',
  standalone: false,
  
  templateUrl: './data-wizard-home.component.html',
  styleUrl: './data-wizard-home.component.css'
})
export class DataWizardHomeComponent {

  account: IdbAccount;
  accountSub: Subscription;

  facilities: Array<IdbFacility>;
  facilitiesSub: Subscription;

  metersSub: Subscription;
  meters: Array<IdbUtilityMeter>;

  predictors: Array<IdbPredictor>;
  predictorsSub: Subscription;
  constructor(private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictorDbService
  ){

  }

  ngOnInit(){
    this.accountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.account = account;
    });
    this.facilitiesSub = this.facilityDbService.accountFacilities.subscribe(facilities => {
      this.facilities = facilities;
    });
    this.metersSub = this.utilityMeterDbService.accountMeters.subscribe(meters => {
      this.meters = meters;
    });
    this.predictorsSub = this.predictorDbService.accountPredictors.subscribe(predictors => {
      this.predictors = predictors;
    });
  }

  ngOnDestroy(){
    this.accountSub.unsubscribe();
    this.facilitiesSub.unsubscribe();
    this.metersSub.unsubscribe();
    this.predictorsSub.unsubscribe();
  }
}
