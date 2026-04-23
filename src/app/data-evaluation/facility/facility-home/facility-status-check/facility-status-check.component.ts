import { Component, effect, inject, Signal } from '@angular/core';
import { FacilityHomeService } from '../facility-home.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { toSignal } from '@angular/core/rxjs-interop';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { AnalysisSetupErrors } from 'src/app/models/validation';
import { AnalysisValidationService } from 'src/app/shared/validation/services/analysis-validation.service';

@Component({
  selector: 'app-facility-status-check',
  standalone: false,
  templateUrl: './facility-status-check.component.html',
  styleUrl: './facility-status-check.component.css',
})
export class FacilityStatusCheckComponent {

  private facilityHomeService: FacilityHomeService = inject(FacilityHomeService);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);
  private predictorDbService: PredictorDbService = inject(PredictorDbService);
  private predictorDataDbService: PredictorDataDbService = inject(PredictorDataDbService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private analysisValidationService: AnalysisValidationService = inject(AnalysisValidationService);


  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.facilityHomeService.facilityStatusCheck, { initialValue: undefined });
  private calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters, { initialValue: [] });
  private predictors: Signal<Array<IdbPredictor>> = toSignal(this.predictorDbService.facilityPredictors, { initialValue: [] });
  private predictorData: Signal<Array<IdbPredictorData>> = toSignal(this.predictorDataDbService.facilityPredictorData, { initialValue: [] });
  private facility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: undefined });
  private latestEnergyAnalysisItem: Signal<IdbAnalysisItem> = toSignal(this.facilityHomeService.latestEnergyAnalysisItem, { initialValue: undefined });
  private latestWaterAnalysisItem: Signal<IdbAnalysisItem> = toSignal(this.facilityHomeService.latestWaterAnalysisItem, { initialValue: undefined });
  private analysisSetupErrors: Signal<Array<AnalysisSetupErrors>> = toSignal(this.analysisValidationService.analysisSetupErrors, { initialValue: undefined });

  constructor() {
    effect(() => {
      const facility = this.facility();
      const calanderizedMeters = this.calanderizedMeters();
      const predictors = this.predictors();
      const predictorData = this.predictorData();
      const latestEnergyAnalysisItem = this.latestEnergyAnalysisItem();
      const latestWaterAnalysisItem = this.latestWaterAnalysisItem();
      const analysisSetupErrors = this.analysisSetupErrors();
      if (facility && calanderizedMeters && predictors && predictorData && (latestEnergyAnalysisItem || latestWaterAnalysisItem) && analysisSetupErrors) {
        const statusCheck = new FacilityStatusCheck(
          facility,
          calanderizedMeters,
          predictors,
          predictorData,
          latestEnergyAnalysisItem,
          latestWaterAnalysisItem,
          analysisSetupErrors
        );
        console.log(statusCheck);
        this.facilityHomeService.facilityStatusCheck.next(statusCheck);
      }
    });
  }


}
